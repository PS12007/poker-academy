import { Category } from './evalCore';

/**
 * Short deck (6+) Hold'em uses 36 cards: sixes through aces. The ace still
 * plays low in one straight, A-6-7-8-9. Because there are fewer low cards,
 * flushes become rarer than full houses, which is why most short deck games
 * rank a flush above a full house.
 */

/** Category of a 5-card hand in a 36-card deck, with A-6-7-8-9 as the lowest straight. */
export function shortDeckCategory(cards: readonly number[]): Category {
  const ranks = cards.map((c) => c >> 2);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const shape = [...counts.values()].sort((a, b) => b - a).join('');
  const flush = cards.every((c) => (c & 3) === (cards[0] & 3));
  const distinct = [...counts.keys()].sort((a, b) => a - b);
  let straight = false;
  if (distinct.length === 5) {
    straight = distinct[4] - distinct[0] === 4;
    // Ace (12) with 6, 7, 8, 9 (ranks 4..7).
    if (!straight && distinct.join() === '4,5,6,7,12') straight = true;
  }
  if (straight && flush) return Category.StraightFlush;
  if (shape === '41') return Category.Quads;
  if (shape === '32') return Category.FullHouse;
  if (flush) return Category.Flush;
  if (straight) return Category.Straight;
  if (shape === '311') return Category.Trips;
  if (shape === '221') return Category.TwoPair;
  if (shape === '2111') return Category.Pair;
  return Category.HighCard;
}

/** Counts every 5-card hand from the 36-card deck by category. Total C(36,5) = 376,992. */
export function shortDeckCounts(): number[] {
  const deck: number[] = [];
  for (let c = 16; c < 52; c++) deck.push(c); // ranks 6 (index 4) through ace
  const counts = new Array<number>(9).fill(0);
  const h = [0, 0, 0, 0, 0];
  const n = deck.length;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            h[0] = deck[a]; h[1] = deck[b]; h[2] = deck[c]; h[3] = deck[d]; h[4] = deck[e];
            counts[shortDeckCategory(h)]++;
          }
  return counts;
}
