import { parseRange, type Range } from './ranges';

/**
 * SIMPLIFIED TEACHING RANGES.
 *
 * These are original, hand-built ranges for a six-handed cash game with
 * 100 big blind stacks. They are NOT solver output and are deliberately
 * rounder and a little tighter than equilibrium play so they are easy to
 * remember and hard to get into trouble with. Each later position contains
 * every hand of the earlier ones.
 */
export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export const POSITIONS: readonly Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export const POSITION_NAMES: Record<Position, string> = {
  UTG: 'Under the gun',
  HJ: 'Hijack',
  CO: 'Cutoff',
  BTN: 'Button',
  SB: 'Small blind',
  BB: 'Big blind',
};

const UTG = '55+, ATs+, A5s-A4s, KTs+, QTs+, JTs, T9s, AJo+, KQo';
const HJ = `${UTG}, 44-33, A9s-A6s, A3s-A2s, K9s, Q9s, J9s, 98s, ATo, KJo`;
const CO = `${HJ}, 22, K8s-K6s, Q8s, J8s, T8s, 87s, 76s, A9o, KTo, QJo, QTo, JTo`;
const BTN = `${CO}, K5s-K2s, Q7s-Q4s, J7s, T7s, 97s, 86s, 75s, 65s, 54s, A8o-A2o, K9o-K8o, Q9o, J9o, T9o, 98o`;
const SB = `${CO}, K5s-K3s, Q7s-Q6s, J7s, T7s, 97s, 86s, 65s, 54s, A8o-A5o, K9o, Q9o, J9o, T9o`;

export const OPEN_RANGE_TEXT: Record<Exclude<Position, 'BB'>, string> = { UTG, HJ, CO, BTN, SB };

/** Opening (raise-first-in) range for a position. The big blind cannot open. */
export function openRange(pos: Exclude<Position, 'BB'>): Range {
  return parseRange(OPEN_RANGE_TEXT[pos]);
}

/** The very first chart shown to beginners: one tight range for early seats, one for late seats. */
export const BEGINNER_EARLY = '77+, ATs+, KQs, AQo+';
export const BEGINNER_LATE = '22+, A2s+, KTs+, QTs+, JTs, T9s, 98s, ATo+, KJo+, QJo';

export interface Facing {
  /** Hands to 3-bet for value. */
  value: string;
  /** Hands to 3-bet as bluffs. */
  bluff: string;
  /** Hands to call. */
  call: string;
}

/** Simplified responses to an open raise, by defender position and opener position group. */
export const VS_OPEN: Record<string, Facing> = {
  // In position against an early-position open: tight.
  'IP-vs-early': { value: 'QQ+, AKs, AKo', bluff: 'A5s-A4s', call: 'JJ-77, AQs-AJs, KQs, QJs, JTs, T9s' },
  // In position against a late-position open: wider.
  'IP-vs-late': { value: 'JJ+, AQs+, AKo', bluff: 'A5s-A2s, K9s, 76s, 65s', call: 'TT-55, AJs-ATs, KTs+, QTs+, JTs, T9s, 98s, AQo' },
  // Big blind against an early-position open.
  'BB-vs-early': {
    value: 'QQ+, AKs, AKo',
    bluff: 'A5s-A4s, K5s',
    call: 'JJ-22, AQs-A6s, A3s-A2s, K9s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, AQo-AJo, KQo',
  },
  // Big blind against a button open: the widest defense, because the price is good and the opener is weak.
  'BB-vs-late': {
    value: 'TT+, AJs+, KQs, AQo+',
    bluff: 'A5s-A2s, K6s-K4s, Q7s, J7s, 64s, 53s',
    call: '99-22, ATs-A6s, KJs-K7s, Q8s+, J8s+, T7s+, 96s+, 85s+, 74s+, 65s, 54s, 43s, AJo-A2o, K9o+, Q9o+, J9o+, T8o+, 98o, 87o',
  },
};
