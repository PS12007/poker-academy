import { evalMasks } from './evalCore';

const M = new Int32Array(4);

/**
 * 7-card evaluator: rank of the best 5-card hand among 7 cards, 1..7462.
 * No 21-subset loop. The suit-mask logic in evalCore.ts handles 7 cards directly.
 */
export function evaluate7(a: number, b: number, c: number, d: number, e: number, f: number, g: number): number {
  M[0] = M[1] = M[2] = M[3] = 0;
  M[a & 3] |= 1 << (a >> 2);
  M[b & 3] |= 1 << (b >> 2);
  M[c & 3] |= 1 << (c >> 2);
  M[d & 3] |= 1 << (d >> 2);
  M[e & 3] |= 1 << (e >> 2);
  M[f & 3] |= 1 << (f >> 2);
  M[g & 3] |= 1 << (g >> 2);
  return evalMasks(M[0], M[1], M[2], M[3]);
}

export function evaluate6(a: number, b: number, c: number, d: number, e: number, f: number): number {
  M[0] = M[1] = M[2] = M[3] = 0;
  M[a & 3] |= 1 << (a >> 2);
  M[b & 3] |= 1 << (b >> 2);
  M[c & 3] |= 1 << (c >> 2);
  M[d & 3] |= 1 << (d >> 2);
  M[e & 3] |= 1 << (e >> 2);
  M[f & 3] |= 1 << (f >> 2);
  return evalMasks(M[0], M[1], M[2], M[3]);
}
