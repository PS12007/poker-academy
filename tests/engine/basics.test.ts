import { describe, expect, it } from 'vitest';
import { canonicalKey, cardsToString, parseCards, tryParseCards, remainingDeck } from '../../src/engine/cards';
import { Rng } from '../../src/engine/rng';
import { bestOmaha, evaluateOmaha } from '../../src/engine/omaha';
import { evaluate, categoryOf, Category } from '../../src/engine/evalCore';
import {
  fiveCardCategoryCounts, FIVE_CARD_COUNTS, holdemStartingHandFacts, hypergeom, nCr, oddsAgainst,
  omahaStartingHandCounts, outsOdds, probFlopFlush, probFlopSetOrBetter, probFlushByRiver, probHitOuts, runnerRunner,
  probFlopPairOrBetterUnpaired,
} from '../../src/engine/combinatorics';

describe('cards', () => {
  it('round-trips', () => {
    expect(cardsToString(parseCards('As Kd, 2c'))).toBe('AsKd2c');
    expect(parseCards('ah')[0]).toBe(parseCards('Ah')[0]);
  });
  it('rejects bad input', () => {
    expect(tryParseCards('AsA')).toBeNull();
    expect(tryParseCards('1s')).toBeNull();
    expect(tryParseCards('AsAs')).toBeNull();
    expect(remainingDeck(parseCards('AsKd')).length).toBe(50);
  });
  it('canonical key identifies suit-isomorphic holdings', () => {
    expect(canonicalKey(parseCards('AsKs'))).toBe(canonicalKey(parseCards('AhKh')));
    expect(canonicalKey(parseCards('AsKh'))).not.toBe(canonicalKey(parseCards('AhKh')));
  });
});

describe('rng', () => {
  it('is reproducible and roughly uniform', () => {
    const a = new Rng(42), b = new Rng(42), c = new Rng(43);
    const xs = Array.from({ length: 5 }, () => a.u32());
    expect(Array.from({ length: 5 }, () => b.u32())).toEqual(xs);
    expect(Array.from({ length: 5 }, () => c.u32())).not.toEqual(xs);
    const buckets = new Array<number>(10).fill(0);
    for (let i = 0; i < 100_000; i++) buckets[a.int(10)]++;
    for (const n of buckets) expect(Math.abs(n - 10_000)).toBeLessThan(500);
    let sum = 0, sq = 0;
    for (let i = 0; i < 100_000; i++) { const z = a.normal(); sum += z; sq += z * z; }
    expect(Math.abs(sum / 100_000)).toBeLessThan(0.02);
    expect(Math.abs(sq / 100_000 - 1)).toBeLessThan(0.03);
    expect(a.float()).toBeLessThan(1);
    expect([1, 2, 3]).toContain(a.pick([1, 2, 3]));
  });
});

describe('omaha', () => {
  const om = (h: string, b: string) => evaluateOmaha(parseCards(h), parseCards(b));
  it('a four-flush board gives no flush without two suited hole cards', () => {
    expect(categoryOf(om('AsKdQdJc', '2s5s8s9sTh'))).not.toBe(Category.Flush);
    expect(categoryOf(om('As3sQdJc', '2s5s8s9cTh'))).toBe(Category.Flush);
  });
  it('quads on board do not play', () => {
    // Board 7777K. In Hold'em everyone has quads. In Omaha you use three board cards.
    expect(categoryOf(om('AsAd2c3c', '7s7d7h7cKs'))).toBe(Category.FullHouse);
    expect(categoryOf(om('AsQd2c3h', '7s7d7h7cKs'))).toBe(Category.Trips);
    expect(categoryOf(evaluate(parseCards('AsQd7s7d7h7cKs')))).toBe(Category.Quads);
  });
  it('one hole card cannot make a straight with four board cards', () => {
    expect(categoryOf(om('9sAd2c2h', '5s6d7h8cKs'))).toBe(Category.Pair);
    expect(categoryOf(om('4s3d2cKh', '5s6d7h8cKs'))).toBe(Category.Straight);
  });
  it('reports which cards play', () => {
    const b = bestOmaha(parseCards('AsKsQdJd'), parseCards('Ts9s2s3h4h'));
    expect(categoryOf(b.rank)).toBe(Category.Flush);
    expect(cardsToString(b.hole.sort((x, y) => y - x))).toBe('AsKs');
  });
  it('works for PLO5', () => {
    expect(categoryOf(om('AsKsQdJd2c', 'Ts9s2s3h4h'))).toBe(Category.Flush);
  });
  it('throws on too few cards', () => {
    expect(() => evaluateOmaha([0], [1, 2, 3])).toThrow();
  });
});

describe('combinatorics', () => {
  it('nCr', () => {
    expect(nCr(52, 5)).toBe(2_598_960);
    expect(nCr(52, 7)).toBe(133_784_560);
    expect(nCr(48, 5)).toBe(1_712_304);
    expect(nCr(52, 2)).toBe(1326);
    expect(nCr(5, 6)).toBe(0);
  });
  it('outs', () => {
    expect(probHitOuts(9, 47, 2)).toBeCloseTo(0.3497, 4);
    const o = outsOdds(15);
    expect(o.byRiverFromFlop).toBeCloseTo(0.5412, 4);
    expect(o.rule4).toBeCloseTo(0.6);
    expect(o.rule4Corrected).toBeCloseTo(0.53);
    expect(outsOdds(4).rule4Corrected).toBeCloseTo(0.16);
    expect(o.nextCardFromFlop).toBeCloseTo(15 / 47);
    expect(runnerRunner(10, 9)).toBeCloseTo(0.0416, 4);
    expect(oddsAgainst(0.2)).toBeCloseTo(4);
  });
  it('starting hand facts', () => {
    const f = holdemStartingHandFacts();
    expect(f.totalCombos).toBe(1326);
    expect(f.distinctHands).toBe(169);
    expect(f.pPair).toBeCloseTo(1 / 17, 10);
    expect(f.pAces).toBeCloseTo(1 / 221, 10);
    expect(f.pSuited).toBeCloseTo(4 / 17, 10);
  });
  it('flop and river probabilities', () => {
    expect(probFlopSetOrBetter()).toBeCloseTo(0.1176, 4);
    expect(probFlopFlush()).toBeCloseTo(0.00842, 5);
    expect(probFlushByRiver()).toBeCloseTo(0.064, 3);
    expect(probFlopPairOrBetterUnpaired()).toBeCloseTo(0.3243, 4);
    expect(hypergeom(50, 11, 3, 3)).toBeCloseTo(165 / 19600, 10);
  });
  it('five-card counts by enumeration', () => {
    expect(fiveCardCategoryCounts()).toEqual([...FIVE_CARD_COUNTS]);
  });
  it('omaha starting hands: 270,725 raw, 16,432 distinct', () => {
    const c = omahaStartingHandCounts();
    expect(c.total).toBe(270_725);
    expect(c.distinct).toBe(16_432);
  });
});
