/**
 * Independent Chip Model (Malmuth-Harville).
 *
 * The probability that a player finishes first is their share of the chips.
 * Given who finished first, the remaining places are assigned the same way
 * among the remaining players, recursively. A player's prize equity is the sum
 * over finishing places of P(place) x payout(place).
 */

/** Probability of each player finishing in each place: result[player][place]. */
export function finishProbabilities(stacks: readonly number[], places = stacks.length): number[][] {
  const n = stacks.length;
  const out = Array.from({ length: n }, () => new Array<number>(places).fill(0));
  const memo = new Map<number, number[][]>();

  // For a set of remaining players (bitmask) and the next place to fill, return per-player probabilities for places k..places-1.
  const rec = (mask: number, k: number): number[][] => {
    if (k >= places || mask === 0) return [];
    const key = mask * 16 + k;
    const hit = memo.get(key);
    if (hit) return hit;
    let total = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) total += stacks[i];
    const res = Array.from({ length: n }, () => new Array<number>(places - k).fill(0));
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i)) || stacks[i] <= 0) continue;
      const p = total > 0 ? stacks[i] / total : 0;
      if (p === 0) continue;
      res[i][0] += p;
      const sub = rec(mask & ~(1 << i), k + 1);
      for (let j = 0; j < n; j++) for (let q = 0; q < sub[j]?.length; q++) res[j][q + 1] += p * sub[j][q];
    }
    memo.set(key, res);
    return res;
  };

  let alive = 0;
  for (let i = 0; i < n; i++) if (stacks[i] > 0) alive |= 1 << i;
  const r = rec(alive, 0);
  for (let i = 0; i < n; i++) for (let q = 0; q < places; q++) out[i][q] = r[i]?.[q] ?? 0;
  // Busted players take the last places in an unspecified order. They are given no prize equity.
  return out;
}

/** Prize equity of each player. Payouts are listed from first place down. */
export function icmEquity(stacks: readonly number[], payouts: readonly number[]): number[] {
  if (stacks.length > 12) throw new Error('ICM is limited to 12 players here');
  const places = Math.min(payouts.length, stacks.length);
  const probs = finishProbabilities(stacks, places);
  return probs.map((row) => row.reduce((s, p, q) => s + p * payouts[q], 0));
}

export interface ShoveSpot {
  stacks: number[];
  payouts: number[];
  /** Index of the player who shoves and of the player deciding to call. */
  shover: number;
  caller: number;
  /** Chips already in the pot from other players (blinds, antes) that are not part of either stack below. */
  dead?: number;
}

export interface CallDecision {
  /** Caller's prize equity if they fold. */
  foldEquity: number;
  /** Caller's prize equity if they call and win, and if they call and lose. */
  winEquity: number;
  loseEquity: number;
  /** Chip equity the caller needs to make calling at least as good as folding, under ICM. */
  requiredEquity: number;
  /** The same requirement in chips (pot odds), ignoring ICM. */
  chipRequired: number;
  /** Bubble factor = cost of losing / gain from winning, in prize equity. */
  bubbleFactor: number;
}

/**
 * Should the caller call an all-in? Compares prize equity after folding with the
 * expected prize equity after calling, as a function of the caller's chance of winning.
 * Stacks are given as they stand when the decision is made, with the shover's
 * chips already counted in the shover's stack (not yet in the pot).
 */
export function callDecision(spot: ShoveSpot): CallDecision {
  const { stacks, payouts, shover, caller } = spot;
  const dead = spot.dead ?? 0;
  const risk = Math.min(stacks[shover], stacks[caller]);

  const fold = [...stacks];
  fold[shover] += dead;
  const win = [...stacks];
  win[caller] += risk + dead;
  win[shover] -= risk;
  const lose = [...stacks];
  lose[shover] += risk + dead;
  lose[caller] -= risk;

  const foldEquity = icmEquity(fold, payouts)[caller];
  const winEquity = icmEquity(win, payouts)[caller];
  const loseEquity = icmEquity(lose, payouts)[caller];
  const gain = winEquity - foldEquity;
  const cost = foldEquity - loseEquity;
  return {
    foldEquity,
    winEquity,
    loseEquity,
    requiredEquity: cost / (gain + cost),
    chipRequired: risk / (2 * risk + dead),
    bubbleFactor: cost / gain,
  };
}
