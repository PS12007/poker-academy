import { Rng } from './rng';

export interface VarianceInput {
  /** True winrate in big blinds per 100 hands. */
  winrate: number;
  /** Standard deviation in big blinds per 100 hands. Roughly 75 to 100 for six-max no-limit. */
  stdDev: number;
  /** Total hands to simulate. */
  hands: number;
  /** Number of independent bankroll paths. */
  paths: number;
  /** Starting bankroll in big blinds. Ruin is the path touching zero. */
  bankroll: number;
  seed: number;
  /** Points kept per path for drawing. */
  resolution?: number;
}

export interface VarianceResult {
  /** x axis: hands played at each kept point. */
  x: number[];
  /** A sample of paths for drawing, as winnings in big blinds from zero. */
  samplePaths: number[][];
  /** Percentile curves of winnings over time. */
  bands: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] };
  /** Final winnings of every path, sorted. */
  finals: number[];
  expected: number;
  /** Standard deviation of the final result: stdDev x sqrt(hands / 100). */
  finalStdDev: number;
  /** Fraction of paths that finished below zero. */
  probLoss: number;
  /** Fraction of paths whose bankroll touched zero. */
  riskOfRuinSim: number;
  /** Closed-form risk of ruin over an infinite horizon: exp(-2 x winrate x bankroll / stdDev^2). */
  riskOfRuinFormula: number;
  /** Median and 95th percentile of the deepest peak-to-trough drop, in big blinds. */
  drawdown: { median: number; p95: number; worst: number };
  /** Median and 95th percentile of the longest stretch without a new high, in hands. */
  breakeven: { median: number; p95: number; worst: number };
  seed: number;
  paths: number;
}

/**
 * Risk of ruin for a player with a positive winrate and a fixed bankroll who
 * never moves down in stakes, over an unlimited number of hands.
 * Derived from the Brownian-motion approximation of the bankroll.
 */
export function riskOfRuin(winrate: number, stdDev: number, bankroll: number): number {
  if (winrate <= 0) return 1;
  return Math.exp((-2 * winrate * bankroll) / (stdDev * stdDev));
}

/** Bankroll in big blinds needed for a target risk of ruin: -(stdDev^2 / (2 x winrate)) x ln(risk). */
export function bankrollForRisk(winrate: number, stdDev: number, risk: number): number {
  if (winrate <= 0) return Infinity;
  return (-(stdDev * stdDev) / (2 * winrate)) * Math.log(risk);
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];

/**
 * Simulates bankroll paths in blocks of 100 hands. Each block's result is drawn
 * from a normal distribution with the given mean and standard deviation, which
 * is accurate at this block size by the central limit theorem.
 */
export function simulateVariance(input: VarianceInput): VarianceResult {
  const { winrate, stdDev, hands, paths, bankroll, seed } = input;
  const blocks = Math.max(1, Math.round(hands / 100));
  const res = Math.min(input.resolution ?? 120, blocks);
  const rng = new Rng(seed);
  const keepEvery = blocks / res;
  const x: number[] = Array.from({ length: res + 1 }, (_, i) => Math.round(i * keepEvery) * 100);
  const columns: number[][] = Array.from({ length: res + 1 }, () => []);
  const samplePaths: number[][] = [];
  const finals: number[] = [];
  const drawdowns: number[] = [];
  const stretches: number[] = [];
  let ruined = 0, losses = 0;

  for (let p = 0; p < paths; p++) {
    let total = 0, peak = 0, maxDd = 0, sincePeak = 0, longest = 0;
    let broke = false;
    const kept: number[] = [0];
    let nextKeep = 1;
    for (let b = 1; b <= blocks; b++) {
      total += winrate + stdDev * rng.normal();
      if (total > peak) {
        peak = total;
        sincePeak = 0;
      } else {
        sincePeak++;
        if (sincePeak > longest) longest = sincePeak;
        if (peak - total > maxDd) maxDd = peak - total;
      }
      if (!broke && bankroll + total <= 0) broke = true;
      while (nextKeep <= res && b >= Math.round(nextKeep * keepEvery)) {
        kept.push(total);
        nextKeep++;
      }
    }
    while (kept.length < res + 1) kept.push(total);
    for (let i = 0; i <= res; i++) columns[i].push(kept[i]);
    if (p < 24) samplePaths.push(kept);
    finals.push(total);
    drawdowns.push(maxDd);
    stretches.push(longest * 100);
    if (broke) ruined++;
    if (total < 0) losses++;
  }

  const band = (q: number) => columns.map((col) => quantile([...col].sort((a, b) => a - b), q));
  finals.sort((a, b) => a - b);
  drawdowns.sort((a, b) => a - b);
  stretches.sort((a, b) => a - b);
  return {
    x,
    samplePaths,
    bands: { p5: band(0.05), p25: band(0.25), p50: band(0.5), p75: band(0.75), p95: band(0.95) },
    finals,
    expected: winrate * blocks,
    finalStdDev: stdDev * Math.sqrt(blocks),
    probLoss: losses / paths,
    riskOfRuinSim: ruined / paths,
    riskOfRuinFormula: riskOfRuin(winrate, stdDev, bankroll),
    drawdown: { median: quantile(drawdowns, 0.5), p95: quantile(drawdowns, 0.95), worst: drawdowns[drawdowns.length - 1] },
    breakeven: { median: quantile(stretches, 0.5), p95: quantile(stretches, 0.95), worst: stretches[stretches.length - 1] },
    seed,
    paths,
  };
}
