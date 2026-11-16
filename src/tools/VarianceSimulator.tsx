import { useEffect, useState } from 'react';
import { bankrollForRisk, type VarianceResult } from '../engine/variance';
import { randomSeed } from '../engine/rng';
import { PathChart } from '../components/charts/PathChart';
import { Figure, Plate, ProgressLine, Slider } from '../components/ui/primitives';
import { useJob } from '../lib/engine';
import { int, num, pct } from '../lib/format';

export interface VarianceProps {
  initial?: { winrate?: number; stdDev?: number; hands?: number; bankroll?: number };
  embedded?: boolean;
}

export default function VarianceSimulator({ initial, embedded }: VarianceProps) {
  const [winrate, setWinrate] = useState(initial?.winrate ?? 5);
  const [stdDev, setStdDev] = useState(initial?.stdDev ?? 90);
  const [hands, setHands] = useState(initial?.hands ?? 100_000);
  const [bankroll, setBankroll] = useState(initial?.bankroll ?? 3000);
  const [seed, setSeed] = useState(1);
  const job = useJob<VarianceResult>();
  const paths = 3000;

  const { run } = job;
  useEffect(() => {
    const t = setTimeout(() => run((api) => api.variance({ winrate, stdDev, hands, paths, bankroll, seed })), 140);
    return () => clearTimeout(t);
  }, [winrate, stdDev, hands, bankroll, seed, run]);

  const r = job.result;
  const need5 = bankrollForRisk(winrate, stdDev, 0.05);

  return (
    <div className={embedded ? 'space-y-6' : 'grid gap-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]'}>
      <Plate serial="IN" title="The player">
        <div className="space-y-5">
          <Slider label="True winrate" min={-5} max={15} step={0.5} value={winrate} onChange={setWinrate} format={(v) => `${v} bb/100`} />
          <Slider label="Standard deviation" min={50} max={160} step={5} value={stdDev} onChange={setStdDev} format={(v) => `${v} bb/100`} />
          <Slider label="Hands played" min={5000} max={500_000} step={5000} value={hands} onChange={setHands} format={int} />
          <Slider label="Bankroll" min={500} max={10_000} step={100} value={bankroll} onChange={setBankroll} format={(v) => `${int(v)} bb · ${num(v / 100, 0)} buy-ins`} />
          <div className="flex items-center justify-between gap-3 border-t border-bone/15 pt-4">
            <span className="num text-[10.5px] text-dim">{int(paths)} paths · seed {seed}</span>
            <button type="button" className="btn btn-sm" onClick={() => setSeed(randomSeed())}>Rerun, new seed</button>
          </div>
          <p className="text-[13px] leading-relaxed text-dim">
            Six-max no-limit cash games usually run between 75 and 100 bb/100 of standard deviation. Pot-limit Omaha
            runs 120 to 160. A strong winrate is 5 bb/100 or more.
          </p>
        </div>
      </Plate>

      <div className="space-y-6">
        <Plate serial="SIM" title="Bankroll paths" right={r ? <span className="num normal-case tracking-normal">red: median · gold: expectation · shaded: middle 50% and 90%</span> : undefined}>
          {r ? (
            <PathChart x={r.x} paths={r.samplePaths} bands={r.bands} expected={r.expected} floor={-bankroll} yLabel="bb won" />
          ) : (
            <div className="flex h-[300px] items-center"><div className="w-full"><ProgressLine value={job.progress} label="simulating" /></div></div>
          )}
        </Plate>
        {r && (
          <Plate serial="OUT" title="What happened across all paths">
            <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-4">
              <Figure size="sm" value={`${int(r.expected)} bb`} caption="expected winnings" how={<>Winrate times hands divided by 100: {winrate} × {int(hands)} / 100.</>} />
              <Figure size="sm" value={`±${int(r.finalStdDev)} bb`} caption="one standard deviation" how={<>Standard deviation grows with the square root of volume: {stdDev} × √({int(hands)} / 100) = {int(r.finalStdDev)}.</>} />
              <Figure size="sm" tone={r.probLoss > 0.2 ? 'madder' : undefined} value={pct(r.probLoss)} caption="paths that lost money" />
              <Figure
                size="sm"
                tone={r.riskOfRuinSim > 0.05 ? 'madder' : undefined}
                value={pct(r.riskOfRuinSim)}
                caption="paths that went broke"
                how={
                  <>
                    Simulated: the share of {int(r.paths)} paths whose bankroll touched zero within {int(hands)} hands.
                    The closed-form value over an unlimited number of hands is exp(−2 × winrate × bankroll / sd²) ={' '}
                    {pct(r.riskOfRuinFormula, 2)}. For a 5% risk of ruin this player needs{' '}
                    {Number.isFinite(need5) ? `${int(need5)} bb` : 'an unlimited bankroll, because the winrate is not positive'}.
                  </>
                }
              />
              <Figure size="sm" value={`${int(r.drawdown.median)} bb`} caption="median worst downswing" />
              <Figure size="sm" value={`${int(r.drawdown.p95)} bb`} caption="1 in 20 downswing" />
              <Figure size="sm" value={int(r.breakeven.median)} caption="median longest stretch without a new high, hands" />
              <Figure size="sm" value={int(r.breakeven.p95)} caption="1 in 20 stretch, hands" />
            </div>
            <p className="mt-6 text-[13px] leading-relaxed text-dim">
              Each path is built from blocks of 100 hands drawn from a normal distribution with the mean and standard
              deviation above. A downswing is the largest drop from a previous peak. The same seed reproduces the same paths.
            </p>
          </Plate>
        )}
      </div>
    </div>
  );
}
