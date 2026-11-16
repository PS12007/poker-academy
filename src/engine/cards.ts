/**
 * Card encoding.
 *
 * A card is an integer 0..51: card = rank * 4 + suit.
 *   rank 0..12 maps to 2,3,4,5,6,7,8,9,T,J,Q,K,A
 *   suit 0..3 maps to clubs, diamonds, hearts, spades
 */

export type Card = number;

export const RANK_CHARS = '23456789TJQKA';
export const SUIT_CHARS = 'cdhs';
export const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'] as const;
export const RANK_NAMES = [
  'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace',
] as const;
export const RANK_PLURALS = [
  'twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings', 'aces',
] as const;

export const rankOf = (c: Card): number => c >> 2;
export const suitOf = (c: Card): number => c & 3;
export const makeCard = (rank: number, suit: number): Card => (rank << 2) | suit;

export function cardToString(c: Card): string {
  return RANK_CHARS[c >> 2] + SUIT_CHARS[c & 3];
}

export function cardsToString(cards: readonly Card[], sep = ''): string {
  return cards.map(cardToString).join(sep);
}

export function parseCard(s: string): Card {
  if (s.length !== 2) throw new Error(`Bad card: "${s}"`);
  const r = RANK_CHARS.indexOf(s[0].toUpperCase());
  const su = SUIT_CHARS.indexOf(s[1].toLowerCase());
  if (r < 0 || su < 0) throw new Error(`Bad card: "${s}"`);
  return makeCard(r, su);
}

/** Parses "AsKd", "As Kd", "As,Kd". Throws on malformed input or duplicate cards. */
export function parseCards(s: string): Card[] {
  const clean = s.replace(/[\s,]+/g, '');
  if (clean.length % 2 !== 0) throw new Error(`Bad card string: "${s}"`);
  const out: Card[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    const c = parseCard(clean.slice(i, i + 2));
    if (out.includes(c)) throw new Error(`Duplicate card ${cardToString(c)} in "${s}"`);
    out.push(c);
  }
  return out;
}

/** Lenient parse for text inputs: returns null instead of throwing. */
export function tryParseCards(s: string): Card[] | null {
  try {
    return parseCards(s);
  } catch {
    return null;
  }
}

export function fullDeck(): Card[] {
  const d: Card[] = new Array(52);
  for (let i = 0; i < 52; i++) d[i] = i;
  return d;
}

/** The deck minus the given dead cards. */
export function remainingDeck(dead: readonly Card[]): Card[] {
  const used = new Uint8Array(52);
  for (const c of dead) used[c] = 1;
  const out: Card[] = [];
  for (let i = 0; i < 52; i++) if (!used[i]) out.push(i);
  return out;
}

/** All 24 permutations of the four suits. */
export const SUIT_PERMUTATIONS: readonly (readonly number[])[] = (() => {
  const out: number[][] = [];
  const rec = (cur: number[], left: number[]) => {
    if (!left.length) {
      out.push(cur);
      return;
    }
    left.forEach((x, i) => rec([...cur, x], [...left.slice(0, i), ...left.slice(i + 1)]));
  };
  rec([], [0, 1, 2, 3]);
  return out;
})();

export function permuteSuits(cards: readonly Card[], perm: readonly number[]): Card[] {
  return cards.map((c) => makeCard(c >> 2, perm[c & 3]));
}

/**
 * Canonical representative of a set of cards under suit relabeling.
 * Two holdings are strategically identical preflop when one can be turned into
 * the other by renaming suits. Returns a key that is equal for exactly those holdings.
 */
export function canonicalKey(cards: readonly Card[]): string {
  let best = '';
  for (const perm of SUIT_PERMUTATIONS) {
    const p = permuteSuits(cards, perm).sort((a, b) => a - b);
    let key = '';
    for (const c of p) key += String.fromCharCode(48 + c);
    if (best === '' || key < best) best = key;
  }
  return best;
}
