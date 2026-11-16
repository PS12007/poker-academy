import { evalMasks } from '../evalCore';
import { classOfCards, NUM_CLASSES, type WeightedCombo } from '../ranges';

export interface ComboEquity {
  c1: number;
  c2: number;
  w: number;
  /** Pot share against the opposing range. NaN if every opposing combo is blocked. */
  equity: number;
  win: number;
  tie: number;
}

export interface RangeVsRangeResult {
  /** Range equity for hero and villain. They sum to 1. */
  equity: [number, number];
  win: [number, number];
  tie: number;
  hero: ComboEquity[];
  /** Board runouts enumerated. */
  boards: number;
  /** Weighted (hero combo, villain combo, runout) showdowns counted. */
  showdowns: number;
  ms: number;
}

/**
 * Exact heads-up range vs range on a known flop, turn or river.
 *
 * A direct loop over hero combos x villain combos x runouts is about 10^9
 * showdowns on the flop. This does the same count in a fraction of the work:
 *
 * For each runout, evaluate every hero and villain combo once and sort the
 * villain combos by strength. Walking up that order while keeping a running
 * total of villain weight gives, for any hero strength, the total villain
 * weight it beats. That total wrongly includes villain combos that share a
 * card with hero, so a second running total is kept per card and the two
 * entries for hero's cards are subtracted (inclusion-exclusion). The only
 * villain combo containing both hero cards is hero's own holding, which ties
 * rather than loses, so it is added back in the tie count only.
 *
 * Every (hero combo, villain combo, runout) triple is weighted by
 * heroWeight x villainWeight, so blocked combos are removed exactly.
 */
export function rangeVsRangeBoard(
  hero: readonly WeightedCombo[],
  villain: readonly WeightedCombo[],
  board: readonly number[],
  dead: readonly number[] = [],
): RangeVsRangeResult {
  const t0 = Date.now();
  if (board.length < 3 || board.length > 5) throw new Error('rangeVsRangeBoard needs a flop, turn or river');
  const used = new Uint8Array(52);
  for (const c of board) used[c] = 1;
  for (const c of dead) used[c] = 1;
  const H = hero.filter((h) => h.w > 0 && !used[h.c1] && !used[h.c2]);
  const V = villain.filter((v) => v.w > 0 && !used[v.c1] && !used[v.c2]);
  const nh = H.length, nv = V.length;

  const pairW = new Float64Array(52 * 52);
  for (const v of V) {
    pairW[v.c1 * 52 + v.c2] += v.w;
    pairW[v.c2 * 52 + v.c1] += v.w;
  }

  const eqSum = new Float64Array(nh), winSum = new Float64Array(nh), tieSum = new Float64Array(nh), validSum = new Float64Array(nh);
  const hRank = new Int32Array(nh), vRank = new Int32Array(nv);
  const hOrder = new Int32Array(nh), vOrder = new Int32Array(nv);
  const cardBelow = new Float64Array(52), cardTie = new Float64Array(52), cardAll = new Float64Array(52);
  const bm = new Int32Array(4);
  for (const c of board) bm[c & 3] |= 1 << (c >> 2);

  const rankOf = (c1: number, c2: number): number => {
    let m0 = bm[0], m1 = bm[1], m2 = bm[2], m3 = bm[3];
    const ba = 1 << (c1 >> 2), bb = 1 << (c2 >> 2);
    switch (c1 & 3) { case 0: m0 |= ba; break; case 1: m1 |= ba; break; case 2: m2 |= ba; break; default: m3 |= ba; }
    switch (c2 & 3) { case 0: m0 |= bb; break; case 1: m1 |= bb; break; case 2: m2 |= bb; break; default: m3 |= bb; }
    return evalMasks(m0, m1, m2, m3);
  };

  let boards = 0;
  const runout = () => {
    boards++;
    let hn = 0, vn = 0, allW = 0;
    cardAll.fill(0);
    for (let j = 0; j < nv; j++) {
      const v = V[j];
      if (used[v.c1] || used[v.c2]) continue;
      vRank[j] = rankOf(v.c1, v.c2);
      vOrder[vn++] = j;
      allW += v.w;
      cardAll[v.c1] += v.w;
      cardAll[v.c2] += v.w;
    }
    for (let i = 0; i < nh; i++) {
      const h = H[i];
      if (used[h.c1] || used[h.c2]) continue;
      hRank[i] = rankOf(h.c1, h.c2);
      hOrder[hn++] = i;
    }
    const vs = vOrder.subarray(0, vn).sort((a, b) => vRank[a] - vRank[b]);
    const hs = hOrder.subarray(0, hn).sort((a, b) => hRank[a] - hRank[b]);

    cardBelow.fill(0);
    let below = 0;
    let vi = 0, hi = 0;
    while (hi < hn) {
      const r = hRank[hs[hi]];
      // Move every villain combo weaker than r into the below totals.
      while (vi < vn && vRank[vs[vi]] < r) {
        const v = V[vs[vi++]];
        below += v.w;
        cardBelow[v.c1] += v.w;
        cardBelow[v.c2] += v.w;
      }
      // Villain combos tied at r.
      let tieW = 0;
      let ve = vi;
      while (ve < vn && vRank[vs[ve]] === r) {
        const v = V[vs[ve++]];
        tieW += v.w;
        cardTie[v.c1] += v.w;
        cardTie[v.c2] += v.w;
      }
      while (hi < hn && hRank[hs[hi]] === r) {
        const i = hs[hi++];
        const h = H[i];
        const own = pairW[h.c1 * 52 + h.c2];
        const win = below - cardBelow[h.c1] - cardBelow[h.c2];
        const tie = tieW - cardTie[h.c1] - cardTie[h.c2] + own;
        const valid = allW - cardAll[h.c1] - cardAll[h.c2] + own;
        winSum[i] += win;
        tieSum[i] += tie;
        eqSum[i] += win + tie / 2;
        validSum[i] += valid;
      }
      for (let k = vi; k < ve; k++) {
        const v = V[vs[k]];
        cardTie[v.c1] = 0;
        cardTie[v.c2] = 0;
      }
    }
  };

  const avail: number[] = [];
  for (let c = 0; c < 52; c++) if (!used[c]) avail.push(c);
  const need = 5 - board.length;
  const deal = (start: number, left: number) => {
    if (left === 0) { runout(); return; }
    for (let i = start; i <= avail.length - left; i++) {
      const c = avail[i];
      used[c] = 1;
      bm[c & 3] ^= 1 << (c >> 2);
      deal(i + 1, left - 1);
      bm[c & 3] ^= 1 << (c >> 2);
      used[c] = 0;
    }
  };
  deal(0, need);

  let num = 0, den = 0, wn = 0, tn = 0;
  const heroOut: ComboEquity[] = H.map((h, i) => {
    num += h.w * eqSum[i];
    den += h.w * validSum[i];
    wn += h.w * winSum[i];
    tn += h.w * tieSum[i];
    return {
      c1: h.c1, c2: h.c2, w: h.w,
      equity: validSum[i] > 0 ? eqSum[i] / validSum[i] : NaN,
      win: validSum[i] > 0 ? winSum[i] / validSum[i] : NaN,
      tie: validSum[i] > 0 ? tieSum[i] / validSum[i] : NaN,
    };
  });
  const e = den > 0 ? num / den : NaN;
  const w = den > 0 ? wn / den : NaN;
  const t = den > 0 ? tn / den : NaN;
  return {
    equity: [e, 1 - e],
    win: [w, 1 - w - t],
    tie: t,
    hero: heroOut,
    boards,
    showdowns: den,
    ms: Date.now() - t0,
  };
}

/** Averages per-combo equities into the 169 hand classes for a grid heatmap. NaN where the class is absent. */
export function classEquities(combos: readonly ComboEquity[]): Float32Array {
  const sum = new Float64Array(NUM_CLASSES), wt = new Float64Array(NUM_CLASSES);
  for (const c of combos) {
    if (Number.isNaN(c.equity)) continue;
    const k = classOfCards(c.c1, c.c2);
    sum[k] += c.equity * c.w;
    wt[k] += c.w;
  }
  const out = new Float32Array(NUM_CLASSES);
  for (let k = 0; k < NUM_CLASSES; k++) out[k] = wt[k] > 0 ? sum[k] / wt[k] : NaN;
  return out;
}
