/**
 * Pot-limit betting. The largest legal raise is "call, then raise the pot":
 *
 *   max total bet = current bet + (pot after you call)
 *                 = current bet + (pot + current bet - your street contribution)
 *
 * where pot is everything already in the middle including all bets on this
 * street. With nothing to call, the maximum bet is simply the pot.
 */

export interface PotLimitAction {
  /** Seat index of the player acting. */
  player: number;
  kind: 'bet' | 'call' | 'raise' | 'check' | 'fold';
  /** For bet and raise: the total the player's street contribution becomes. Omit for the maximum. */
  to?: number;
}

export interface PotLimitStep {
  player: number;
  kind: PotLimitAction['kind'];
  /** Amount the player had to call before acting. */
  toCall: number;
  /** Largest total a bet or raise could reach at this point. */
  maxTo: number;
  /** Smallest legal total for a bet or raise. */
  minTo: number;
  /** Total the player's street contribution became after acting. */
  after: number;
  /** Pot after the action. */
  potAfter: number;
  /** The working for the maximum: pot before, the call, and the raise. */
  working: { potBefore: number; call: number; raiseBy: number };
}

/** Maximum total a player may bet or raise to. */
export function maxRaiseTo(pot: number, currentBet: number, myContribution: number): number {
  const call = currentBet - myContribution;
  return currentBet + pot + call;
}

/**
 * Replays a street of action and reports the legal range at each step.
 * `pot` is the pot at the start of the street. `bigBlind` sets the minimum bet.
 * Preflop: pass the blinds as starting contributions.
 */
export function replayStreet(pot: number, actions: readonly PotLimitAction[], bigBlind: number, start: number[] = []): PotLimitStep[] {
  const contrib = new Map<number, number>();
  start.forEach((c, i) => c > 0 && contrib.set(i, c));
  let currentBet = Math.max(0, ...start);
  let lastRaiseSize = Math.max(bigBlind, currentBet);
  let total = pot + start.reduce((a, b) => a + b, 0);
  const out: PotLimitStep[] = [];
  for (const a of actions) {
    const mine = contrib.get(a.player) ?? 0;
    const toCall = Math.max(0, currentBet - mine);
    const maxTo = maxRaiseTo(total, currentBet, mine);
    const minTo = currentBet === 0 ? bigBlind : currentBet + lastRaiseSize;
    let after = mine;
    if (a.kind === 'call') after = currentBet;
    else if (a.kind === 'bet' || a.kind === 'raise') {
      const to = a.to ?? maxTo;
      if (to > maxTo + 1e-9) throw new Error(`Player ${a.player} cannot go to ${to}: the pot-limit maximum is ${maxTo}`);
      if (to < minTo - 1e-9) throw new Error(`Player ${a.player} cannot go to ${to}: the minimum is ${minTo}`);
      after = to;
      lastRaiseSize = to - currentBet;
      currentBet = to;
    } else if (a.kind === 'check' && toCall > 0) throw new Error(`Player ${a.player} cannot check facing a bet`);
    out.push({ player: a.player, kind: a.kind, toCall, maxTo, minTo, after, potAfter: total + (after - mine), working: { potBefore: total, call: toCall, raiseBy: total + toCall } });
    total += after - mine;
    contrib.set(a.player, after);
  }
  return out;
}
