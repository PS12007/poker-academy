import { Category, categoryOf, evaluate } from './evalCore';
import { canonicalKey } from './cards';

/** Binomial coefficient C(n, k). Exact for the sizes used in poker. */
export function nCr(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/**
 * Hypergeometric: probability of drawing exactly `hits` successes when drawing
 * `draws` cards from `population` cards of which `successes` are successes.
 */
export function hypergeom(population: number, successes: number, draws: number, hits: number): number {
  return (nCr(successes, hits) * nCr(population - successes, draws - hits)) / nCr(population, draws);
}

/** Probability of hitting at least one of `outs` in `cardsToCome` cards from `unseen` unseen cards. */
export function probHitOuts(outs: number, unseen: number, cardsToCome: number): number {
  return 1 - nCr(unseen - outs, cardsToCome) / nCr(unseen, cardsToCome);
}

export interface OutsOdds {
  outs: number;
  /** Flop to turn: outs / 47. */
  nextCardFromFlop: number;
  /** Turn to river: outs / 46. */
  nextCardFromTurn: number;
  /** Flop to river, at least one hit in two cards. */
  byRiverFromFlop: number;
  /** Rule of 2: outs x 2, as a probability. */
  rule2: number;
  /** Rule of 4: outs x 4, as a probability. */
  rule4: number;
  /** Corrected rule for big draws: 4 x outs - (outs - 8) when outs > 8. */
  rule4Corrected: number;
}

export function outsOdds(outs: number): OutsOdds {
  return {
    outs,
    nextCardFromFlop: outs / 47,
    nextCardFromTurn: outs / 46,
    byRiverFromFlop: probHitOuts(outs, 47, 2),
    rule2: (outs * 2) / 100,
    rule4: (outs * 4) / 100,
    rule4Corrected: (outs > 8 ? outs * 4 - (outs - 8) : outs * 4) / 100,
  };
}

/**
 * Runner-runner: probability that both the turn and river come from the needed set.
 * `first` outs on the turn (of 47 unseen), then `second` outs on the river (of 46).
 * Backdoor flush with three of a suit on the flop: 10/47 x 9/46.
 */
export function runnerRunner(first: number, second: number): number {
  return (first / 47) * (second / 46);
}

/** Converts a probability to odds against, e.g. 0.2 gives 4 (4 to 1). */
export function oddsAgainst(p: number): number {
  return (1 - p) / p;
}

export interface StartingHandFacts {
  totalCombos: number;
  distinctHands: number;
  pairCombos: number;
  suitedCombos: number;
  offsuitCombos: number;
  pPair: number;
  pAces: number;
  pSuited: number;
}

/** Hold'em starting hand facts, counted by enumerating all two-card combos. */
export function holdemStartingHandFacts(): StartingHandFacts {
  let total = 0, pairs = 0, suited = 0, aces = 0;
  const classes = new Set<string>();
  for (let a = 0; a < 52; a++) {
    for (let b = a + 1; b < 52; b++) {
      total++;
      const ra = a >> 2, rb = b >> 2;
      if (ra === rb) {
        pairs++;
        if (ra === 12) aces++;
      } else if ((a & 3) === (b & 3)) suited++;
      classes.add(canonicalKey([a, b]));
    }
  }
  return {
    totalCombos: total,
    distinctHands: classes.size,
    pairCombos: 6,
    suitedCombos: 4,
    offsuitCombos: 12,
    pPair: pairs / total,
    pAces: aces / total,
    pSuited: suited / total,
  };
}

/** P(flop contains at least one of your two set cards) holding a pocket pair. */
export function probFlopSetOrBetter(): number {
  return probHitOuts(2, 50, 3);
}

/** P(flop is three of your suit) holding two suited cards. */
export function probFlopFlush(): number {
  return hypergeom(50, 11, 3, 3);
}

/** P(board holds 3+ of your suit by the river) holding two suited cards. */
export function probFlushByRiver(): number {
  return hypergeom(50, 11, 5, 3) + hypergeom(50, 11, 5, 4) + hypergeom(50, 11, 5, 5);
}

/** P(flop pairs at least one hole card) holding two unpaired cards. */
export function probFlopPairOrBetterUnpaired(): number {
  return probHitOuts(6, 50, 3);
}

/** Counts 5-card hands per category by full enumeration: C(52,5) = 2,598,960 hands. */
export function fiveCardCategoryCounts(): number[] {
  const counts = new Array<number>(9).fill(0);
  const h = [0, 0, 0, 0, 0];
  for (let a = 0; a < 48; a++)
    for (let b = a + 1; b < 49; b++)
      for (let c = b + 1; c < 50; c++)
        for (let d = c + 1; d < 51; d++)
          for (let e = d + 1; e < 52; e++) {
            h[0] = a; h[1] = b; h[2] = c; h[3] = d; h[4] = e;
            counts[categoryOf(evaluate(h))]++;
          }
  return counts;
}

/** Exact 5-card category frequencies, indexed by Category. The enumeration reproduces them. */
export const FIVE_CARD_COUNTS: readonly number[] = (() => {
  const c = new Array<number>(9).fill(0);
  c[Category.StraightFlush] = 40;
  c[Category.Quads] = 624;
  c[Category.FullHouse] = 3744;
  c[Category.Flush] = 5108;
  c[Category.Straight] = 10200;
  c[Category.Trips] = 54912;
  c[Category.TwoPair] = 123552;
  c[Category.Pair] = 1098240;
  c[Category.HighCard] = 1302540;
  return c;
})();

/** Omaha starting hand counts: C(52,4) raw and the number of classes under suit relabeling. */
export function omahaStartingHandCounts(): { total: number; distinct: number } {
  const seen = new Set<string>();
  let total = 0;
  for (let a = 0; a < 49; a++)
    for (let b = a + 1; b < 50; b++)
      for (let c = b + 1; c < 51; c++)
        for (let d = c + 1; d < 52; d++) {
          total++;
          seen.add(canonicalKey([a, b, c, d]));
        }
  return { total, distinct: seen.size };
}
