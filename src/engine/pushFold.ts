import { HAND_CLASSES, NUM_CLASSES } from './ranges';

/**
 * Heads-up push or fold. The small blind either moves all-in or folds. The big
 * blind either calls or folds. Solved by fictitious play over the 169 hand classes.
 */
export interface PushFoldInput {
  /** Effective stack in big blinds, before blinds and antes are posted. */
  stack: number;
  /** Ante per player in big blinds. */
  ante?: number;
  iterations?: number;
}

export interface PushFoldResult {
  /** Probability the small blind jams each hand class. */
  jam: Float32Array;
  /** Probability the big blind calls a jam with each hand class. */
  call: Float32Array;
  /** Fraction of all hands jammed and called, weighted by combos. */
  jamFraction: number;
  callFraction: number;
  /** Small blind's EV per hand in big blinds at the solution. */
  sbValue: number;
  /** Sum of both players' gains from a best response, in bb per hand. Zero at equilibrium. */
  exploitability: number;
  /** Exploitability after selected iterations, for the convergence chart. */
  history: { iteration: number; exploitability: number }[];
  iterations: number;
}

/**
 * Number of non-conflicting (combo of a, combo of b) pairs for every pair of
 * classes. This is the card-removal weight: holding AK leaves fewer AA combos.
 */
export const PAIR_WEIGHTS: Float32Array = (() => {
  const w = new Float32Array(NUM_CLASSES * NUM_CLASSES);
  for (let a = 0; a < NUM_CLASSES; a++) {
    for (let b = a; b < NUM_CLASSES; b++) {
      let n = 0;
      for (const [a1, a2] of HAND_CLASSES[a].combos)
        for (const [b1, b2] of HAND_CLASSES[b].combos) if (a1 !== b1 && a1 !== b2 && a2 !== b1 && a2 !== b2) n++;
      w[a * NUM_CLASSES + b] = n;
      w[b * NUM_CLASSES + a] = n;
    }
  }
  return w;
})();

/**
 * @param equity 169 x 169 matrix, equity[a * 169 + b] = all-in equity of class a against class b.
 */
export function solvePushFold(equity: Float32Array | readonly number[], input: PushFoldInput): PushFoldResult {
  const N = NUM_CLASSES;
  const S = input.stack;
  const ante = input.ante ?? 0;
  const iterations = input.iterations ?? 2000;
  const W = PAIR_WEIGHTS;
  const foldSB = -(0.5 + ante);
  const foldBB = -(1 + ante);
  const stealWin = 1 + ante;
  const pot = 2 * S;

  const jam = new Float32Array(N).fill(0.5);
  const call = new Float32Array(N).fill(0.5);
  const evJam = new Float64Array(N);
  const evCall = new Float64Array(N);
  const rowTotal = new Float64Array(N);
  for (let a = 0; a < N; a++) {
    let t = 0;
    for (let b = 0; b < N; b++) t += W[a * N + b];
    rowTotal[a] = t;
  }

  /** EV of jamming each SB hand against the given calling strategy. */
  const computeJamEV = (c: Float32Array) => {
    for (let a = 0; a < N; a++) {
      let ev = 0;
      for (let b = 0; b < N; b++) {
        const w = W[a * N + b];
        if (w === 0) continue;
        ev += w * ((1 - c[b]) * stealWin + c[b] * (equity[a * N + b] * pot - S));
      }
      evJam[a] = ev / rowTotal[a];
    }
  };
  /** EV of calling with each BB hand against the given jamming strategy. */
  const computeCallEV = (j: Float32Array) => {
    for (let b = 0; b < N; b++) {
      let ev = 0, tot = 0;
      for (let a = 0; a < N; a++) {
        const w = W[b * N + a] * j[a];
        if (w === 0) continue;
        ev += w * (equity[b * N + a] * pot - S);
        tot += w;
      }
      evCall[b] = tot > 0 ? ev / tot : foldBB;
    }
  };

  /** Total EV for the SB of profile (j, c), averaged over all deals. */
  const sbValueOf = (j: Float32Array, c: Float32Array): number => {
    let v = 0, tot = 0;
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        const w = W[a * N + b];
        if (w === 0) continue;
        const jamEV = (1 - c[b]) * stealWin + c[b] * (equity[a * N + b] * pot - S);
        v += w * (j[a] * jamEV + (1 - j[a]) * foldSB);
        tot += w;
      }
    }
    return v / tot;
  };

  const exploit = (): number => {
    const brJ = new Float32Array(N), brC = new Float32Array(N);
    computeJamEV(call);
    for (let a = 0; a < N; a++) brJ[a] = evJam[a] > foldSB ? 1 : 0;
    computeCallEV(jam);
    for (let b = 0; b < N; b++) brC[b] = evCall[b] > foldBB ? 1 : 0;
    const v = sbValueOf(jam, call);
    // The pot is zero-sum around the blinds and antes, so the BB's value is -v.
    return sbValueOf(brJ, call) - v + (v - sbValueOf(jam, brC));
  };

  const history: { iteration: number; exploitability: number }[] = [];
  const marks = new Set<number>();
  for (let i = 0; i < 40; i++) marks.add(Math.max(1, Math.round(Math.pow(iterations, (i + 1) / 40))));

  for (let t = 1; t <= iterations; t++) {
    const step = 1 / (t + 1);
    computeJamEV(call);
    computeCallEV(jam);
    for (let a = 0; a < N; a++) jam[a] += step * ((evJam[a] > foldSB ? 1 : 0) - jam[a]);
    for (let b = 0; b < N; b++) call[b] += step * ((evCall[b] > foldBB ? 1 : 0) - call[b]);
    if (marks.has(t)) history.push({ iteration: t, exploitability: exploit() });
  }

  const frac = (s: Float32Array) => {
    let n = 0;
    for (let i = 0; i < N; i++) n += s[i] * HAND_CLASSES[i].combos.length;
    return n / 1326;
  };
  return {
    jam, call,
    jamFraction: frac(jam),
    callFraction: frac(call),
    sbValue: sbValueOf(jam, call),
    exploitability: exploit(),
    history,
    iterations,
  };
}
