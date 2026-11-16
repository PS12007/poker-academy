import { useMemo, useState } from 'react';
import { countCombos, expandRange, HAND_CLASSES, parseRange, rangeToString, type Range } from '../engine/ranges';
import { CardField } from '../components/cards/CardField';
import { RangeEditor } from '../components/range/RangeEditor';
import { RangeGrid } from '../components/range/RangeGrid';
import { Figure, Plate, Segmented } from '../components/ui/primitives';
import { useStore } from '../store';
import { num, pct } from '../lib/format';

const fmt = (n: number) => num(n, n % 1 ? 1 : 0);

function breakdown(range: Range, dead: readonly number[]) {
  const rows = { pair: 0, suited: 0, offsuit: 0 };
  const used = new Set(dead);
  for (const h of HAND_CLASSES) {
    if (range[h.index] <= 0) continue;
    rows[h.kind] += range[h.index] * h.combos.filter(([a, b]) => !used.has(a) && !used.has(b)).length;
  }
  return rows;
}

export default function RangeBuilder() {
  const saved = useStore((s) => s.savedRanges);
  const saveRange = useStore((s) => s.saveRange);
  const deleteRange = useStore((s) => s.deleteRange);
  const [ranges, setRanges] = useState<[Range, Range]>(() => [parseRange('22+, A2s+, KTs+, QTs+, JTs, T9s, 98s, ATo+, KJo+'), parseRange('TT+, AQs+, AKo, A5s-A4s')]);
  const [active, setActive] = useState<'a' | 'b' | 'compare'>('a');
  const [dead, setDead] = useState<number[]>([]);
  const [name, setName] = useState('');
  const idx = active === 'b' ? 1 : 0;
  const range = ranges[idx];
  const setRange = (r: Range) => setRanges((rs) => (idx === 0 ? [r, rs[1]] : [rs[0], r]));

  const combos = useMemo(() => countCombos(range, dead), [range, dead]);
  const liveTotal = useMemo(() => expandRange(parseRange('random'), dead).length, [dead]);
  const parts = useMemo(() => breakdown(range, dead), [range, dead]);

  const compare = useMemo(() => {
    const [a, b] = ranges;
    const used = new Set(dead);
    let both = 0, onlyA = 0, onlyB = 0;
    const mix = new Float32Array(169);
    for (const h of HAND_CLASSES) {
      const live = h.combos.filter(([x, y]) => !used.has(x) && !used.has(y)).length;
      const wa = a[h.index], wb = b[h.index];
      both += Math.min(wa, wb) * live;
      onlyA += Math.max(0, wa - wb) * live;
      onlyB += Math.max(0, wb - wa) * live;
      // Heat: 1 = only A (madder), 0 = only B (lapis), 0.5 = shared.
      mix[h.index] = wa <= 0 && wb <= 0 ? NaN : wa > 0 && wb > 0 ? 0.5 : wa > 0 ? 1 : 0;
    }
    return { both, onlyA, onlyB, mix };
  }, [ranges, dead]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <Plate
        serial="RNG"
        title={active === 'compare' ? 'A against B' : `Range ${active.toUpperCase()}`}
        right={<Segmented label="Which range" value={active} onChange={setActive} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'compare', label: 'Compare' }]} />}
      >
        {active === 'compare' ? (
          <div>
            <RangeGrid range={ranges[0]} heat={compare.mix} label="Comparison of range A and range B" />
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Figure size="sm" tone="madder" value={fmt(compare.onlyA)} caption="combos only in A" />
              <Figure size="sm" value={fmt(compare.both)} caption="combos in both" />
              <Figure size="sm" value={fmt(compare.onlyB)} caption="combos only in B" className="text-lapis" />
            </div>
            <p className="mt-4 text-[13px] text-dim">
              Red cells are only in A, blue cells only in B, and neutral cells are shared. With weights, a shared cell
              counts the smaller of the two weights as overlap.
            </p>
          </div>
        ) : (
          <RangeEditor key={active} value={range} onChange={setRange} dead={dead} label={`Range ${active.toUpperCase()}`} />
        )}
      </Plate>

      <div className="space-y-6">
        <Plate serial="CNT" title="Count">
          <div className="grid grid-cols-2 gap-5">
            <Figure
              value={fmt(combos)}
              caption="combos"
              how={
                <>
                  Each pair has 6 combos, each suited hand 4, each offsuit hand 12. A cell's combos are multiplied by its
                  weight. Combos that use a card from the dead-card list below are removed first.
                </>
              }
            />
            <Figure value={pct(combos / liveTotal)} caption={`of ${liveTotal} possible`} />
          </div>
          <dl className="num mt-5 divide-y divide-bone/10 border-y border-bone/15 text-[12px]">
            {([['Pocket pairs', parts.pair], ['Suited', parts.suited], ['Offsuit', parts.offsuit]] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between py-2">
                <dt className="text-dim">{k}</dt>
                <dd>{fmt(v)} <span className="text-faint">· {pct(combos ? v / combos : 0, 0)}</span></dd>
              </div>
            ))}
          </dl>
        </Plate>

        <Plate serial="BLK" title="Blockers">
          <CardField label="Known cards" hint="your hand, the board" max={7} size="sm" value={dead} onChange={setDead} />
          <p className="mt-3 text-[13px] text-dim">
            Enter cards you can see. Combos containing them are removed from the counts, and fully blocked cells fade on the grid.
          </p>
        </Plate>

        <Plate serial="SAV" title="Saved ranges">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="label block" htmlFor="range-name">Name</label>
              <input id="range-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BTN open" />
            </div>
            <button type="button" className="btn btn-sm" disabled={!name.trim() || active === 'compare'} onClick={() => { saveRange({ name: name.trim(), text: rangeToString(range) }); setName(''); }}>
              Save {active === 'b' ? 'B' : 'A'}
            </button>
          </div>
          {saved.length === 0 ? (
            <p className="mt-4 text-[13px] text-dim">Nothing saved yet. Saved ranges stay in this browser and are included in your data export.</p>
          ) : (
            <ul className="mt-4 divide-y divide-bone/10 border-y border-bone/15">
              {saved.map((s) => (
                <li key={s.name} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">{s.name}</span>
                    <span className="num block truncate text-[10px] text-faint">{s.text || 'empty'}</span>
                  </span>
                  <button type="button" className="btn btn-sm" disabled={active === 'compare'} onClick={() => setRange(parseRange(s.text))}>Load</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteRange(s.name)} aria-label={`Delete ${s.name}`}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </Plate>
      </div>
    </div>
  );
}
