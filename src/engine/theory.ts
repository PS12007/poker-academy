/**
 * Game theory formulas. `pot` is the pot before the bet, `bet` is the bet size.
 */

/** Minimum defense frequency: the defender must continue this often so a pure bluff cannot profit. pot / (pot + bet). */
export function mdf(pot: number, bet: number): number {
  return pot / (pot + bet);
}

/** Alpha: how often a pure bluff must work to break even. bet / (pot + bet) = 1 - MDF. */
export function alpha(pot: number, bet: number): number {
  return bet / (pot + bet);
}

/**
 * Share of a polarized river betting range that should be bluffs so the
 * bluff catcher is indifferent to calling: bet / (pot + 2 x bet).
 * This equals the caller's pot odds.
 */
export function bluffFraction(pot: number, bet: number): number {
  return bet / (pot + 2 * bet);
}

/** Bluff combos per value combo at the same sizing: bet / (pot + bet). */
export function bluffsPerValue(pot: number, bet: number): number {
  return bet / (pot + bet);
}

/** Stack-to-pot ratio. */
export function spr(effectiveStack: number, pot: number): number {
  return effectiveStack / pot;
}

/**
 * Geometric sizing: the single pot fraction f that, bet and called on each of
 * `streets` streets, puts exactly `stack` in by the last one.
 * Each bet-and-call multiplies the pot by (1 + 2f), so
 *   (1 + 2f)^streets = (pot + 2 x stack) / pot.
 */
export function geometricFraction(pot: number, stack: number, streets: number): number {
  return (Math.pow((pot + 2 * stack) / pot, 1 / streets) - 1) / 2;
}

export interface GeometricStreet {
  potBefore: number;
  bet: number;
  potAfter: number;
  stackAfter: number;
}

export function geometricPlan(pot: number, stack: number, streets: number): GeometricStreet[] {
  const f = geometricFraction(pot, stack, streets);
  const out: GeometricStreet[] = [];
  let p = pot, s = stack;
  for (let i = 0; i < streets; i++) {
    const bet = Math.min(s, f * p);
    out.push({ potBefore: p, bet, potAfter: p + 2 * bet, stackAfter: s - bet });
    p += 2 * bet;
    s -= bet;
  }
  return out;
}

export interface RiverToyGame {
  /** Bettor bluffs this fraction of their air. */
  bluffFreqOfAir: number;
  /** Share of the betting range that is bluffs. */
  bluffShare: number;
  /** Bluff catcher calls this often. */
  callFreq: number;
  /** Bettor's EV for the whole range, in pot units of `pot`. */
  bettorEV: number;
  /** EV if the bettor never bluffed and the catcher always folded (value only wins the pot). */
  valueShare: number;
}

/**
 * The polarized river game. The bettor holds the nuts with probability
 * `valueShare` and air otherwise. The caller holds a bluff catcher that beats
 * air and loses to the nuts. One bet of size `bet` into `pot`, no raises.
 *
 * Caller indifference: bluffs / (bluffs + value) = bet / (pot + 2 bet).
 * Bettor indifference with air: call frequency = pot / (pot + bet).
 * If the bettor has too much value to find enough bluffs, they bet everything and the caller folds.
 */
export function solveRiverToyGame(pot: number, bet: number, valueShare: number): RiverToyGame {
  const v = valueShare, a = 1 - valueShare;
  const ratio = bet / (pot + bet); // bluffs per value combo
  const wantedBluffs = v * ratio;
  if (wantedBluffs >= a) {
    // Not enough air to balance: bet everything, caller always folds, bettor wins the pot.
    return { bluffFreqOfAir: 1, bluffShare: a, callFreq: 0, bettorEV: pot, valueShare: v };
  }
  const callFreq = pot / (pot + bet);
  // Value hands: win pot always, plus bet when called. Bluffs are indifferent (EV 0). Checked air wins 0.
  const bettorEV = v * (pot + callFreq * bet);
  return {
    bluffFreqOfAir: wantedBluffs / a,
    bluffShare: wantedBluffs / (v + wantedBluffs),
    callFreq,
    bettorEV,
    valueShare: v,
  };
}
