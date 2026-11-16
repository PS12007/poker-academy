import { useState } from 'react';
import { evCall, evCallImplied, impliedOddsNeeded, potOdds } from '../engine/ev';
import { alpha, bluffFraction, mdf } from '../engine/theory';
import { Figure, NumberField, Plate, Slider, Working } from '../components/ui/primitives';
import { num, pct, signed } from '../lib/format';

export interface PotOddsProps {
  initial?: { pot?: number; bet?: number; equity?: number };
  embedded?: boolean;
}

export default function PotOddsCalculator({ initial, embedded }: PotOddsProps) {
  const [potBefore, setPotBefore] = useState(initial?.pot ?? 100);
  const [bet, setBet] = useState(initial?.bet ?? 50);
  const [equity, setEquity] = useState(initial?.equity ?? 30);
  const [extra, setExtra] = useState(0);

  const ok = potBefore > 0 && bet > 0;
  const pot = potBefore + bet; // what is in the middle when the decision arrives
  const need = potOdds(pot, bet);
  const eq = equity / 100;
  const ev = evCall(pot, bet, eq);
  const evI = evCallImplied(pot, bet, eq, extra);
  const implied = impliedOddsNeeded(pot, bet, eq);
  const call = evI >= 0;

  return (
    <div className={embedded ? 'space-y-6' : 'grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]'}>
      <Plate serial="IN" title="The bet">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <NumberField label="Pot before the bet" value={potBefore} onChange={setPotBefore} min={0} />
            <NumberField label="Bet you face" value={bet} onChange={setBet} min={0} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[[0.25, '¼ pot'], [0.33, '⅓'], [0.5, '½'], [0.75, '¾'], [1, 'Pot'], [1.5, '1.5×'], [2, '2×']].map(([f, l]) => (
              <button key={l} type="button" className="btn btn-sm" onClick={() => setBet(Math.round(potBefore * (f as number) * 100) / 100)}>{l}</button>
            ))}
          </div>
          <Slider label="Your equity when called" min={0} max={100} step={0.5} value={equity} onChange={setEquity} format={(v) => `${v}%`} />
          <NumberField label="Extra you expect to win later when you hit" value={extra} onChange={setExtra} min={0} />
        </div>
      </Plate>

      {!ok ? (
        <Plate serial="OUT" title="Result"><p className="text-dim">Enter a pot and a bet larger than zero.</p></Plate>
      ) : (
        <div className="space-y-6">
          <Plate serial="OUT" title="As the caller">
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Figure size="lg" tone="madder" value={pct(need)} caption={`equity needed · ${num(pot / bet, 2)} to 1`} />
              <Figure size="md" tone={ev >= 0 ? 'verd' : undefined} value={signed(ev)} caption="EV of calling, no more betting" />
              <div>
                <div className={`display-i text-[40px] ${call ? 'text-verd' : 'text-dim'}`}>{call ? 'Call' : 'Fold'}</div>
                <div className="label mt-2">{call ? (ev >= 0 ? 'profitable on direct odds' : 'profitable only with the implied money') : implied > 0 ? `needs ${num(implied)} more on later streets` : ''}</div>
              </div>
            </div>
            <div className="mt-6">
              <Working
                steps={[
                  { label: 'Pot when you act (pot + their bet)', expr: `${num(potBefore)} + ${num(bet)}`, result: num(pot) },
                  { label: 'Equity needed = call / (pot + call)', expr: `${num(bet)} / (${num(pot)} + ${num(bet)})`, result: pct(need, 2) },
                  { label: 'EV = equity × pot − (1 − equity) × call', expr: `${num(eq, 3)} × ${num(pot)} − ${num(1 - eq, 3)} × ${num(bet)}`, result: signed(ev) },
                  { label: 'Implied odds: extra needed = call × (1 − equity) / equity − pot', expr: `${num(bet)} × ${num(1 - eq, 3)} / ${num(eq, 3)} − ${num(pot)}`, result: implied > 0 ? num(implied) : 'none needed' },
                  ...(extra > 0 ? [{ label: 'EV with implied winnings', expr: `${num(eq, 3)} × (${num(pot)} + ${num(extra)}) − ${num(1 - eq, 3)} × ${num(bet)}`, result: signed(evI) }] : []),
                ]}
              />
            </div>
          </Plate>

          <Plate serial="GTO" title="As theory sees the same bet">
            <div className="grid grid-cols-3 gap-5">
              <Figure size="md" value={pct(mdf(potBefore, bet))} caption="minimum defense frequency" />
              <Figure size="md" value={pct(alpha(potBefore, bet))} caption="alpha: a bluff must work this often" />
              <Figure size="md" value={pct(bluffFraction(potBefore, bet))} caption="bluffs in a balanced river range" />
            </div>
            <div className="mt-6">
              <Working
                steps={[
                  { label: 'MDF = pot / (pot + bet)', expr: `${num(potBefore)} / (${num(potBefore)} + ${num(bet)})`, result: pct(mdf(potBefore, bet), 2) },
                  { label: 'Alpha = bet / (pot + bet)', expr: `${num(bet)} / (${num(potBefore)} + ${num(bet)})`, result: pct(alpha(potBefore, bet), 2) },
                  { label: 'Bluff share = bet / (pot + 2 × bet)', expr: `${num(bet)} / (${num(potBefore)} + 2 × ${num(bet)})`, result: pct(bluffFraction(potBefore, bet), 2) },
                ]}
              />
            </div>
            <p className="mt-4 text-[13px] text-dim">
              In the theory formulas the pot is the pot before the bet. The bluff share equals the caller's required
              equity, which is not a coincidence: it is the mix that makes a bluff catcher indifferent.
            </p>
          </Plate>
        </div>
      )}
    </div>
  );
}
