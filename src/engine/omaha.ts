import { evaluate5 } from './evaluator5';

/**
 * Omaha evaluation: the best hand using EXACTLY two hole cards and EXACTLY
 * three board cards. Works for 4-card (PLO) and 5-card (PLO5) holdings and
 * for boards of 3, 4 or 5 cards.
 */
export function evaluateOmaha(hole: readonly number[], board: readonly number[]): number {
  const hn = hole.length, bn = board.length;
  if (hn < 2 || bn < 3) throw new Error('Omaha needs at least 2 hole cards and 3 board cards');
  let best = 0;
  for (let i = 0; i < hn - 1; i++)
    for (let j = i + 1; j < hn; j++)
      for (let a = 0; a < bn - 2; a++)
        for (let b = a + 1; b < bn - 1; b++)
          for (let c = b + 1; c < bn; c++) {
            const r = evaluate5(hole[i], hole[j], board[a], board[b], board[c]);
            if (r > best) best = r;
          }
  return best;
}

export interface OmahaBest {
  rank: number;
  /** The two hole cards that play. */
  hole: [number, number];
  /** The three board cards that play. */
  board: [number, number, number];
}

export function bestOmaha(hole: readonly number[], board: readonly number[]): OmahaBest {
  const hn = hole.length;
  const bn = board.length;
  if (hn < 2 || bn < 3) throw new Error('Omaha needs at least 2 hole cards and 3 board cards');
  let best = 0;
  let bh0 = 0, bh1 = 0, bb0 = 0, bb1 = 0, bb2 = 0;
  for (let i = 0; i < hn - 1; i++) {
    for (let j = i + 1; j < hn; j++) {
      const h0 = hole[i], h1 = hole[j];
      for (let a = 0; a < bn - 2; a++) {
        for (let b = a + 1; b < bn - 1; b++) {
          for (let c = b + 1; c < bn; c++) {
            const r = evaluate5(h0, h1, board[a], board[b], board[c]);
            if (r > best) {
              best = r;
              bh0 = h0; bh1 = h1; bb0 = board[a]; bb1 = board[b]; bb2 = board[c];
            }
          }
        }
      }
    }
  }
  return { rank: best, hole: [bh0, bh1], board: [bb0, bb1, bb2] };
}
