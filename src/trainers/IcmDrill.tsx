import { useState } from 'react';
import type { Rng } from '../engine/rng';
import { callDecision, type CallDecision } from '../engine/icm';
import { loadEquity169 } from '../generated/equity169';
import { HAND_ORDER } from '../generated/handOrder';
import { HAND_CLASSES } from '../engine/ranges';
import { PAIR_WEIGHTS } from '../engine/pushFold';
import { Hand } from '../components/cards/PlayingCard';
import { Working } from '../components/ui/primitives';
import { int, num, pct } from '../lib/format';
import { Choices, DrillShell } from './Shell';

let E: Float32Array | null = null;

/** Equity of one hand class against the top `frac` of hands (by HAND_ORDER), with card removal. */
function equityVsTop(cls: number, frac: number): number {
  E ??= loadEquity169();
  let need = frac * 1326, sum = 0, den = 0;
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

interface Round {
  names: string[];
  stacks: number[];
  payouts: number[];
  blind: number;
  shoveRange: number;
  hand: number;
  cards: number[];
  d: CallDecision;
  equity: number;
  call: boolean;
}

const STRUCTURES = [
  { left: 4, payouts: [50, 30, 20] },
  { left: 3, payouts: [65, 35] },
  { left: 5, payouts: [40, 25, 20, 15] },
];

function deal(rng: Rng): Round {
  for (;;) {
    const s = rng.pick(STRUCTURES);
    const blind = 200;
    const stacks = Array.from({ length: s.left }, () => (5 + rng.int(36)) * blind);
    const names = ['Ana', 'Ben', 'Cho', 'Dev', 'Eli'].slice(0, s.left);
    // Shover is the chip leader or a random player; caller is the big blind (index 1).
    const shover = 0;
    const caller = 1;
    if (stacks[shover] < stacks[caller] * 0.6) stacks[shover] = stacks[caller] + (2 + rng.int(10)) * blind;
    const dead = blind * 1.5;
    stacks[caller] -= blind; // big blind already posted, it is part of the dead money now
    const d = callDecision({ stacks, payouts: s.payouts, shover, caller, dead });
    const shoveRange = rng.pick([0.25, 0.4, 0.55, 0.7]);
    const hand = HAND_ORDER[Math.floor(rng.float() * 70)];
    const equity = equityVsTop(hand, shoveRange);
    if (Math.abs(equity - d.requiredEquity) < 0.015) continue;
    const combo = rng.pick(HAND_CLASSES[hand].combos);
    return { names, stacks, payouts: s.payouts, blind, shoveRange, hand, cards: [combo[0], combo[1]], d, equity, call: equity > d.requiredEquity };
  }
}

export default function IcmDrill() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <DrillShell id="icm" generate={deal}>
      {({ round, answered, answer, n }) => (
        <div key={n}>
          <p className="text-[15px] text-dim">
            {round.names.length} players left, paying {round.payouts.join(' / ')}. Blinds {round.blind / 2}/{round.blind}. {round.names[0]} moves all-in
            with the top {pct(round.shoveRange, 0)} of hands. You are {round.names[1]} in the big blind.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-5">
            {round.names.map((nm, i) => (
              <div key={nm} className={i === 1 ? 'text-madder' : ''}>
                <div className="label">{nm}{i === 0 ? ' · shoves' : i === 1 ? ' · you' : ''}</div>
                <div className="num text-[15px]">{int(round.stacks[i])}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-end gap-4">
            <Hand cards={round.cards} size="xl" />
            <span className="display-i pb-2 text-[30px]">{HAND_CLASSES[round.hand].name}</span>
          </div>
          <div className="mt-6">
            <Choices
              options={[{ value: 'call', label: 'Call' }, { value: 'fold', label: 'Fold' }]}
              disabled={answered}
              picked={picked}
              correctValue={round.call ? 'call' : 'fold'}
              onPick={(v) => {
                setPicked(v);
                answer((v === 'call') === round.call);
              }}
            />
          </div>
          {answered && (
            <div className="mt-6">
              <Working
                steps={[
                  { label: `${HAND_CLASSES[round.hand].name} against the top ${pct(round.shoveRange, 0)}`, expr: 'from the 169 × 169 equity table, card removal included', result: pct(round.equity) },
                  { label: 'Needed in chips alone', expr: 'risk / (2 × risk + dead)', result: pct(round.d.chipRequired) },
                  { label: 'Needed under ICM', expr: `bubble factor ${num(round.d.bubbleFactor, 2)}`, result: pct(round.d.requiredEquity) },
                  { label: 'Decision', expr: `${pct(round.equity)} against ${pct(round.d.requiredEquity)}`, result: round.call ? 'call' : 'fold' },
                ]}
              />
              {round.call !== round.equity > round.d.chipRequired && (
                <p className="mt-3 text-[13px] text-brass">This is a spot where ICM changes the answer: a chip-EV player would {round.call ? 'fold' : 'call'}.</p>
              )}
            </div>
          )}
        </div>
      )}
    </DrillShell>
  );
}
