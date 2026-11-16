import { evalMasks } from '../evalCore';
import { evaluateOmaha } from '../omaha';
import { Rng } from '../rng';
import type { EquityRequest, EquityResult, ProgressFn } from './types';

/**
 * Monte Carlo equity.
 *
 * Each trial samples one holding per player according to its weight. If any two
 * sampled holdings share a card (or hit the board or dead cards) the whole trial
 * is thrown away and redrawn. Rejecting the whole trial, rather than redrawing
 * one player, keeps the joint distribution proportional to the product of the
 * weights over compatible assignments, which is the correct card-removal model.
 *
 * The standard error is the sample standard deviation of the per-trial pot share
 * divided by sqrt(trials). The 95% interval is equity +/- 1.96 standard errors.
 */
export function monteCarloEquity(req: EquityRequest, onProgress?: ProgressFn): EquityResult {
  const t0 = Date.now();
  const n = req.players.length;
  const iterations = req.iterations ?? 200_000;
  const seed = req.seed ?? 1;
  const rng = new Rng(seed);
  const omaha = req.game === 'omaha';
  const need = 5 - req.board.length;

  const baseUsed = new Uint8Array(52);
  for (const c of req.board) baseUsed[c] = 1;
  for (const c of req.dead ?? []) baseUsed[c] = 1;

  // Per player: holdings compatible with the board, and cumulative weights.
  const hands: number[][][] = [];
  const cum: Float64Array[] = [];
  for (const spec of req.players) {
    const hs: number[][] = [];
    const ws: number[] = [];
    spec.hands.forEach((h, i) => {
      const w = spec.weights ? spec.weights[i] : 1;
      if (w > 0 && h.every((c) => !baseUsed[c])) { hs.push(h); ws.push(w); }
    });
    if (!hs.length) throw new Error('A player has no possible holdings given the board and dead cards');
    const cw = new Float64Array(ws.length);
    let acc = 0;
    ws.forEach((w, i) => { acc += w; cw[i] = acc; });
    hands.push(hs);
    cum.push(cw);
  }

  const sample = (p: number): number[] => {
    const cw = cum[p];
    if (cw.length === 1) return hands[p][0];
    const x = rng.float() * cw[cw.length - 1];
    let lo = 0, hi = cw.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cw[mid] > x) hi = mid; else lo = mid + 1;
    }
    return hands[p][lo];
  };

  const used = new Uint8Array(52);
  const win = new Float64Array(n), tie = new Float64Array(n), sum = new Float64Array(n), sumSq = new Float64Array(n);
  const ranks = new Int32Array(n);
  const chosen: number[][] = new Array(n);
  const board = [...req.board, 0, 0, 0, 0, 0].slice(0, 5);
  const bm = new Int32Array(4);
  const bm0 = new Int32Array(4);
  for (const c of req.board) bm0[c & 3] |= 1 << (c >> 2);

  let done = 0;
  let rejected = 0;
  const maxRejects = iterations * 200 + 10_000;
  const chunk = Math.max(1, Math.floor(iterations / 50));

  while (done < iterations) {
    used.set(baseUsed);
    let clash = false;
    for (let p = 0; p < n && !clash; p++) {
      const h = sample(p);
      for (let k = 0; k < h.length; k++) {
        if (used[h[k]]) { clash = true; break; }
      }
      if (!clash) {
        for (let k = 0; k < h.length; k++) used[h[k]] = 1;
        chosen[p] = h;
      }
    }
    if (clash) {
      if (++rejected > maxRejects) throw new Error('These ranges almost never fit together. Check for conflicting cards.');
      continue;
    }
    bm[0] = bm0[0]; bm[1] = bm0[1]; bm[2] = bm0[2]; bm[3] = bm0[3];
    for (let k = 0; k < need; k++) {
      let c = rng.int(52);
      while (used[c]) c = rng.int(52);
      used[c] = 1;
      board[5 - need + k] = c;
      bm[c & 3] |= 1 << (c >> 2);
    }
    let best = 0, count = 0;
    for (let p = 0; p < n; p++) {
      let r: number;
      if (omaha) r = evaluateOmaha(chosen[p], board);
      else {
        const h = chosen[p];
        const a = h[0], b = h[1];
        let m0 = bm[0], m1 = bm[1], m2 = bm[2], m3 = bm[3];
        const ba = 1 << (a >> 2), bb = 1 << (b >> 2);
        switch (a & 3) { case 0: m0 |= ba; break; case 1: m1 |= ba; break; case 2: m2 |= ba; break; default: m3 |= ba; }
        switch (b & 3) { case 0: m0 |= bb; break; case 1: m1 |= bb; break; case 2: m2 |= bb; break; default: m3 |= bb; }
        r = evalMasks(m0, m1, m2, m3);
      }
      ranks[p] = r;
      if (r > best) { best = r; count = 1; } else if (r === best) count++;
    }
    const share = 1 / count;
    for (let p = 0; p < n; p++) {
      if (ranks[p] === best) {
        if (count === 1) win[p]++; else tie[p]++;
        sum[p] += share;
        sumSq[p] += share * share;
      }
    }
    done++;
    if (onProgress && done % chunk === 0) onProgress(done / iterations);
  }

  return {
    method: 'mc',
    samples: iterations,
    boards: 0,
    seed,
    players: Array.from({ length: n }, (_, p) => {
      const mean = sum[p] / iterations;
      const variance = Math.max(0, sumSq[p] / iterations - mean * mean);
      const se = Math.sqrt(variance / iterations);
      return {
        win: win[p] / iterations,
        tie: tie[p] / iterations,
        equity: mean,
        se,
        ci: [Math.max(0, mean - 1.96 * se), Math.min(1, mean + 1.96 * se)] as [number, number],
      };
    }),
    ms: Date.now() - t0,
  };
}
