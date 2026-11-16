/**
 * Expected value helpers. In every function `pot` is the pot BEFORE hero acts
 * and already includes the opponent's bet.
 */

/** Equity needed to break even on a call: call / (pot + call). */
export function potOdds(pot: number, call: number): number {
  return call / (pot + call);
}

/** Pot odds as a ratio, e.g. pot 150 and call 50 gives 3 (3 to 1). */
export function potOddsRatio(pot: number, call: number): number {
  return pot / call;
}

/** EV of calling with a given equity and no further betting: equity x pot - (1 - equity) x call. */
export function evCall(pot: number, call: number, equity: number): number {
  return equity * pot - (1 - equity) * call;
}

/**
 * Implied odds: the extra amount hero must win on later streets, on the times
 * the draw hits, for a call to break even.
 *   equity x (pot + extra) - (1 - equity) x call = 0
 *   extra = call x (1 - equity) / equity - pot
 * A negative result means the call is already profitable on direct odds.
 */
export function impliedOddsNeeded(pot: number, call: number, equity: number): number {
  return (call * (1 - equity)) / equity - pot;
}

/** EV of a call when hero wins `extra` more on hits and loses `extraLoss` more on some misses or second-best hits. */
export function evCallImplied(pot: number, call: number, equity: number, extraWin: number, extraLoss = 0): number {
  return equity * (pot + extraWin) - (1 - equity) * (call + extraLoss);
}

export interface ShoveEV {
  ev: number;
  whenFolds: number;
  whenCalled: number;
  /** Fold equity at which the shove breaks even. */
  breakEvenFoldEquity: number;
}

/**
 * EV of a shove:
 *   foldEquity x pot + (1 - foldEquity) x (equity x finalPot - risk)
 * pot: what hero wins when everyone folds.
 * finalPot: total pot at showdown when called, including hero's shove.
 * risk: the amount hero puts in with the shove.
 */
export function evShove(foldEquity: number, pot: number, equity: number, finalPot: number, risk: number): ShoveEV {
  const whenCalled = equity * finalPot - risk;
  const ev = foldEquity * pot + (1 - foldEquity) * whenCalled;
  const breakEvenFoldEquity = whenCalled >= 0 ? 0 : -whenCalled / (pot - whenCalled);
  return { ev, whenFolds: pot, whenCalled, breakEvenFoldEquity };
}

/** EV of a pure bluff of size `bet` into `pot` that works with probability `foldEquity`. */
export function evBluff(pot: number, bet: number, foldEquity: number): number {
  return foldEquity * pot - (1 - foldEquity) * bet;
}
