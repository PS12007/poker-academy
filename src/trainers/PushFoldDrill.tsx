import { useState } from 'react';
import type { Rng } from '../engine/rng';
import { HAND_CLASSES, type HandClass } from '../engine/ranges';
import { PUSH_FOLD_CHARTS, PUSH_FOLD_STACKS } from '../generated/pushFoldCharts';
import { Hand } from '../components/cards/PlayingCard';
import { RangeGrid } from '../components/range/RangeGrid';
import { pct } from '../lib/format';
import { Choices, DrillShell } from './Shell';

interface Round {
  stack: number;
  role: 'sb' | 'bb';
  hand: HandClass;
  cards: number[];
  freq: number;
  chart: Float32Array;
}

function deal(rng: Rng): Round {
  for (;;) {
    const stack = rng.pick(PUSH_FOLD_STACKS);
    const role = rng.float() < 0.55 ? 'sb' : 'bb';
    const chart = Float32Array.from(PUSH_FOLD_CHARTS[stack][role === 'sb' ? 'jam' : 'call']);
    const hand = rng.pick(HAND_CLASSES);
    const freq = chart[hand.index];
    // Skip hands the solver mixes, and most of the obvious ones, so rounds sit near the edge of the range.
    if (freq > 0.15 && freq < 0.85) continue;
    const near = HAND_CLASSES.some((h) => Math.abs(h.hi - hand.hi) + Math.abs(h.lo - hand.lo) <= 2 && h.kind === hand.kind && (chart[h.index] >= 0.5) !== (freq >= 0.5));
    if (!near && rng.float() < 0.7) continue;
    const combo = rng.pick(hand.combos);
    return { stack, role, hand, cards: [combo[0], combo[1]], freq, chart };
  }
}

function Entry({ round, answered, answer }: { round: Round; answered: boolean; answer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const aggressive = round.role === 'sb' ? 'jam' : 'call';
  const right = round.freq >= 0.5 ? aggressive : 'fold';
  return (
    <div>
      <p className="text-[17px]">
        Heads-up, {round.stack} big blinds each, no ante.{' '}
        {round.role === 'sb' ? 'You are on the small blind and it is your move.' : 'The small blind moves all-in. You are in the big blind.'}
      </p>
      <div className="mt-5 flex items-end gap-4">
        <Hand cards={round.cards} size="xl" />
        <span className="display-i pb-2 text-[30px]">{round.hand.name}</span>
      </div>
      <div className="mt-6">
        <Choices
          options={[{ value: aggressive, label: round.role === 'sb' ? 'All-in' : 'Call' }, { value: 'fold', label: 'Fold' }]}
          disabled={answered}
          picked={picked}
          correctValue={right}
          onPick={(v) => {
            setPicked(v);
            answer(v === right);
          }}
        />
      </div>
      {answered && (
        <div className="mt-6 grid gap-5 border-t border-bone/15 pt-4 md:grid-cols-[minmax(0,340px)_1fr]">
          <RangeGrid range={round.chart} compact highlight={[round.hand.index]} label={`${round.role === 'sb' ? 'Jamming' : 'Calling'} range at ${round.stack}bb`} />
          <div className="text-[14px] leading-relaxed text-dim">
            <p>
              At equilibrium {round.hand.name} {round.role === 'sb' ? 'jams' : 'calls'} {pct(round.freq, 0)} of the time at {round.stack}bb.
              Filled cells are the {round.role === 'sb' ? 'jamming' : 'calling'} range, and your hand is outlined.
            </p>
            <p className="mt-3">
              {round.role === 'sb'
                ? 'The jammer wins two ways: everyone folds, or the hand holds up. That is why the jamming range is wide.'
                : 'The caller only wins at showdown against a range that already threw away its worst hands, so the calling range is narrower than the jamming range.'}
            </p>
            <p className="mt-3 text-[12.5px] text-faint">Charts precomputed by the course's push/fold solver (fictitious play, exploitability under 0.001bb).</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PushFoldDrill() {
  return (
    <DrillShell id="push-fold" generate={deal}>
      {({ round, answered, answer, n }) => <Entry key={n} round={round} answered={answered} answer={answer} />}
    </DrillShell>
  );
}
