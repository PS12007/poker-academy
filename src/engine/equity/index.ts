import { parseCards } from '../cards';
import { expandRange, parseRange, type Range } from '../ranges';
import { exactEquity, exactWork } from './exact';
import { monteCarloEquity } from './monteCarlo';
import type { EquityRequest, EquityResult, PlayerSpec, ProgressFn } from './types';

export * from './types';
export { exactEquity, exactWork } from './exact';
export { monteCarloEquity } from './monteCarlo';
export { rangeVsRangeBoard, classEquities } from './rangeVsRange';
export type { ComboEquity, RangeVsRangeResult } from './rangeVsRange';

/** Evaluations auto mode is willing to enumerate before switching to Monte Carlo. */
export const DEFAULT_EXACT_BUDGET = 60_000_000;

export function validateRequest(req: EquityRequest): void {
  if (req.players.length < 2 || req.players.length > 9) throw new Error('Equity needs 2 to 9 players');
  if (![0, 3, 4, 5].includes(req.board.length)) throw new Error('Board must have 0, 3, 4 or 5 cards');
  const seen = new Set<number>();
  for (const c of [...req.board, ...(req.dead ?? [])]) {
    if (seen.has(c)) throw new Error('Duplicate card on the board or in the dead cards');
    seen.add(c);
  }
  const size = req.game === 'omaha' ? req.players[0].hands[0]?.length : 2;
  for (const p of req.players) {
    if (!p.hands.length) throw new Error('Every player needs a hand or a range');
    for (const h of p.hands) {
      if (h.length !== size || new Set(h).size !== h.length) throw new Error('Malformed holding');
    }
  }
  if (req.game === 'omaha' && (size < 4 || size > 5)) throw new Error('Omaha holdings are 4 or 5 cards');
}

/** Exact when feasible, otherwise Monte Carlo with a confidence interval. */
export function computeEquity(req: EquityRequest, onProgress?: ProgressFn): EquityResult {
  validateRequest(req);
  const mode = req.mode ?? 'auto';
  if (mode === 'exact') return exactEquity(req, onProgress);
  if (mode === 'mc') return monteCarloEquity(req, onProgress);
  return exactWork(req) <= (req.exactBudget ?? DEFAULT_EXACT_BUDGET)
    ? exactEquity(req, onProgress)
    : monteCarloEquity(req, onProgress);
}

/** A specific holding such as "AsKd" as a one-hand player. */
export function handSpec(text: string): PlayerSpec {
  return { hands: [parseCards(text)] };
}

/** A Hold'em range as a player, with combos blocked by the given cards removed. */
export function rangeSpec(range: Range | string, blocked: readonly number[] = []): PlayerSpec {
  const r = typeof range === 'string' ? parseRange(range) : range;
  const combos = expandRange(r, blocked);
  return { hands: combos.map((c) => [c.c1, c.c2]), weights: combos.map((c) => c.w) };
}

/** Convenience for specific hands: equity("AsAh", "KsKh") or with a board. Always exact. */
export function handVsHand(hands: string[], board = '', dead = ''): EquityResult {
  return computeEquity({
    game: hands[0].replace(/\s/g, '').length > 4 ? 'omaha' : 'holdem',
    players: hands.map(handSpec),
    board: parseCards(board),
    dead: parseCards(dead),
    mode: 'exact',
  });
}

export interface NextCardEquity {
  card: number;
  /** Equity of each player if this card comes next. */
  equity: number[];
}

/**
 * For specific hands on a flop or turn: the exact equity after each possible next card.
 * This is the data behind the equity-by-turn-card chart.
 */
export function equityByNextCard(req: EquityRequest): NextCardEquity[] {
  validateRequest(req);
  if (req.board.length !== 3 && req.board.length !== 4) throw new Error('Needs a flop or turn');
  const used = new Set<number>([...req.board, ...(req.dead ?? [])]);
  for (const p of req.players) if (p.hands.length === 1) for (const c of p.hands[0]) used.add(c);
  const out: NextCardEquity[] = [];
  for (let c = 0; c < 52; c++) {
    if (used.has(c)) continue;
    const r = computeEquity({ ...req, board: [...req.board, c], mode: req.mode ?? 'auto' });
    out.push({ card: c, equity: r.players.map((p) => p.equity) });
  }
  return out;
}
