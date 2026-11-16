import { evalMasks } from './evalCore';

const M = new Int32Array(4);

/** 5-card evaluator. Returns a rank in 1..7462, higher is better. See evalCore.ts. */
export function evaluate5(a: number, b: number, c: number, d: number, e: number): number {
  M[0] = M[1] = M[2] = M[3] = 0;
  M[a & 3] |= 1 << (a >> 2);
  M[b & 3] |= 1 << (b >> 2);
  M[c & 3] |= 1 << (c >> 2);
  M[d & 3] |= 1 << (d >> 2);
  M[e & 3] |= 1 << (e >> 2);
  return evalMasks(M[0], M[1], M[2], M[3]);
}
