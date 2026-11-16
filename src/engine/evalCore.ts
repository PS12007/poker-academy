/**
 * Hand evaluator core.
 *
 * ALGORITHM (documented in the app under Reference > Engine Notes)
 *
 * A hand of 5 to 7 cards is reduced to four 13-bit masks, one per suit, where
 * bit r is set when the hand holds rank r of that suit. Everything else is
 * bitwise logic plus lookups in tables indexed by a 13-bit mask (8,192 entries):
 *
 *   1. Flush: if any suit mask has 5+ bits, the hand is a flush or straight
 *      flush (with at most 7 cards a flush excludes quads and full houses).
 *      Look up the straight table, otherwise the high-card table, on that mask.
 *   2. Otherwise derive, with AND/OR only, the masks of ranks held at least
 *      twice, at least three times and four times. These identify quads,
 *      full house, trips, two pair and one pair with no loops and no sorting.
 *   3. Each category maps to a dense index using the combinatorial number
 *      system (colex rank of the kicker set), so the final value is a single
 *      integer in 1..7462. There are exactly 7,462 distinct 5-card hand values.
 *
 * HIGHER IS BETTER. 1 is 7-5-4-3-2 offsuit, 7462 is a royal flush.
 *
 *   high card       1..1277   (1277 values)
 *   one pair     1278..4137   (2860)
 *   two pair     4138..4995   (858)
 *   trips        4996..5853   (858)
 *   straight     5854..5863   (10)
 *   flush        5864..7140   (1277)
 *   full house   7141..7296   (156)
 *   quads        7297..7452   (156)
 *   straight fl. 7453..7462   (10)
 */

export const enum Category {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  Trips = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  Quads = 7,
  StraightFlush = 8,
}

export const CATEGORY_NAMES = [
  'High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush',
] as const;

/** First rank value of each category (index by Category), plus a sentinel. */
export const CATEGORY_BASE = [1, 1278, 4138, 4996, 5854, 5864, 7141, 7297, 7453, 7463] as const;
export const MAX_RANK = 7462;

const N = 8192;
/** Number of set bits. */
export const POP = new Uint8Array(N);
/** Index of the highest set bit, or 0 for an empty mask. */
export const TOP = new Uint8Array(N);
/** 0 if the mask holds no 5-rank straight, else 1 (wheel) .. 10 (broadway) for the best one. */
export const STRAIGHT = new Uint8Array(N);
/** For masks with 5+ bits: 1..1277 ordinal of the top five ranks as a no-straight hand. */
export const HIGH = new Uint16Array(N);

(function buildTables() {
  for (let m = 1; m < N; m++) {
    POP[m] = POP[m >> 1] + (m & 1);
    TOP[m] = 31 - Math.clz32(m);
  }
  const WHEEL = 0b1000000001111;
  for (let m = 0; m < N; m++) {
    let s = 0;
    if ((m & WHEEL) === WHEEL) s = 1;
    for (let lo = 0; lo <= 8; lo++) {
      const run = 0b11111 << lo;
      if ((m & run) === run) s = lo + 2;
    }
    STRAIGHT[m] = s;
  }
  // Ordinals of 5-bit masks that are not straights, in increasing numeric order.
  // Numeric order of the mask equals comparing ranks from the top card down.
  const ord5 = new Uint16Array(N);
  let n = 0;
  for (let m = 0; m < N; m++) {
    if (POP[m] === 5 && STRAIGHT[m] === 0) ord5[m] = ++n;
  }
  for (let m = 0; m < N; m++) {
    if (POP[m] < 5) continue;
    let t = m;
    while (POP[t] > 5) t &= t - 1; // drop lowest bits until five remain
    HIGH[m] = ord5[t];
  }
})();

/**
 * Evaluates the best 5-card hand contained in 5 to 7 cards given as suit masks.
 * Returns 1..7462, higher is better.
 */
export function evalMasks(c: number, d: number, h: number, s: number): number {
  // Flush or straight flush.
  if (POP[c] >= 5) return STRAIGHT[c] ? 7452 + STRAIGHT[c] : 5863 + HIGH[c];
  if (POP[d] >= 5) return STRAIGHT[d] ? 7452 + STRAIGHT[d] : 5863 + HIGH[d];
  if (POP[h] >= 5) return STRAIGHT[h] ? 7452 + STRAIGHT[h] : 5863 + HIGH[h];
  if (POP[s] >= 5) return STRAIGHT[s] ? 7452 + STRAIGHT[s] : 5863 + HIGH[s];

  const any = c | d | h | s;
  const cd = c & d;
  const hs = h & s;
  const quads = cd & hs;
  if (quads) {
    const q = TOP[quads];
    const k = TOP[any ^ (1 << q)];
    return 7297 + q * 12 + (k > q ? k - 1 : k);
  }
  const three = (cd & (h | s)) | (hs & (c | d));
  const two = cd | hs | ((c | d) & (h | s));
  if (three) {
    const t = TOP[three];
    const rest = two ^ (1 << t);
    if (rest) {
      const p = TOP[rest];
      return 7141 + t * 12 + (p > t ? p - 1 : p);
    }
    if (STRAIGHT[any]) return 5853 + STRAIGHT[any];
    let m = any ^ (1 << t);
    let k1 = TOP[m];
    m ^= 1 << k1;
    let k2 = TOP[m];
    if (k1 > t) k1--;
    if (k2 > t) k2--;
    return 4996 + t * 66 + ((k1 * (k1 - 1)) >> 1) + k2;
  }
  if (STRAIGHT[any]) return 5853 + STRAIGHT[any];
  if (two) {
    const p1 = TOP[two];
    const rest = two ^ (1 << p1);
    if (rest) {
      const p2 = TOP[rest];
      let k = TOP[any ^ (1 << p1) ^ (1 << p2)];
      k -= (k > p1 ? 1 : 0) + (k > p2 ? 1 : 0);
      return 4138 + (((p1 * (p1 - 1)) >> 1) + p2) * 11 + k;
    }
    let m = any ^ (1 << p1);
    let k1 = TOP[m];
    m ^= 1 << k1;
    let k2 = TOP[m];
    m ^= 1 << k2;
    let k3 = TOP[m];
    if (k1 > p1) k1--;
    if (k2 > p1) k2--;
    if (k3 > p1) k3--;
    return 1278 + p1 * 220 + (k1 * (k1 - 1) * (k1 - 2)) / 6 + ((k2 * (k2 - 1)) >> 1) + k3;
  }
  return HIGH[any];
}

export function categoryOf(rank: number): Category {
  if (rank >= 5854) {
    if (rank >= 7297) return rank >= 7453 ? Category.StraightFlush : Category.Quads;
    if (rank >= 7141) return Category.FullHouse;
    return rank >= 5864 ? Category.Flush : Category.Straight;
  }
  if (rank >= 4138) return rank >= 4996 ? Category.Trips : Category.TwoPair;
  return rank >= 1278 ? Category.Pair : Category.HighCard;
}

export function categoryName(rank: number): string {
  return CATEGORY_NAMES[categoryOf(rank)];
}

/** Evaluates any 5 to 7 cards given as an array. Convenience path, not the hot loop. */
export function evaluate(cards: readonly number[]): number {
  let c = 0, d = 0, h = 0, s = 0;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const bit = 1 << (card >> 2);
    switch (card & 3) {
      case 0: c |= bit; break;
      case 1: d |= bit; break;
      case 2: h |= bit; break;
      default: s |= bit;
    }
  }
  return evalMasks(c, d, h, s);
}
