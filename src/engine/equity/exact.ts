import { evalMasks } from '../evalCore';
import { evaluateOmaha } from '../omaha';
import { nCr } from '../combinatorics';
import type { EquityRequest, EquityResult, ProgressFn } from './types';

/** Number of hand evaluations an exact run would need. Used to choose exact vs Monte Carlo. */
export function exactWork(req: EquityRequest): number {
  const holeSize = req.players[0]?.hands[0]?.length ?? 2;
  const known = req.board.length + (req.dead?.length ?? 0) + holeSize * req.players.length;
  const boards = nCr(52 - known, 5 - req.board.length);
  let tuples = 1;
  for (const p of req.players) tuples *= p.hands.length;
  const perEval = req.game === 'omaha' ? nCr(holeSize, 2) * 10 : 1;
  return tuples * boards * req.players.length * perEval;
}

/**
 * Exact equity by exhaustive enumeration.
 *
 * Every compatible assignment of one holding per player is visited (weighted by
 * the product of the holdings' weights) and for each one every possible board
 * completion is dealt. Holdings that share a card with each other, the board or
 * the dead cards are skipped, which is what makes card removal come out right.
 */
export function exactEquity(req: EquityRequest, onProgress?: ProgressFn): EquityResult {
  const t0 = Date.now();
  const n = req.players.length;
  const need = 5 - req.board.length;
  const omaha = req.game === 'omaha';
  const used = new Uint8Array(52);
  for (const c of req.board) used[c] = 1;
  for (const c of req.dead ?? []) used[c] = 1;

  const win = new Float64Array(n);
  const tie = new Float64Array(n);
  const eq = new Float64Array(n);
  let total = 0;
  let boards = 0;

  const bm = new Int32Array(4);
  for (const c of req.board) bm[c & 3] |= 1 << (c >> 2);
  const fullBoard = [...req.board, 0, 0, 0, 0, 0].slice(0, 5);
  const hm = new Int32Array(n * 4);
  const chosen: number[][] = new Array(n);
  const ranks = new Int32Array(n);
  let avail: number[] = [];
  let weight = 1;

  const showdown = () => {
    let best = 0;
    let count = 0;
    for (let p = 0; p < n; p++) {
      const r = omaha
        ? evaluateOmaha(chosen[p], fullBoard)
        : evalMasks(bm[0] | hm[p * 4], bm[1] | hm[p * 4 + 1], bm[2] | hm[p * 4 + 2], bm[3] | hm[p * 4 + 3]);
      ranks[p] = r;
      if (r > best) { best = r; count = 1; }
      else if (r === best) count++;
    }
    if (count === 1) {
      for (let p = 0; p < n; p++) if (ranks[p] === best) { win[p] += weight; eq[p] += weight; }
    } else {
      const share = weight / count;
      for (let p = 0; p < n; p++) if (ranks[p] === best) { tie[p] += weight; eq[p] += share; }
    }
    total += weight;
    boards++;
  };

  const deal = (start: number, left: number) => {
    if (left === 0) { showdown(); return; }
    const end = avail.length - left;
    for (let i = start; i <= end; i++) {
      const c = avail[i];
      bm[c & 3] ^= 1 << (c >> 2);
      fullBoard[5 - left] = c;
      deal(i + 1, left - 1);
      bm[c & 3] ^= 1 << (c >> 2);
    }
  };

  const topCount = req.players[0].hands.length;
  const assign = (p: number, w: number) => {
    if (p === n) {
      avail = [];
      for (let c = 0; c < 52; c++) if (!used[c]) avail.push(c);
      weight = w;
      deal(0, need);
      return;
    }
    const spec = req.players[p];
    for (let i = 0; i < spec.hands.length; i++) {
      const hand = spec.hands[i];
      const hw = spec.weights ? spec.weights[i] : 1;
      if (hw <= 0) continue;
      let clash = false;
      for (const c of hand) if (used[c]) { clash = true; break; }
      if (!clash) {
        // A holding with a repeated card is malformed; the caller validates, this guards anyway.
        for (const c of hand) used[c] = 1;
        hm[p * 4] = hm[p * 4 + 1] = hm[p * 4 + 2] = hm[p * 4 + 3] = 0;
        for (const c of hand) hm[p * 4 + (c & 3)] |= 1 << (c >> 2);
        chosen[p] = hand;
        assign(p + 1, w * hw);
        for (const c of hand) used[c] = 0;
      }
      if (p === 0 && onProgress) onProgress((i + 1) / topCount);
    }
  };
  assign(0, 1);

  return {
    method: 'exact',
    samples: total,
    boards,
    players: Array.from({ length: n }, (_, p) => ({
      win: total ? win[p] / total : 0,
      tie: total ? tie[p] / total : 0,
      equity: total ? eq[p] / total : 0,
    })),
    ms: Date.now() - t0,
  };
}
