import { describe, expect, it } from 'vitest';
import { parseCards, cardsToString } from '../../src/engine/cards';
import { boardTexture, findNuts } from '../../src/engine/board';
import { BEGINNER_EARLY, BEGINNER_LATE, openRange, OPEN_RANGE_TEXT, VS_OPEN } from '../../src/engine/teachingRanges';
import { countCombos, parseRange, rangeFraction } from '../../src/engine/ranges';
import { bankrollForRisk, riskOfRuin, simulateVariance } from '../../src/engine/variance';
import { grade, isDue, newCard } from '../../src/lib/srs';

describe('board', () => {
  it('finds the nuts', () => {
    expect(findNuts(parseCards('Ks7d2c')).name).toBe('Three of a kind, kings');
    expect(findNuts(parseCards('Ks7d2c')).holdings.length).toBe(3);
    expect(findNuts(parseCards('JsTs9d')).name).toBe('Straight, king high');
    expect(findNuts(parseCards('JsTs9s')).name).toBe('Straight flush, king high');
    expect(findNuts(parseCards('AhKh5h')).name).toBe('Flush, ace high');
    expect(findNuts(parseCards('8s8d3c')).name).toBe('Four of a kind, eights');
    expect(findNuts(parseCards('AsKsQsJsTs')).holdings.length).toBe(1081);
    const n = findNuts(parseCards('AhKh5h2c9d'));
    expect(n.holdings.every((h) => (h[0] & 3) === 2 && (h[1] & 3) === 2)).toBe(true);
    expect(n.holdings.every((h) => cardsToString(h).includes('Qh'))).toBe(true);
  });
  it('reads texture', () => {
    const dry = boardTexture(parseCards('Ks7d2c'));
    expect(dry.suitLabel).toBe('rainbow');
    expect(dry.paired).toBe(false);
    expect(dry.straightCombos).toBe(0);
    expect(dry.flushDrawCombos).toBe(0);
    const wet = boardTexture(parseCards('JsTs9d'));
    expect(wet.suitLabel).toBe('two-tone');
    expect(wet.straightCombos).toBeGreaterThan(0);
    expect(wet.flushDrawCombos).toBe(52); // C(11,2) = 55 two-spade holdings, minus KsQs, Qs8s and 8s7s which are already straights
    expect(wet.openEndedCombos).toBeGreaterThan(50);
    expect(wet.wetness).toBeGreaterThan(dry.wetness);
    expect(boardTexture(parseCards('8s8d3c')).paired).toBe(true);
    expect(boardTexture(parseCards('8s8d8c')).trips).toBe(true);
    expect(boardTexture(parseCards('Ah9h4h')).suitLabel).toBe('monotone');
    expect(boardTexture(parseCards('Ah9h4h')).flushCombos).toBe(45);
    expect(boardTexture(parseCards('Ah9h4h2h')).suitLabel).toBe('four-flush');
    expect(boardTexture(parseCards('Ah9h4h2h3h')).suitLabel).toBe('five-flush');
    expect(() => boardTexture([])).toThrow();
  });
});

describe('teaching ranges', () => {
  it('widen with position and nest', () => {
    const fr = (['UTG', 'HJ', 'CO', 'BTN'] as const).map((p) => rangeFraction(openRange(p)));
    expect(fr[0]).toBeLessThan(fr[1]);
    expect(fr[1]).toBeLessThan(fr[2]);
    expect(fr[2]).toBeLessThan(fr[3]);
    expect(fr[0]).toBeGreaterThan(0.1);
    expect(fr[0]).toBeLessThan(0.17);
    expect(fr[3]).toBeGreaterThan(0.38);
    expect(fr[3]).toBeLessThan(0.5);
    const utg = openRange('UTG'), btn = openRange('BTN');
    for (let i = 0; i < 169; i++) if (utg[i] > 0) expect(btn[i]).toBeGreaterThan(0);
    expect(rangeFraction(openRange('SB'))).toBeGreaterThan(fr[2]);
    expect(Object.keys(OPEN_RANGE_TEXT).length).toBe(5);
  });
  it('responses parse and do not overlap', () => {
    for (const f of Object.values(VS_OPEN)) {
      const v = parseRange(f.value), b = parseRange(f.bluff), c = parseRange(f.call);
      for (let i = 0; i < 169; i++) expect((v[i] > 0 ? 1 : 0) + (b[i] > 0 ? 1 : 0) + (c[i] > 0 ? 1 : 0)).toBeLessThanOrEqual(1);
      expect(countCombos(b)).toBeLessThanOrEqual(countCombos(v) * 2.2);
    }
    expect(countCombos(parseRange(BEGINNER_EARLY))).toBeLessThan(countCombos(parseRange(BEGINNER_LATE)));
  });
});

describe('variance', () => {
  it('risk of ruin formula', () => {
    expect(riskOfRuin(5, 90, 2000)).toBeCloseTo(Math.exp(-20000 / 8100), 10);
    expect(riskOfRuin(0, 90, 2000)).toBe(1);
    expect(riskOfRuin(-2, 90, 2000)).toBe(1);
    const b = bankrollForRisk(5, 90, 0.05);
    expect(riskOfRuin(5, 90, b)).toBeCloseTo(0.05, 10);
    expect(bankrollForRisk(0, 90, 0.05)).toBe(Infinity);
  });
  it('simulation matches theory', () => {
    const r = simulateVariance({ winrate: 5, stdDev: 90, hands: 100_000, paths: 4000, bankroll: 1500, seed: 11 });
    expect(r.expected).toBe(5000);
    expect(r.finalStdDev).toBeCloseTo(90 * Math.sqrt(1000), 6);
    const mean = r.finals.reduce((a, b) => a + b, 0) / r.finals.length;
    expect(Math.abs(mean - 5000)).toBeLessThan(4 * (r.finalStdDev / Math.sqrt(4000)));
    // P(loss) should be near Phi(-mean/sd) = Phi(-1.757) = 0.0395.
    expect(Math.abs(r.probLoss - 0.0395)).toBeLessThan(0.012);
    // Finite-horizon ruin is below the infinite-horizon formula but in its neighbourhood.
    expect(r.riskOfRuinSim).toBeLessThanOrEqual(r.riskOfRuinFormula + 0.02);
    expect(r.riskOfRuinSim).toBeGreaterThan(r.riskOfRuinFormula * 0.5);
    expect(r.bands.p5[r.bands.p5.length - 1]).toBeLessThan(r.bands.p95[r.bands.p95.length - 1]);
    expect(r.samplePaths.length).toBe(24);
    expect(r.x[r.x.length - 1]).toBe(100_000);
    expect(r.drawdown.p95).toBeGreaterThan(r.drawdown.median);
    expect(r.breakeven.p95).toBeGreaterThan(r.breakeven.median);
  });
  it('is reproducible', () => {
    const a = simulateVariance({ winrate: 3, stdDev: 80, hands: 20_000, paths: 200, bankroll: 1000, seed: 5 });
    const b = simulateVariance({ winrate: 3, stdDev: 80, hands: 20_000, paths: 200, bankroll: 1000, seed: 5 });
    expect(a.finals).toEqual(b.finals);
  });
});

describe('spaced repetition', () => {
  it('follows SM-2 intervals', () => {
    const t = 1_000_000;
    let c = newCard(t);
    expect(isDue(c, t)).toBe(true);
    c = grade(c, 4, t);
    expect(c.interval).toBe(1);
    c = grade(c, 4, t);
    expect(c.interval).toBe(6);
    c = grade(c, 4, t);
    expect(c.interval).toBe(Math.round(6 * c.ease));
    expect(isDue(c, t)).toBe(false);
    const failed = grade(c, 1, t);
    expect(failed.reps).toBe(0);
    expect(failed.interval).toBe(1);
    expect(failed.lapses).toBe(1);
    expect(failed.ease).toBeLessThan(c.ease);
    let hard = newCard(t);
    for (let i = 0; i < 20; i++) hard = grade(hard, 0, t);
    expect(hard.ease).toBe(1.3);
  });
});
