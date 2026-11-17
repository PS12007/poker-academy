import { describe, expect, it } from 'vitest';
import { callDecision, finishProbabilities, icmEquity } from '../../src/engine/icm';

describe('ICM', () => {
  it('three players, worked by hand', () => {
    // Stacks 50, 30, 20 (total 100). Payouts 50, 30, 20.
    // P(A first) = 0.5. P(A second) = P(B first) * 50/70 + P(C first) * 50/80 = 0.3*5/7 + 0.2*5/8 = 0.214286 + 0.125.
    const p = finishProbabilities([50, 30, 20]);
    expect(p[0][0]).toBeCloseTo(0.5, 12);
    expect(p[0][1]).toBeCloseTo(0.3 * (50 / 70) + 0.2 * (50 / 80), 12);
    expect(p[0][2]).toBeCloseTo(1 - p[0][0] - p[0][1], 12);
    for (let place = 0; place < 3; place++) expect(p[0][place] + p[1][place] + p[2][place]).toBeCloseTo(1, 12);
    const e = icmEquity([50, 30, 20], [50, 30, 20]);
    expect(e[0]).toBeCloseTo(50 * 0.5 + 30 * p[0][1] + 20 * p[0][2], 10);
    expect(e[0] + e[1] + e[2]).toBeCloseTo(100, 10);
  });
  it('known textbook-style value: 5000/3000/2000 for 50/30/20', () => {
    const e = icmEquity([5000, 3000, 2000], [50, 30, 20]);
    // A: 0.5*50 + 0.339286*30 + 0.160714*20 = 38.393
    expect(e[0]).toBeCloseTo(38.3929, 3);
    // B: 0.3*50 + (0.5*0.6 + 0.2*0.375)*30 + 0.325*20 = 32.75
    expect(e[1]).toBeCloseTo(32.75, 10);
    expect(e[2]).toBeCloseTo(100 - e[0] - e[1], 10);
  });
  it('winner-take-all is chip equity', () => {
    const e = icmEquity([60, 25, 15], [100]);
    expect(e).toEqual([60, 25, 15].map((x) => expect.closeTo(x, 10)));
  });
  it('equal stacks split equally and busted players get nothing', () => {
    const e = icmEquity([10, 10, 10, 10], [50, 30, 20]);
    for (const x of e) expect(x).toBeCloseTo(25, 10);
    const b = icmEquity([40, 0, 60], [70, 30]);
    expect(b[1]).toBe(0);
    expect(b[0] + b[2]).toBeCloseTo(100, 10);
  });
  it('chips lose value as a stack grows', () => {
    const small = icmEquity([10, 45, 45], [50, 30, 20])[0] / 10;
    const big = icmEquity([80, 10, 10], [50, 30, 20])[0] / 80;
    expect(small).toBeGreaterThan(big);
  });
  it('bubble: calling needs more than chip pot odds', () => {
    // Four left, three paid. Big stack shoves on a medium stack.
    const d = callDecision({ stacks: [5000, 3000, 1500, 500], payouts: [50, 30, 20], shover: 0, caller: 1 });
    expect(d.chipRequired).toBeCloseTo(0.5, 10);
    expect(d.requiredEquity).toBeGreaterThan(0.55);
    expect(d.bubbleFactor).toBeGreaterThan(1.2);
    // Check the algebra: calling at exactly the required equity equals folding.
    const q = d.requiredEquity;
    expect(q * d.winEquity + (1 - q) * d.loseEquity).toBeCloseTo(d.foldEquity, 10);
  });
  it('no ICM pressure when winner takes all', () => {
    const d = callDecision({ stacks: [5000, 3000, 2000], payouts: [100], shover: 0, caller: 1, dead: 300 });
    expect(d.requiredEquity).toBeCloseTo(d.chipRequired, 10);
    // Without ICM, cost / gain is just risk / (risk + dead): 3000 / 3300.
    expect(d.bubbleFactor).toBeCloseTo(3000 / 3300, 10);
    expect(callDecision({ stacks: [5000, 3000, 2000], payouts: [100], shover: 0, caller: 1 }).bubbleFactor).toBeCloseTo(1, 10);
    expect(() => icmEquity(new Array(13).fill(1), [1])).toThrow();
  });
});
