import { RANK_NAMES, RANK_PLURALS } from './cards';
import { Category, categoryOf, CATEGORY_BASE, evaluate, POP, STRAIGHT, TOP } from './evalCore';

/** Reverse of the high-card table: ordinal 1..1277 to the 5-bit rank mask. */
const ORD_TO_MASK: number[] = (() => {
  const out = [0];
  for (let m = 0; m < 8192; m++) if (POP[m] === 5 && STRAIGHT[m] === 0) out.push(m);
  return out;
})();

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const unsqueeze = (k: number, removed: number) => (k >= removed ? k + 1 : k);

/**
 * Turns a rank value into words, e.g. "Full house, kings full of sevens".
 * The dense rank encodes the whole hand, so no cards are needed.
 */
export function describeRank(rank: number): string {
  const cat = categoryOf(rank);
  const off = rank - CATEGORY_BASE[cat];
  switch (cat) {
    case Category.HighCard:
      return `${cap(RANK_NAMES[TOP[ORD_TO_MASK[off + 1]]])} high`;
    case Category.Pair:
      return `Pair of ${RANK_PLURALS[Math.floor(off / 220)]}`;
    case Category.TwoPair: {
      const pp = Math.floor(off / 11);
      let p1 = 1;
      while (((p1 + 1) * p1) / 2 <= pp) p1++;
      const p2 = pp - (p1 * (p1 - 1)) / 2;
      return `Two pair, ${RANK_PLURALS[p1]} and ${RANK_PLURALS[p2]}`;
    }
    case Category.Trips:
      return `Three of a kind, ${RANK_PLURALS[Math.floor(off / 66)]}`;
    case Category.Straight:
      return `Straight, ${RANK_NAMES[off + 3]} high`;
    case Category.Flush:
      return `Flush, ${RANK_NAMES[TOP[ORD_TO_MASK[off + 1]]]} high`;
    case Category.FullHouse: {
      const t = Math.floor(off / 12);
      return `Full house, ${RANK_PLURALS[t]} full of ${RANK_PLURALS[unsqueeze(off % 12, t)]}`;
    }
    case Category.Quads:
      return `Four of a kind, ${RANK_PLURALS[Math.floor(off / 12)]}`;
    default:
      return off === 9 ? 'Royal flush' : `Straight flush, ${RANK_NAMES[off + 3]} high`;
  }
}

export interface HandDescription {
  rank: number;
  category: Category;
  name: string;
  /** The five cards that make the hand. */
  best: number[];
}

/** Evaluates 5 to 7 cards and reports the name and which five cards play. */
export function describeHand(cards: readonly number[]): HandDescription {
  const rank = evaluate(cards);
  let best: number[] = cards.slice(0, 5);
  const n = cards.length;
  if (n > 5) {
    outer: for (let a = 0; a < n - 4; a++)
      for (let b = a + 1; b < n - 3; b++)
        for (let c = b + 1; c < n - 2; c++)
          for (let d = c + 1; d < n - 1; d++)
            for (let e = d + 1; e < n; e++) {
              const five = [cards[a], cards[b], cards[c], cards[d], cards[e]];
              if (evaluate(five) === rank) { best = five; break outer; }
            }
  }
  return { rank, category: categoryOf(rank), name: describeRank(rank), best };
}
