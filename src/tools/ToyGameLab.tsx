import { useEffect, useState } from 'react';
import { KUHN_INFOSETS, type KuhnResult } from '../engine/cfr/kuhn';
import { solveRiverToyGame } from '../engine/theory';
import { LineChart } from '../components/charts/LineChart';
import { Figure, Plate, Segmented, Slider, Working } from '../components/ui/primitives';
import { useJob } from '../lib/engine';
import { cx, int, num, pct } from '../lib/format';

/** The polarized river game: nuts or air against a bluff catcher, one bet, no raise. */
export function RiverToyGame() {
  const [bet, setBet] = useState(100);
  const [value, setValue] = useState(50);
  const pot = 100;
  const g = solveRiverToyGame(pot, bet, value / 100);
  const capped = g.callFreq === 0;
  return (
    <Plate serial="TG-1" title="The polarized river game">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-5">
          <Slider label="Bet size, pot is 100" min={10} max={300} step={5} value={bet} onChange={setBet} format={(v) => `${v} · ${v}% pot`} />
          <Slider label="Bettor holds the nuts" min={5} max={95} step={1} value={value} onChange={setValue} format={(v) => `${v}% · air ${100 - v}%`} />
          <p className="text-[13px] leading-relaxed text-dim">
            The bettor's range is the nuts or nothing. The caller holds one hand that beats nothing and loses to the nuts.
            The bettor may bet or check. The caller may call or fold. No raising.
          </p>
        </div>
        <div>
          <div className="grid grid-cols-3 gap-4">
            <Figure size="md" tone="madder" value={pct(g.bluffFreqOfAir)} caption="of air bluffs" />
            <Figure size="md" value={pct(g.callFreq)} caption="caller calls" />
            <Figure size="md" value={num(g.bettorEV, 1)} caption="bettor's EV, pot is 100" />
          </div>
          <div className="mt-5">
            {capped ? (
              <p className="text-[14px] leading-relaxed text-dim">
                With this much value there is not enough air to reach the balanced ratio, so the bettor bets everything.
                Bluffs are only {pct(g.bluffShare)} of the betting range, below the {pct(bet / (pot + 2 * bet))} the caller
                needs, so the caller folds every time and the bettor wins the whole pot.
              </p>
            ) : (
              <Working
                steps={[
                  { label: 'Caller is indifferent when bluffs / (bluffs + value) = bet / (pot + 2 bet)', expr: `${bet} / (${pot} + 2 × ${bet})`, result: pct(g.bluffShare) },
                  { label: 'So bluffs per value hand = bet / (pot + bet)', expr: `${bet} / ${pot + bet}`, result: num(bet / (pot + bet), 3) },
                  { label: 'As a share of the air', expr: `${value}% × ${num(bet / (pot + bet), 3)} / ${100 - value}%`, result: pct(g.bluffFreqOfAir) },
                  { label: 'Bettor is indifferent with air when call frequency = pot / (pot + bet)', expr: `${pot} / ${pot + bet}`, result: pct(g.callFreq) },
                  { label: 'Bettor EV = value% × (pot + call% × bet)', expr: `${value}% × (${pot} + ${num(g.callFreq, 3)} × ${bet})`, result: num(g.bettorEV, 1) },
                ]}
              />
            )}
          </div>
          <p className="mt-4 text-[13px] text-dim">
            If the bettor checked everything, their EV would be {num(value, 1)}: the nuts win the pot at showdown and the
            air loses. Betting adds {num(g.bettorEV - value, 1)}. Bigger bets add more.
          </p>
        </div>
      </div>
    </Plate>
  );
}

const SET_LABEL: Record<string, string> = {
  J: 'Jack: bet first', Q: 'Queen: bet first', K: 'King: bet first',
  Jpb: 'Jack: call after checking', Qpb: 'Queen: call after checking', Kpb: 'King: call after checking',
  Jp: 'Jack: bet when checked to', Qp: 'Queen: bet when checked to', Kp: 'King: bet when checked to',
  Jb: 'Jack: call a bet', Qb: 'Queen: call a bet', Kb: 'King: call a bet',
};

/** Kuhn poker solved by CFR, with a scrubber to watch the strategy settle. */
export function KuhnLab() {
  const [iters, setIters] = useState(10_000);
  const [algo, setAlgo] = useState<'cfr' | 'plus'>('cfr');
  const [at, setAt] = useState(100);
  const job = useJob<KuhnResult>();
  const { run } = job;
  useEffect(() => {
    run((api) => api.kuhn(iters, algo === 'plus'));
  }, [iters, algo, run]);
  const r = job.result;
  const snap = r ? r.snapshots[Math.min(r.snapshots.length - 1, Math.round((at / 100) * (r.snapshots.length - 1)))] : null;

  return (
    <Plate
      serial="TG-2"
      title="Kuhn poker, solved while you watch"
      right={<Segmented label="Algorithm" value={algo} onChange={setAlgo} options={[{ value: 'cfr', label: 'CFR' }, { value: 'plus', label: 'CFR+' }]} />}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-[13.5px] leading-relaxed text-dim">
            Three cards: jack, queen, king. Each player antes 1 and gets one card. One bet of 1 is allowed. The solver
            starts by playing every option half the time, then repeatedly shifts toward the actions it regrets not
            having taken.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-5">
            <Slider label="Iterations" min={100} max={100_000} step={100} value={iters} onChange={setIters} format={int} />
            <Slider label="Show strategy at" min={0} max={100} step={1} value={at} onChange={setAt} format={() => (snap ? `iteration ${int(snap.iteration)}` : '')} />
          </div>
          {r && snap && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-5">
                <Figure size="sm" tone={snap.exploitability < 0.005 ? 'verd' : 'madder'} value={num(snap.exploitability, 4)} caption="exploitability, chips per hand" how={<>For each player, every one of their 64 pure strategies is played against the other's average strategy and the best is kept. Exploitability is the sum of the two best-response gains. It is zero only at a Nash equilibrium.</>} />
                <Figure size="sm" value={num(snap.value, 4)} caption="value for player 1 · theory −1/18 = −0.0556" />
              </div>
              <div className="mt-5">
                <LineChart
                  logX
                  logY
                  height={200}
                  xLabel="iterations"
                  yLabel="exploitability"
                  series={[{ label: 'exploitability', points: r.snapshots.filter((s) => s.exploitability > 1e-9).map((s) => ({ x: s.iteration, y: s.exploitability })) }]}
                />
                <p className="mt-1 text-[12px] text-dim">Both axes are logarithmic. A straight downward line means error shrinking as a power of the iteration count.</p>
              </div>
            </>
          )}
        </div>
        <div>
          {snap ? (
            <div className="grid gap-x-8 sm:grid-cols-2">
              {[['Player 1', KUHN_INFOSETS.slice(0, 6)], ['Player 2', KUHN_INFOSETS.slice(6)]].map(([who, sets]) => (
                <div key={who as string}>
                  <div className="label mb-2 text-madder">{who as string}</div>
                  <ul className="border-t border-bone/20">
                    {(sets as string[]).map((k) => (
                      <li key={k} className="border-b border-bone/10 py-2">
                        <div className="flex items-baseline justify-between text-[13px]">
                          <span>{SET_LABEL[k]}</span>
                          <span className="num text-[11px] text-dim">{pct(snap.strategy[k], 0)}</span>
                        </div>
                        <div className="mt-1.5 h-[5px] bg-bone/10">
                          <div className={cx('h-full transition-[width] duration-150', k[0] === 'K' ? 'bg-madder' : k[0] === 'Q' ? 'bg-bone' : 'bg-lapis')} style={{ width: `${snap.strategy[k] * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="mt-4 text-[12.5px] leading-relaxed text-dim sm:col-span-2">
                What to look for at the end: player 1 bluffs the jack some of the time and bets the king three times as
                often. The queen never bets first. Player 2 calls with the queen one time in three and bluffs the jack
                one time in three. Nobody told the solver about bluffing. It falls out of minimizing regret.
              </p>
            </div>
          ) : (
            <span className="label pending">Solving</span>
          )}
        </div>
      </div>
    </Plate>
  );
}

export default function ToyGameLab({ embedded }: { embedded?: boolean }) {
  return (
    <div className="space-y-6">
      <RiverToyGame />
      {!embedded && <KuhnLab />}
    </div>
  );
}
