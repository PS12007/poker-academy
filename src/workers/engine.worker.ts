import * as Comlink from 'comlink';
import {
  classEquities, computeEquity, equityByNextCard, rangeVsRangeBoard,
  type EquityRequest, type EquityResult, type NextCardEquity, type ProgressFn,
} from '../engine/equity';
import type { WeightedCombo } from '../engine/ranges';
import { fiveCardCategoryCounts } from '../engine/combinatorics';
import { solveKuhn, type KuhnResult } from '../engine/cfr/kuhn';
import { solvePushFold, type PushFoldInput, type PushFoldResult } from '../engine/pushFold';
import { loadEquity169 } from '../generated/equity169';
import { simulateVariance, type VarianceInput, type VarianceResult } from '../engine/variance';

let equity169: Float32Array | null = null;

const api = {
  kuhn(iterations: number, plus: boolean): KuhnResult {
    return solveKuhn(iterations, plus);
  },
  pushFold(input: PushFoldInput): PushFoldResult {
    equity169 ??= loadEquity169();
    return solvePushFold(equity169, input);
  },
  equity(req: EquityRequest, onProgress?: ProgressFn): EquityResult {
    let last = 0;
    return computeEquity(
      req,
      onProgress
        ? (f) => {
            const now = Date.now();
            if (now - last > 60 || f >= 1) {
              last = now;
              onProgress(f);
            }
          }
        : undefined,
    );
  },
  equityByNextCard(req: EquityRequest): NextCardEquity[] {
    return equityByNextCard(req);
  },
  rangeVsRange(hero: WeightedCombo[], villain: WeightedCombo[], board: number[], dead: number[] = []) {
    const r = rangeVsRangeBoard(hero, villain, board, dead);
    return { ...r, heroClasses: classEquities(r.hero) };
  },
  fiveCardCounts(): { counts: number[]; ms: number } {
    const t0 = Date.now();
    const counts = fiveCardCategoryCounts();
    return { counts, ms: Date.now() - t0 };
  },
  variance(input: VarianceInput): VarianceResult {
    return simulateVariance(input);
  },
};

export type EngineApi = typeof api;
Comlink.expose(api);
