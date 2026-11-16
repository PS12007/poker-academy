export type Game = 'holdem' | 'omaha';

/** One seat in an equity calculation: a weighted list of concrete holdings. */
export interface PlayerSpec {
  /** Each hand is 2 cards (Hold'em) or 4 to 5 cards (Omaha). */
  hands: number[][];
  /** Same length as hands. Omit for uniform weights. */
  weights?: number[];
}

export interface EquityRequest {
  game: Game;
  players: PlayerSpec[];
  board: number[];
  dead?: number[];
  /** auto: exact when the enumeration is small enough, otherwise Monte Carlo. */
  mode?: 'auto' | 'exact' | 'mc';
  /** Monte Carlo trials. */
  iterations?: number;
  seed?: number;
  /** Largest number of hand evaluations auto mode will enumerate exactly. */
  exactBudget?: number;
}

export interface PlayerEquity {
  /** Probability of winning the pot outright. */
  win: number;
  /** Probability of splitting the pot. */
  tie: number;
  /** Pot share: wins plus the fraction of each split pot. */
  equity: number;
  /** Monte Carlo only: standard error of the equity estimate. */
  se?: number;
  /** Monte Carlo only: 95% confidence interval for equity. */
  ci?: [number, number];
}

export interface EquityResult {
  method: 'exact' | 'mc';
  /** Exact: weighted showdowns enumerated. Monte Carlo: trials sampled. */
  samples: number;
  /** Distinct boards enumerated (exact) or 0. */
  boards: number;
  seed?: number;
  players: PlayerEquity[];
  ms: number;
}

export type ProgressFn = (fraction: number) => void;
