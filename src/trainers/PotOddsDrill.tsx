import { useState } from 'react';
import type { Rng } from '../engine/rng';
import { evCall, potOdds } from '../engine/ev';
import { Figure, Working } from '../components/ui/primitives';
import { num, pct, signed } from '../lib/format';
import { Choices, DrillShell } from './Shell';

interface Round {
  pot: number;
  bet: number;
  equity: number;
  need: number;
  ev: number;
  call: boolean;
}

const FRACTIONS = [0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.5, 2];

function deal(rng: Rng): Round {
  for (;;) {
    const pot = (2 + rng.int(39)) * 5;
    const bet = Math.max(5, Math.round((pot * rng.pick(FRACTIONS)) / 5) * 5);
    const need = potOdds(pot + bet, bet);
    // Equity within 14 points of the threshold, but never a coin flip of under 2 points.
    const delta = (2 + rng.int(13)) * (rng.float() < 0.5 ? -1 : 1);
    const equity = Math.round(need * 100 + delta) / 100;
    if (equity < 0.04 || equity > 0.7 || Math.abs(equity - need) < 0.018) continue;
    return { pot, bet, equity, need, ev: evCall(pot + bet, bet, equity), call: equity > need };
  }
}

export default function PotOddsDrill() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <DrillShell id="pot-odds" generate={deal}>
      {({ round, answered, answer, n }) => (
        <div key={n}>
          <div className="grid grid-cols-3 gap-4">
            <Figure size="lg" value={round.pot} caption="pot before the bet" />
            <Figure size="lg" value={round.bet} caption={`they bet · ${pct(round.bet / round.pot, 0)} pot`} />
            <Figure size="lg" tone="brass" value={pct(round.equity, 0)} caption="your equity" />
          </div>
          <p className="mt-5 text-[14px] text-dim">No more betting after this. Is calling better than folding?</p>
          <div className="mt-4">
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
                  { label: 'Pot you can win', expr: `${round.pot} + ${round.bet}`, result: round.pot + round.bet },
                  { label: 'Equity needed = call / (pot + call)', expr: `${round.bet} / (${round.pot + round.bet} + ${round.bet})`, result: pct(round.need) },
                  { label: 'Your equity against the price', expr: `${pct(round.equity, 0)} vs ${pct(round.need)}`, result: round.call ? 'enough' : 'short' },
                  { label: 'EV of calling', expr: `${num(round.equity, 2)} × ${round.pot + round.bet} − ${num(1 - round.equity, 2)} × ${round.bet}`, result: signed(round.ev, 1) },
                ]}
              />
            </div>
          )}
        </div>
      )}
    </DrillShell>
  );
}
