/**
 * Kuhn poker solved by counterfactual regret minimization (CFR).
 *
 * The game: three cards (J, Q, K), two players, each antes 1 and gets one card.
 * Player 1 checks or bets 1. Facing a bet, a player folds or calls. If player 1
 * checks, player 2 may check (showdown) or bet, and then player 1 folds or calls.
 *
 * Histories use p for pass (check or fold) and b for bet (bet or call).
 * An information set is the player's card plus the history, e.g. "Kpb".
 *
 * Known result: the value of the game for player 1 is -1/18.
 */
export const KUHN_CARDS = ['J', 'Q', 'K'] as const;
/** Player 1 acts at "" and "pb". Player 2 acts at "p" and "b". */
export const KUHN_INFOSETS = ['J', 'Q', 'K', 'Jpb', 'Qpb', 'Kpb', 'Jp', 'Qp', 'Kp', 'Jb', 'Qb', 'Kb'] as const;
export type KuhnStrategy = Record<string, number>; // probability of betting / calling at each infoset

const DEALS: [number, number][] = [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]];
const isTerminal = (h: string) => h === 'pp' || h === 'bp' || h === 'bb' || h === 'pbp' || h === 'pbb';

/** Payoff to player 1 at a terminal history. */
function payoff(h: string, c1: number, c2: number): number {
  const win = c1 > c2 ? 1 : -1;
  switch (h) {
    case 'pp': return win;
    case 'bp': return 1;
    case 'pbp': return -1;
    default: return 2 * win; // bb or pbb: showdown for 2
  }
}

/** Expected payoff to player 1 when both players follow fixed strategies. */
export function kuhnValue(s1: KuhnStrategy, s2: KuhnStrategy): number {
  const walk = (h: string, c1: number, c2: number): number => {
    if (isTerminal(h)) return payoff(h, c1, c2);
    const p1 = h.length % 2 === 0;
    const key = KUHN_CARDS[p1 ? c1 : c2] + h;
    const b = (p1 ? s1 : s2)[key];
    return b * walk(h + 'b', c1, c2) + (1 - b) * walk(h + 'p', c1, c2);
  };
  let v = 0;
  for (const [c1, c2] of DEALS) v += walk('', c1, c2) / 6;
  return v;
}

/** Best-response values by trying every pure strategy of the responding player (64 each). */
export function kuhnExploitability(avg: KuhnStrategy): { br1: number; br2: number; exploitability: number } {
  const p1Sets = KUHN_INFOSETS.slice(0, 6), p2Sets = KUHN_INFOSETS.slice(6);
  let br1 = -Infinity, br2 = -Infinity;
  for (let mask = 0; mask < 64; mask++) {
    const pure: KuhnStrategy = { ...avg };
    p1Sets.forEach((k, i) => (pure[k] = (mask >> i) & 1));
    br1 = Math.max(br1, kuhnValue(pure, avg));
    const pure2: KuhnStrategy = { ...avg };
    p2Sets.forEach((k, i) => (pure2[k] = (mask >> i) & 1));
    br2 = Math.max(br2, -kuhnValue(avg, pure2));
  }
  // At equilibrium br1 = value and br2 = -value, so the sum is zero.
  return { br1, br2, exploitability: br1 + br2 };
}

export interface KuhnSnapshot {
  iteration: number;
  /** Average strategy: probability of bet/call at each infoset. */
  strategy: KuhnStrategy;
  exploitability: number;
  /** Value of the average strategy profile for player 1. */
  value: number;
}

export interface KuhnResult {
  snapshots: KuhnSnapshot[];
  final: KuhnSnapshot;
  iterations: number;
}

/**
 * Vanilla CFR with full traversal of all six deals each iteration.
 * `plus` switches on CFR+ (regrets floored at zero, linear averaging), which converges faster.
 */
export function solveKuhn(iterations: number, plus = false, snapshotCount = 60): KuhnResult {
  const regret: Record<string, [number, number]> = {};
  const stratSum: Record<string, [number, number]> = {};
  for (const k of KUHN_INFOSETS) {
    regret[k] = [0, 0];
    stratSum[k] = [0, 0];
  }
  const current = (k: string): [number, number] => {
    const [rp, rb] = regret[k];
    const a = Math.max(rp, 0), b = Math.max(rb, 0);
    return a + b > 0 ? [a / (a + b), b / (a + b)] : [0.5, 0.5];
  };

  // Returns the value for the player to act at h. p0 and p1 are reach probabilities.
  const cfr = (h: string, c: [number, number], p0: number, p1: number, weight: number): number => {
    const player = h.length % 2;
    if (isTerminal(h)) {
      const v = payoff(h, c[0], c[1]);
      return player === 0 ? v : -v;
    }
    const key = KUHN_CARDS[c[player]] + h;
    const s = current(key);
    const util: [number, number] = [0, 0];
    let node = 0;
    for (let a = 0; a < 2; a++) {
      const next = h + (a === 0 ? 'p' : 'b');
      util[a] = player === 0 ? -cfr(next, c, p0 * s[a], p1, weight) : -cfr(next, c, p0, p1 * s[a], weight);
      node += s[a] * util[a];
    }
    const mine = player === 0 ? p0 : p1, theirs = player === 0 ? p1 : p0;
    for (let a = 0; a < 2; a++) {
      regret[key][a] += theirs * (util[a] - node);
      if (plus && regret[key][a] < 0) regret[key][a] = 0;
      stratSum[key][a] += weight * mine * s[a];
    }
    return node;
  };

  const average = (): KuhnStrategy => {
    const out: KuhnStrategy = {};
    for (const k of KUHN_INFOSETS) {
      const [p, b] = stratSum[k];
      out[k] = p + b > 0 ? b / (p + b) : 0.5;
    }
    return out;
  };

  const marks = new Set<number>();
  for (let i = 0; i < snapshotCount; i++) marks.add(Math.max(1, Math.round(Math.pow(iterations, (i + 1) / snapshotCount))));
  marks.add(iterations);

  const snapshots: KuhnSnapshot[] = [];
  for (let t = 1; t <= iterations; t++) {
    for (const d of DEALS) cfr('', d, 1, 1, plus ? t : 1);
    if (marks.has(t)) {
      const strategy = average();
      snapshots.push({ iteration: t, strategy, exploitability: kuhnExploitability(strategy).exploitability, value: kuhnValue(strategy, strategy) });
    }
  }
  return { snapshots, final: snapshots[snapshots.length - 1], iterations };
}
