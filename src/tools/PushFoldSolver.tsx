import { useEffect, useState } from 'react';
import type { PushFoldResult } from '../engine/pushFold';
import { EQUITY169_META } from '../generated/equity169';
import { HAND_CLASSES } from '../engine/ranges';
import { RangeGrid } from '../components/range/RangeGrid';
import { LineChart } from '../components/charts/LineChart';
import { Figure, Plate, Slider } from '../components/ui/primitives';
import { useJob } from '../lib/engine';
import { int, num, pct } from '../lib/format';

export interface PushFoldProps {
  initial?: { stack?: number; ante?: number };
  embedded?: boolean;
}

export default function PushFoldSolver({ initial, embedded }: PushFoldProps) {
  const [stack, setStack] = useState(initial?.stack ?? 10);
  const [ante, setAnte] = useState(initial?.ante ?? 0);
  const [hover, setHover] = useState<{ side: 'jam' | 'call'; i: number } | null>(null);
  const job = useJob<PushFoldResult>();
  const { run } = job;
  const iterations = 2500;

  useEffect(() => {
    const t = setTimeout(() => run((api) => api.pushFold({ stack, ante, iterations })), 180);
    return () => clearTimeout(t);
  }, [stack, ante, run]);

  const r = job.result;
  const text = (s: Float32Array) => (i: number) => (s[i] > 0.02 && s[i] < 0.98 ? String(Math.round(s[i] * 100)) : null);

  return (
    <div className="space-y-6">
      <Plate serial="IN" title="The spot">
        <div className="grid gap-6 md:grid-cols-3">
          <Slider label="Effective stack" min={1} max={25} step={0.5} value={stack} onChange={setStack} format={(v) => `${v} bb`} />
          <Slider label="Ante per player" min={0} max={0.5} step={0.025} value={ante} onChange={setAnte} format={(v) => `${num(v, 3)} bb`} />
          <p className="text-[13px] leading-relaxed text-dim">
            Heads-up. The small blind moves all-in or folds. The big blind calls or folds. Stacks are measured before
            blinds and antes go in.
          </p>
        </div>
      </Plate>

      {!r ? (
        <Plate serial="OUT" title="Solving"><span className="label pending">Fictitious play, {int(iterations)} iterations</span></Plate>
      ) : (
        <>
          <div className={embedded ? 'grid gap-6 md:grid-cols-2' : 'grid gap-6 lg:grid-cols-2'}>
            {(['jam', 'call'] as const).map((side) => {
              const s = side === 'jam' ? r.jam : r.call;
              return (
                <Plate
                  key={side}
                  serial={side === 'jam' ? 'SB' : 'BB'}
                  title={side === 'jam' ? 'Small blind jams' : 'Big blind calls'}
                  right={<span className="num normal-case tracking-normal">{pct(side === 'jam' ? r.jamFraction : r.callFraction)} of hands</span>}
                >
                  <RangeGrid range={s} compact cellText={text(s)} label={side === 'jam' ? 'Jamming range' : 'Calling range'} onHover={(i) => setHover(i === null ? null : { side, i })} />
                  <p className="mt-2 h-4 num text-[11px] text-dim">
                    {hover?.side === side ? `${HAND_CLASSES[hover.i].name}: ${side} ${pct(s[hover.i], 0)}` : 'Partly filled cells are mixed. The number is the frequency.'}
                  </p>
                </Plate>
              );
            })}
          </div>
          <Plate serial="CHK" title="How good is this solution?">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="grid grid-cols-2 gap-5 self-start">
                <Figure
                  size="sm"
                  tone={r.exploitability < 0.01 ? 'verd' : 'madder'}
                  value={`${num(r.exploitability, 4)} bb`}
                  caption="exploitability per hand"
                  how={<>Each player's best response to the other's strategy is computed exactly over the 169 hand classes. Exploitability is how much the two best responses gain in total. At a true Nash equilibrium it is zero.</>}
                />
                <Figure size="sm" value={`${num(r.sbValue, 3)} bb`} caption="small blind's EV per hand" />
                <p className="col-span-2 text-[12.5px] leading-relaxed text-dim">
                  Method: fictitious play. Each iteration both players best-respond to the other's average strategy and
                  the averages move a step toward that response. Equities come from a table of all 169 by 169 class
                  matchups ({EQUITY169_META.method}, {int(EQUITY169_META.trialsPerPair)} trials per pair, seed {EQUITY169_META.seed}),
                  with card removal handled by exact combo-pair counts. Hands at the edge of a range are close to
                  indifferent, so small table noise can move them by a few percent.
                </p>
              </div>
              <LineChart logX logY height={210} xLabel="iterations" yLabel="exploitability" series={[{ label: 'exploitability', points: r.history.filter((h) => h.exploitability > 1e-7).map((h) => ({ x: h.iteration, y: h.exploitability })) }]} />
            </div>
          </Plate>
        </>
      )}
    </div>
  );
}
