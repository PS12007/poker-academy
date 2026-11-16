import { useState } from 'react';
import type { Rng } from '../engine/rng';
import { HAND_CLASSES, parseRange, type HandClass } from '../engine/ranges';
import { openRange, POSITION_NAMES, VS_OPEN, type Position } from '../engine/teachingRanges';
import { Hand } from '../components/cards/PlayingCard';
import { RangeGrid } from '../components/range/RangeGrid';
import { Choices, DrillShell } from './Shell';

type Action = 'raise' | 'call' | 'fold';
interface Round {
  hand: HandClass;
  cards: number[];
  title: string;
  detail: string;
  options: Action[];
  answer: Action;
  /** Ranges to display afterwards: raise and call. */
  raise: Float32Array;
  call: Float32Array | null;
}

const FACING: [string, string, string][] = [
  ['IP-vs-early', 'Under the gun raises to 2.5bb. You are on the button.', 'Button, facing an early open'],
  ['IP-vs-late', 'The cutoff raises to 2.5bb. You are on the button.', 'Button, facing a cutoff open'],
  ['BB-vs-early', 'Under the gun raises to 2.5bb. Everyone folds to you in the big blind.', 'Big blind, facing an early open'],
  ['BB-vs-late', 'The button raises to 2.5bb. The small blind folds. You are in the big blind.', 'Big blind, facing a button open'],
];

function deal(rng: Rng): Round {
  for (;;) {
    const facing = rng.float() < 0.45;
    let raise: Float32Array, call: Float32Array | null = null, title: string, detail: string;
    if (facing) {
      const [key, d, t] = rng.pick(FACING);
      const f = VS_OPEN[key];
      raise = parseRange(`${f.value}, ${f.bluff}`);
      call = parseRange(f.call);
      title = t;
      detail = d;
    } else {
      const pos = rng.pick(['UTG', 'HJ', 'CO', 'BTN', 'SB'] as Exclude<Position, 'BB'>[]);
      raise = openRange(pos);
      title = POSITION_NAMES[pos];
      detail = `Everyone folds to you ${pos === 'SB' ? 'in the small blind' : pos === 'BTN' ? 'on the button' : `in the ${POSITION_NAMES[pos].toLowerCase()} seat`}.`;
    }
    // Sample by combos, then keep hands near the boundary more often than obvious ones.
    const hand = rng.pick(HAND_CLASSES);
    const inRange = raise[hand.index] > 0 || (call?.[hand.index] ?? 0) > 0;
    const trivial = (!inRange && hand.hi < 8 && hand.kind === 'offsuit') || (hand.kind === 'pair' && hand.hi > 9);
    if (trivial && rng.float() < 0.85) continue;
    const combo = rng.pick(hand.combos);
    const answer: Action = raise[hand.index] > 0 ? 'raise' : call && call[hand.index] > 0 ? 'call' : 'fold';
    return { hand, cards: [combo[0], combo[1]], title, detail, options: facing ? ['raise', 'call', 'fold'] : ['raise', 'fold'], answer, raise, call };
  }
}

export default function PreflopDrill() {
  const [picked, setPicked] = useState<Action | null>(null);
  return (
    <DrillShell id="preflop" generate={deal}>
      {({ round, answered, answer, n }) => {
        const heat = new Float32Array(169).fill(NaN);
        const all = new Float32Array(169);
        for (let i = 0; i < 169; i++) {
          if (round.raise[i] > 0) { heat[i] = 1; all[i] = 1; }
          else if (round.call && round.call[i] > 0) { heat[i] = 0.12; all[i] = 1; }
        }
        return (
          <div key={n}>
            <div className="label text-madder">{round.title}</div>
            <p className="mt-1 text-[17px]">{round.detail}</p>
            <div className="mt-5 flex items-end gap-5">
              <Hand cards={round.cards} size="xl" />
              <span className="display-i pb-2 text-[34px]">{round.hand.name}</span>
            </div>
            <div className="mt-6">
              <Choices
                options={round.options.map((o) => ({ value: o, label: o === 'raise' ? (round.call ? '3-bet' : 'Raise') : o === 'call' ? 'Call' : 'Fold' }))}
                disabled={answered}
                picked={picked}
                correctValue={round.answer}
                onPick={(v) => {
                  setPicked(v);
                  answer(v === round.answer);
                }}
              />
            </div>
            {answered && (
              <div className="mt-6 grid gap-5 border-t border-bone/15 pt-4 md:grid-cols-[minmax(0,340px)_1fr]">
                <RangeGrid range={all} heat={heat} compact highlight={[round.hand.index]} label="Teaching range for this spot" />
                <p className="text-[14px] leading-relaxed text-dim">
                  Red cells {round.call ? '3-bet' : 'raise'}{round.call ? ', blue cells call' : ''}, blank cells fold. Your hand is outlined. These are the course's
                  simplified teaching ranges, not solver output. Close hands near the edge of a range are close in value too, so
                  getting those wrong costs little. Getting the clear ones wrong costs a lot.
                </p>
              </div>
            )}
          </div>
        );
      }}
    </DrillShell>
  );
}
