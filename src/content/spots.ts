import { parseCards } from '../engine/cards';
import { Category } from '../engine/evalCore';
import { shareAtLeast } from '../engine/board';
import { expandRange, parseRange } from '../engine/ranges';
import { OPEN_RANGE_TEXT, VS_OPEN } from '../engine/teachingRanges';

/** Standard example for postflop lessons: button opens, big blind calls. */
export const BTN = OPEN_RANGE_TEXT.BTN;
/** The big blind's calling range against a button open. Its best hands 3-bet, so this range is capped. */
export const BB = VS_OPEN['BB-vs-late'].call;

const MIN = { twoPair: Category.TwoPair, set: Category.Trips, straight: Category.Straight } as const;

/** Share of a range holding at least two pair, a set, or a straight on a board. */
export function share(range: string, board: string, min: keyof typeof MIN): number {
  const bd = parseCards(board);
  return shareAtLeast(expandRange(parseRange(range), bd), bd, MIN[min]);
}
