import { useEffect, useMemo, useState } from 'react';
import { parseCards } from '../engine/cards';
import { Category } from '../engine/evalCore';
import { shareAtLeast } from '../engine/board';
import { expandRange, HAND_CLASSES, parseRange, type Range } from '../engine/ranges';
import { CardField } from '../components/cards/CardField';
import { RangeEditor } from '../components/range/RangeEditor';
import { RangeGrid } from '../components/range/RangeGrid';
import { Figure, Plate, Segmented, SplitBar } from '../components/ui/primitives';
import { useJob } from '../lib/engine';
import { int, pct } from '../lib/format';

interface Result {
  equity: [number, number];
  heroClasses: Float32Array;
  boards: number;
  showdowns: number;
  ms: number;
}

export interface HeatmapProps {
  initial?: { hero?: string; villain?: string; board?: string; labels?: [string, string] };
  embedded?: boolean;
}

export default function RangeHeatmap({ initial, embedded }: HeatmapProps) {
  const [hero, setHero] = useState<Range>(() => parseRange(initial?.hero ?? '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, ATo+, KTo+, QTo+, JTo'));
  const [villain, setVillain] = useState<Range>(() => parseRange(initial?.villain ?? '99-22, AJs-A2s, K8s+, Q9s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, AQo-A9o, KTo+, QTo+, JTo'));
  const [board, setBoard] = useState<number[]>(() => parseCards(initial?.board ?? 'Ks8d3c'));
  const [edit, setEdit] = useState<'hero' | 'villain'>('hero');
  const [view, setView] = useState<'hero' | 'villain'>('hero');
  const labels = initial?.labels ?? ['Range A', 'Range B'];
  const job = useJob<{ a: Result; b: Result }>();
  const ok = board.length >= 3 && board.length <= 5;

  const combos = useMemo(() => ({ h: expandRange(hero, board), v: expandRange(villain, board) }), [hero, villain, board]);
  const { run } = job;
  useEffect(() => {
    if (!ok || !combos.h.length || !combos.v.length) return;
    const t = setTimeout(
      () =>
        run(async (api) => ({
          a: await api.rangeVsRange(combos.h, combos.v, board),
          b: await api.rangeVsRange(combos.v, combos.h, board),
        })),
      200,
    );
    return () => clearTimeout(t);
  }, [combos, board, ok, run]);

  const r = job.result;
  const shown = r ? (view === 'hero' ? r.a : r.b) : null;
  const strong = ok
    ? ([
        ['Two pair or better', Category.TwoPair],
        ['Set or better', Category.Trips],
        ['Straight or better', Category.Straight],
      ] as const).map(([label, cat]) => ({ label, h: shareAtLeast(combos.h, board, cat), v: shareAtLeast(combos.v, board, cat) }))
    : [];

  return (
    <div className={embedded ? 'space-y-6' : 'grid gap-6 xl:grid-cols-2'}>
      <div className="space-y-6">
        <Plate serial="BD" title="Board">
          <CardField label="Flop, turn or river" hint="3 to 5 cards" max={5} value={board} onChange={setBoard} />
        </Plate>
        <Plate serial="IN" title="Ranges" right={<Segmented label="Edit" value={edit} onChange={setEdit} options={[{ value: 'hero', label: labels[0] }, { value: 'villain', label: labels[1] }]} />}>
          {edit === 'hero' ? (
            <RangeEditor key="h" value={hero} onChange={setHero} dead={board} compact minimal={embedded} label={labels[0]} />
          ) : (
            <RangeEditor key="v" value={villain} onChange={setVillain} dead={board} compact minimal={embedded} label={labels[1]} />
          )}
        </Plate>
      </div>

      <div className="space-y-6">
        <Plate serial="OUT" title="Range against range" right={r ? <span className="num normal-case tracking-normal">exact · {int(r.a.boards)} runouts · {r.a.ms + r.b.ms} ms</span> : undefined}>
          {!ok ? (
            <p className="text-dim">Enter at least a flop.</p>
          ) : !r ? (
            <span className="label pending">Computing every showdown</span>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-5">
                <Figure size="lg" tone="madder" value={pct(r.a.equity[0])} caption={`${labels[0]} equity`} how={<>Exact. For each of the {int(r.a.boards)} possible runouts, every combo in both ranges is evaluated and compared, weighted by its range weight, with combos that share a card removed. {int(r.a.showdowns)} weighted showdowns in total.</>} />
                <Figure size="lg" value={pct(r.a.equity[1])} caption={`${labels[1]} equity`} />
              </div>
              <div className="mt-4"><SplitBar parts={[{ value: r.a.equity[0], className: 'bg-madder', label: labels[0] }, { value: r.a.equity[1], className: 'bg-bone', label: labels[1] }]} /></div>
              <table className="mt-5 w-full border-collapse">
                <thead>
                  <tr className="border-b border-bone/40"><th className="label py-2 text-left font-normal">Share of range holding</th><th className="label py-2 text-right font-normal">{labels[0]}</th><th className="label py-2 text-right font-normal">{labels[1]}</th></tr>
                </thead>
                <tbody>
                  {strong.map((s) => (
                    <tr key={s.label} className="border-b border-bone/10">
                      <td className="py-1.5 text-[14px]">{s.label}</td>
                      <td className={`num py-1.5 text-right text-[13px] ${s.h > s.v ? 'text-madder' : ''}`}>{pct(s.h)}</td>
                      <td className={`num py-1.5 text-right text-[13px] ${s.v > s.h ? 'text-madder' : ''}`}>{pct(s.v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[12.5px] text-dim">Equity shows who is ahead on average (range advantage). The rows below it show who holds more of the very strong hands (nut advantage).</p>
            </>
          )}
        </Plate>
        {shown && (
          <Plate serial="MAP" title="Equity of each hand" right={<Segmented label="Show" value={view} onChange={setView} options={[{ value: 'hero', label: labels[0] }, { value: 'villain', label: labels[1] }]} />}>
            <RangeGrid
              range={view === 'hero' ? hero : villain}
              heat={shown.heroClasses}
              compact
              cellText={(i) => (Number.isNaN(shown.heroClasses[i]) ? null : String(Math.round(shown.heroClasses[i] * 100)))}
              label={`Equity of each hand in ${view === 'hero' ? labels[0] : labels[1]}`}
            />
            <p className="mt-3 text-[12.5px] text-dim">
              Each cell is that hand's equity against the whole opposing range, averaged over its live combos. Red is ahead, blue is behind. {HAND_CLASSES.length} cells, blank where the hand is not in the range.
            </p>
          </Plate>
        )}
      </div>
    </div>
  );
}
