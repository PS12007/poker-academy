import { useMemo, useState } from 'react';
import { countCombos, parseRange, rangeFraction } from '../../engine/ranges';
import { VS_OPEN } from '../../engine/teachingRanges';
import { geometricFraction, geometricPlan, mdf, alpha, bluffFraction } from '../../engine/theory';
import { potOdds } from '../../engine/ev';
import { RangeGrid } from '../range/RangeGrid';
import { Figure, Plate, Segmented, Slider, Working } from '../ui/primitives';
import { num, pct } from '../../lib/format';

/* ------------------------------------------------------- facing an open */
const SPOTS = [
  { value: 'IP-vs-early', label: 'In position v early' },
  { value: 'IP-vs-late', label: 'In position v late' },
  { value: 'BB-vs-early', label: 'Big blind v early' },
  { value: 'BB-vs-late', label: 'Big blind v button' },
];

/** Three-colour chart of a response to an open raise: 3-bet for value, 3-bet as a bluff, call. */
export function VsOpenChart({ start = 'IP-vs-late' }: { start?: string }) {
  const [spot, setSpot] = useState(start);
  const f = VS_OPEN[spot];
  const { all, heat, v, b, c } = useMemo(() => {
    const v = parseRange(f.value), b = parseRange(f.bluff), c = parseRange(f.call);
    const all = new Float32Array(169), heat = new Float32Array(169).fill(NaN);
    for (let i = 0; i < 169; i++) {
      if (v[i] > 0) { all[i] = 1; heat[i] = 1; }
      else if (b[i] > 0) { all[i] = 1; heat[i] = 0.78; }
      else if (c[i] > 0) { all[i] = 1; heat[i] = 0.12; }
    }
    return { all, heat, v, b, c };
  }, [f]);
  const row = (label: string, r: Float32Array, swatch: string) => (
    <div className="flex items-center gap-3 border-b border-bone/10 py-2">
      <span className={`h-3 w-3 ${swatch}`} />
      <span className="flex-1 text-[14px]">{label}</span>
      <span className="num text-[12px] text-dim">{num(countCombos(r), 0)} combos · {pct(rangeFraction(r))}</span>
    </div>
  );
  return (
    <Plate serial="CHT" title="Facing an open raise" right={<span className="hidden sm:block">simplified teaching ranges</span>}>
      <div className="mb-4 overflow-x-auto"><Segmented label="Spot" value={spot} onChange={setSpot} options={SPOTS} /></div>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_230px]">
        <RangeGrid range={all} heat={heat} compact label="Response to an open raise" />
        <div>
          {row('3-bet for value', v, 'bg-madder')}
          {row('3-bet as a bluff', b, 'bg-madder/60')}
          {row('Call', c, 'bg-lapis/70')}
          <p className="mt-4 text-[13px] leading-relaxed text-dim">
            Bluffs are {pct(countCombos(b) / (countCombos(b) + countCombos(v)), 0)} of the 3-betting range here. Everything not shown folds:{' '}
            {pct(1 - rangeFraction(all))} of hands.
          </p>
          <p className="mt-2 text-[12px] text-faint">Written for this course as a starting point. Not solver output.</p>
        </div>
      </div>
    </Plate>
  );
}

/* ------------------------------------------------------ geometric sizing */
export function GeometricSizing({ pot = 10, stack = 95 }: { pot?: number; stack?: number }) {
  const [p, setP] = useState(pot);
  const [s, setS] = useState(stack);
  const [n, setN] = useState(3);
  const f = geometricFraction(p, s, n);
  const plan = geometricPlan(p, s, n);
  const names = n === 3 ? ['Flop', 'Turn', 'River'] : n === 2 ? ['Turn', 'River'] : ['River'];
  return (
    <Plate serial="LAB" title="Geometric sizing">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Slider label="Pot now" min={2} max={200} step={1} value={p} onChange={setP} format={(v) => `${v} bb`} />
          <Slider label="Effective stack behind" min={5} max={400} step={1} value={s} onChange={setS} format={(v) => `${v} bb · SPR ${num(v / p, 1)}`} />
          <Slider label="Streets left to bet" min={1} max={3} step={1} value={n} onChange={setN} />
        </div>
        <div>
          <Figure size="lg" tone="madder" value={pct(f, 0)} caption="of the pot, on every street" how={<>Each bet and call multiplies the pot by (1 + 2f). After {n} streets the pot must equal the starting pot plus both stacks: (1 + 2f)^{n} = ({p} + 2 × {s}) / {p}. Solving gives f = {num(f, 3)}.</>} />
          <p className="mt-3 text-[13px] text-dim">Betting this fraction each street puts the last chip in on the final bet.</p>
        </div>
      </div>
      <div className="mt-5">
        <Working steps={plan.map((st, i) => ({ label: `${names[i]}: pot ${num(st.potBefore, 1)}`, expr: `bet ${num(st.bet, 1)} (${pct(st.bet / st.potBefore, 0)} pot), called`, result: `pot ${num(st.potAfter, 1)} · ${num(st.stackAfter, 1)} behind` }))} />
      </div>
    </Plate>
  );
}

/* ------------------------------------------------------------ bet theory */
/** One bet size seen from both sides: caller's price, MDF, alpha, balanced bluff share. */
export function BetSizeTheory({ start = 75 }: { start?: number }) {
  const [size, setSize] = useState(start);
  const b = size / 100;
  return (
    <Plate serial="LAB" title="One bet, four numbers">
      <Slider label="Bet as a share of the pot" min={10} max={300} step={5} value={size} onChange={setSize} format={(v) => `${v}%`} />
      <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Figure size="sm" value={pct(potOdds(1 + b, b))} caption="caller's equity needed" />
        <Figure size="sm" tone="madder" value={pct(mdf(1, b))} caption="MDF: defend at least" />
        <Figure size="sm" value={pct(alpha(1, b))} caption="alpha: bluff must work" />
        <Figure size="sm" value={pct(bluffFraction(1, b))} caption="bluffs in a balanced range" />
      </div>
      <div className="mt-5">
        <Working
          steps={[
            { label: 'MDF = pot / (pot + bet)', expr: `1 / (1 + ${num(b)})`, result: pct(mdf(1, b)) },
            { label: 'Alpha = bet / (pot + bet)', expr: `${num(b)} / (1 + ${num(b)})`, result: pct(alpha(1, b)) },
            { label: 'Bluff share = bet / (pot + 2 × bet)', expr: `${num(b)} / (1 + 2 × ${num(b)})`, result: pct(bluffFraction(1, b)) },
          ]}
        />
      </div>
    </Plate>
  );
}
