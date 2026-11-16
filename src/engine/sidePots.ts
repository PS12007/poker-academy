export interface PotPlayer {
  /** Total chips this player put in over the whole hand. */
  committed: number;
  folded?: boolean;
  /** Showdown strength, higher wins. Only needed for awarding. */
  rank?: number;
}

export interface Pot {
  amount: number;
  /** Indices of players who can win this pot. */
  eligible: number[];
  /** Per-player contribution cap that defines this layer. */
  cap: number;
}

/**
 * Splits contributions into the main pot and side pots.
 *
 * Sort the distinct commitment levels of players still in the hand. Each level
 * is a layer: everyone (folded or not) pays into the layer up to the level,
 * and only live players who reached that level can win it.
 */
export function buildPots(players: readonly PotPlayer[]): Pot[] {
  const levels = [...new Set(players.filter((p) => !p.folded && p.committed > 0).map((p) => p.committed))].sort(
    (a, b) => a - b,
  );
  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const p of players) amount += Math.max(0, Math.min(p.committed, level) - prev);
    const eligible = players.map((p, i) => (!p.folded && p.committed >= level ? i : -1)).filter((i) => i >= 0);
    if (amount > 0) pots.push({ amount, eligible, cap: level });
    prev = level;
  }
  // Chips committed above the highest live level (dead money from folders) go to the last pot.
  let extra = 0;
  for (const p of players) extra += Math.max(0, p.committed - prev);
  if (extra > 0 && pots.length) pots[pots.length - 1].amount += extra;
  // Merge consecutive pots with identical eligibility (happens when a folder set a level).
  const merged: Pot[] = [];
  for (const pot of pots) {
    const last = merged[merged.length - 1];
    if (last && last.eligible.join() === pot.eligible.join()) {
      last.amount += pot.amount;
      last.cap = pot.cap;
    } else merged.push({ ...pot });
  }
  return merged;
}

/** Awards each pot to the best eligible hand, splitting ties evenly. Returns winnings per player. */
export function awardPots(players: readonly PotPlayer[]): { pots: (Pot & { winners: number[] })[]; payouts: number[] } {
  const payouts = new Array<number>(players.length).fill(0);
  const pots = buildPots(players).map((pot) => {
    const best = Math.max(...pot.eligible.map((i) => players[i].rank ?? 0));
    const winners = pot.eligible.filter((i) => (players[i].rank ?? 0) === best);
    for (const w of winners) payouts[w] += pot.amount / winners.length;
    return { ...pot, winners };
  });
  return { pots, payouts };
}
