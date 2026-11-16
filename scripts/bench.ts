import { evaluate7 } from '../src/engine/evaluator7';
import { handVsHand, monteCarloEquity, rangeSpec, rangeVsRangeBoard } from '../src/engine/equity';
import { expandRange, parseRange } from '../src/engine/ranges';
import { parseCards } from '../src/engine/cards';
import { Rng } from '../src/engine/rng';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

{
  const rng = new Rng(1);
  const N = 2_000_000;
  const hands = new Uint8Array(N * 7);
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let n = 0; n < N; n++) {
    for (let i = 0; i < 7; i++) {
      const j = i + rng.int(52 - i);
      const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      hands[n * 7 + i] = deck[i];
    }
  }
  let sink = 0;
  const t0 = performance.now();
  for (let rep = 0; rep < 10; rep++)
    for (let n = 0; n < N; n++) {
      const o = n * 7;
      sink += evaluate7(hands[o], hands[o + 1], hands[o + 2], hands[o + 3], hands[o + 4], hands[o + 5], hands[o + 6]);
    }
  const s = (performance.now() - t0) / 1000;
  console.log(`evaluate7 (random hands):  ${fmt((N * 10) / s)} evals/sec   [checksum ${sink}]`);
}
{
  const r = handVsHand(['AsAh', 'KsKh']);
  console.log(`exact HU preflop:          ${r.boards.toLocaleString()} boards in ${r.ms} ms (${fmt((r.boards * 2) / (r.ms / 1000))} evals/sec)`);
}
{
  const r = monteCarloEquity({ game: 'holdem', players: [rangeSpec('random'), rangeSpec('random')], board: [], iterations: 2_000_000, seed: 1 });
  console.log(`Monte Carlo range v range: ${fmt(r.samples / (r.ms / 1000))} trials/sec`);
}
{
  const r = rangeVsRangeBoard(expandRange(parseRange('random')), expandRange(parseRange('random')), parseCards('Ts7s2d'));
  console.log(`exact range v range, flop: ${r.boards} runouts, ${fmt(r.showdowns)} weighted showdowns in ${r.ms} ms`);
}
