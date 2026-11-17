import { HAND_CLASSES } from '../engine/ranges';
import { PAIR_WEIGHTS } from '../engine/pushFold';
import { HAND_ORDER } from '../generated/handOrder';
import { loadEquity169 } from '../generated/equity169';

let E: Float32Array | null = null;

/**
 * Preflop all-in equity of a hand class against the strongest `fraction` of
 * starting hands (ordered by equity against a random hand), using the
 * precomputed 169 x 169 table. Card removal is applied through the exact count
 * of non-conflicting combo pairs. The last class in the range gets a partial weight.
 */
export function equityVsTop(cls: number, fraction: number): number {
  E ??= loadEquity169();
  let need = fraction * 1326, sum = 0, den = 0;
  for (const v of HAND_ORDER) {
    if (need <= 0) break;
    const n = HAND_CLASSES[v].combos.length;
    const w = Math.min(1, need / n);
    need -= n;
    const pw = PAIR_WEIGHTS[cls * 169 + v] * w;
    sum += pw * E[cls * 169 + v];
    den += pw;
  }
  return den ? sum / den : 0.5;
}
