import { describe, expect, it } from 'vitest';
import { kuhnExploitability, kuhnValue, solveKuhn } from '../../src/engine/cfr/kuhn';
import { PAIR_WEIGHTS, solvePushFold } from '../../src/engine/pushFold';
import { loadEquity169, EQUITY169_META } from '../../src/generated/equity169';
import { classByName } from '../../src/engine/ranges';
import { handVsHand } from '../../src/engine/equity';

describe('Kuhn poker CFR', () => {
  it('converges to the game value of -1/18', () => {
    const r = solveKuhn(20_000);
    expect(r.final.exploitability).toBeLessThan(0.005);
    expect(r.final.value).toBeCloseTo(-1 / 18, 2);
  });
  it('exploitability falls as iterations grow', () => {
    const r = solveKuhn(5000);
    const first = r.snapshots[2].exploitability, last = r.final.exploitability;
    expect(last).toBeLessThan(first / 10);
    expect(r.snapshots.every((s) => s.exploitability >= -1e-9)).toBe(true);
  });
  it('finds the known equilibrium structure', () => {
    const s = solveKuhn(50_000, true).final.strategy;
    // Player 1: never bets the queen first, bets the king three times as often as the jack.
    expect(s.Q).toBeLessThan(0.03);
    expect(s.J).toBeLessThan(0.36);
    expect(s.K / Math.max(s.J, 1e-6)).toBeGreaterThan(2.6);
    expect(s.K / Math.max(s.J, 1e-6)).toBeLessThan(3.4);
    // Player 2: always calls with the king, never with the jack, calls the queen one third.
    expect(s.Kb).toBeGreaterThan(0.99);
    expect(s.Jb).toBeLessThan(0.01);
    expect(s.Qb).toBeCloseTo(1 / 3, 1);
    // Player 2 bluffs the jack one third after a check and always bets the king.
    expect(s.Jp).toBeCloseTo(1 / 3, 1);
    expect(s.Kp).toBeGreaterThan(0.99);
  });
  it('CFR+ converges faster than vanilla CFR', () => {
    expect(solveKuhn(2000, true).final.exploitability).toBeLessThan(solveKuhn(2000).final.exploitability);
  });
  it('a hand-built equilibrium is unexploitable', () => {
    const a = 1 / 3;
    const eq = { J: a, Q: 0, K: 3 * a, Jpb: 0, Qpb: a + 1 / 3, Kpb: 1, Jp: 1 / 3, Qp: 0, Kp: 1, Jb: 0, Qb: 1 / 3, Kb: 1 };
    expect(kuhnValue(eq, eq)).toBeCloseTo(-1 / 18, 10);
    expect(kuhnExploitability(eq).exploitability).toBeCloseTo(0, 10);
  });
});

describe('push/fold solver', () => {
  const E = loadEquity169();
  const idx = (n: string) => classByName(n)!.index;

  it('equity table is consistent with exact enumeration', () => {
    expect(E.length).toBe(169 * 169);
    expect(EQUITY169_META.trialsPerPair).toBeGreaterThan(10_000);
    const aa = idx('AA'), kk = idx('KK');
    expect(E[aa * 169 + kk] + E[kk * 169 + aa]).toBeCloseTo(1, 3);
    // Class against class averages over suit layouts, so compare against one exact layout loosely.
    expect(Math.abs(E[aa * 169 + kk] - handVsHand(['AsAh', 'KsKh']).players[0].equity)).toBeLessThan(0.015);
    expect(Math.abs(E[idx('AKo') * 169 + idx('22')] - 0.47)).toBeLessThan(0.02);
  });
  it('card removal weights are right', () => {
    expect(PAIR_WEIGHTS[idx('AA') * 169 + idx('KK')]).toBe(36);
    expect(PAIR_WEIGHTS[idx('AA') * 169 + idx('AA')]).toBe(6); // each AA combo leaves exactly one other
    expect(PAIR_WEIGHTS[idx('AKs') * 169 + idx('AKs')]).toBe(12);
    expect(PAIR_WEIGHTS[idx('AKo') * 169 + idx('AA')]).toBe(36);
  });
  it('converges with small exploitability', () => {
    const r = solvePushFold(E, { stack: 10, iterations: 3000 });
    expect(r.exploitability).toBeLessThan(0.01);
    expect(r.history[r.history.length - 1].exploitability).toBeLessThan(r.history[3].exploitability);
  });
  it('gives sensible ranges at 10bb', () => {
    const r = solvePushFold(E, { stack: 10, iterations: 3000 });
    expect(r.jamFraction).toBeGreaterThan(0.5);
    expect(r.jamFraction).toBeLessThan(0.68);
    expect(r.callFraction).toBeGreaterThan(0.3);
    expect(r.callFraction).toBeLessThan(0.45);
    expect(r.jam[idx('AA')]).toBeGreaterThan(0.99);
    expect(r.call[idx('AA')]).toBeGreaterThan(0.99);
    expect(r.call[idx('72o')]).toBeLessThan(0.01);
    expect(r.jam[idx('32o')]).toBeLessThan(0.05);
  });
  it('ranges widen as stacks shrink and with antes', () => {
    const deep = solvePushFold(E, { stack: 20, iterations: 1500 });
    const mid = solvePushFold(E, { stack: 10, iterations: 1500 });
    const short = solvePushFold(E, { stack: 4, iterations: 1500 });
    expect(deep.jamFraction).toBeLessThan(mid.jamFraction);
    expect(mid.jamFraction).toBeLessThan(short.jamFraction);
    expect(deep.callFraction).toBeLessThan(short.callFraction);
    const ante = solvePushFold(E, { stack: 10, ante: 0.125, iterations: 1500 });
    expect(ante.jamFraction).toBeGreaterThan(mid.jamFraction);
    expect(solvePushFold(E, { stack: 1.5, iterations: 500 }).jamFraction).toBeGreaterThan(0.95);
  });
  it('is stable across iteration counts', () => {
    const a = solvePushFold(E, { stack: 12, iterations: 2000 });
    const b = solvePushFold(E, { stack: 12, iterations: 4000 });
    expect(Math.abs(a.jamFraction - b.jamFraction)).toBeLessThan(0.01);
    expect(Math.abs(a.sbValue - b.sbValue)).toBeLessThan(0.005);
  });
});
