import { Category, categoryOf, evalMasks, evaluate } from './evalCore';

/** Category of fewer than 5 cards (pairs, trips, quads only). Used for the board on its own. */
function looseCategory(cards: readonly number[]): Category {
  const m = [0, 0, 0, 0];
  for (const c of cards) m[c & 3] |= 1 << (c >> 2);
  if (cards.length >= 5) return categoryOf(evalMasks(m[0], m[1], m[2], m[3]));
  const cd = m[0] & m[1], hs = m[2] & m[3];
  if (cd & hs) return Category.Quads;
  const three = (cd & (m[2] | m[3])) | (hs & (m[0] | m[1]));
  const two = cd | hs | ((m[0] | m[1]) & (m[2] | m[3]));
  if (three) return Category.Trips;
  if (two) return two & (two - 1) ? Category.TwoPair : Category.Pair;
  return Category.HighCard;
}

export interface Out {
  card: number;
  /** Hero's hand category after this card. */
  category: Category;
  rank: number;
}

export interface OutsResult {
  current: Category;
  currentRank: number;
  outs: Out[];
  /** Outs grouped by the category they make, strongest first. */
  byCategory: { category: Category; cards: number[] }[];
  unseen: number;
}

/**
 * Improving cards: next cards that lift hero's hand to a better category by
 * more than they lift the bare board. A card that only pairs the board
 * improves everyone equally and is not counted.
 *
 * These are raw outs. Whether an out actually wins depends on the opponent's
 * hand. Use outsVersus for that.
 */
export function findOuts(hole: readonly number[], board: readonly number[], dead: readonly number[] = []): OutsResult {
  if (board.length < 3 || board.length > 4) throw new Error('Outs need a flop or a turn');
  const used = new Uint8Array(52);
  for (const c of [...hole, ...board, ...dead]) used[c] = 1;
  const currentRank = evaluate([...hole, ...board]);
  const current = categoryOf(currentRank);
  const edgeNow = current - looseCategory(board);
  const outs: Out[] = [];
  let unseen = 0;
  for (let c = 0; c < 52; c++) {
    if (used[c]) continue;
    unseen++;
    const rank = evaluate([...hole, ...board, c]);
    const cat = categoryOf(rank);
    if (cat > current && cat - looseCategory([...board, c]) > edgeNow) outs.push({ card: c, category: cat, rank });
  }
  const groups = new Map<Category, number[]>();
  for (const o of outs) {
    if (!groups.has(o.category)) groups.set(o.category, []);
    groups.get(o.category)!.push(o.card);
  }
  const byCategory = [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([category, cards]) => ({ category, cards }));
  return { current, currentRank, outs, byCategory, unseen };
}

export interface VersusOuts {
  /** True if hero is behind right now. */
  behind: boolean;
  /** Cards that put hero strictly ahead on the next street. */
  outs: Out[];
  /** Cards that produce a tie. */
  chops: number[];
  unseen: number;
}

/** Outs against one known hand: next cards after which hero is ahead. Exact, no judgment calls. */
export function outsVersus(hole: readonly number[], villain: readonly number[], board: readonly number[]): VersusOuts {
  if (board.length < 3 || board.length > 4) throw new Error('Outs need a flop or a turn');
  const used = new Uint8Array(52);
  for (const c of [...hole, ...villain, ...board]) used[c] = 1;
  const behind = evaluate([...hole, ...board]) < evaluate([...villain, ...board]);
  const outs: Out[] = [];
  const chops: number[] = [];
  let unseen = 0;
  for (let c = 0; c < 52; c++) {
    if (used[c]) continue;
    unseen++;
    const h = evaluate([...hole, ...board, c]);
    const v = evaluate([...villain, ...board, c]);
    if (h > v) outs.push({ card: c, category: categoryOf(h), rank: h });
    else if (h === v) chops.push(c);
  }
  return { behind, outs, chops, unseen };
}
