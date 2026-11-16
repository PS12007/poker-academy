import { useEffect, useId, useMemo, useState } from 'react';
import {
  countCombos, emptyRange, HAND_CLASSES, parseRange, rangeFraction, rangeToString, topFraction, tryParseRange, type Range,
} from '../../engine/ranges';
import { HAND_ORDER } from '../../generated/handOrder';
import { num, pct } from '../../lib/format';
import { Slider } from '../ui/primitives';
import { RangeGrid } from './RangeGrid';

const same = (a: Range, b: Range) => {
  for (let i = 0; i < 169; i++) if (Math.abs(a[i] - b[i]) > 0.004) return false;
  return true;
};

const QUICK: [string, string][] = [
  ['Pairs', '22+'],
  ['Broadway', 'TT+, ATs+, KTs+, QTs+, JTs, ATo+, KTo+, QTo+, JTo'],
  ['Suited aces', 'A2s+'],
  ['Suited connectors', 'T9s-54s'],
];

interface Props {
  value: Range;
  onChange: (r: Range) => void;
  /** Cards that remove combos from the count (board, known hands). */
  dead?: readonly number[];
  compact?: boolean;
  label?: string;
  /** Hide presets and the brush for tight spaces. */
  minimal?: boolean;
}

/** Grid, text syntax and combo counts kept in sync. */
export function RangeEditor({ value, onChange, dead = [], compact, label = 'Range', minimal }: Props) {
  const id = useId();
  const [text, setText] = useState(() => rangeToString(value));
  const [bad, setBad] = useState(false);
  const [brush, setBrush] = useState(1);

  useEffect(() => {
    setText((t) => {
      const parsed = tryParseRange(t);
      return parsed && same(parsed, value) ? t : rangeToString(value);
    });
    setBad(false);
  }, [value]);

  const combos = useMemo(() => countCombos(value, dead), [value, dead]);
  const fraction = useMemo(() => rangeFraction(value), [value]);
  const unblocked = useMemo(() => countCombos(value), [value]);
  const available = useMemo(() => {
    if (!dead.length) return null;
    const used = new Set(dead);
    return Float32Array.from(HAND_CLASSES, (h) => h.combos.filter(([a, b]) => !used.has(a) && !used.has(b)).length / h.combos.length);
  }, [dead]);

  return (
    <div>
      <div className="mb-3">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="label">{label}</label>
          <span className="num text-[11px] text-dim">
            {num(combos, combos % 1 ? 1 : 0)} combos
            {dead.length > 0 && unblocked !== combos ? ` (${num(unblocked, unblocked % 1 ? 1 : 0)} before blockers)` : ''} · {pct(fraction)}
          </span>
        </div>
        <input
          id={id}
          className="field"
          value={text}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-invalid={bad}
          placeholder="e.g. QQ+, AKs, A5s-A2s, KQo"
          onChange={(e) => {
            setText(e.target.value);
            try {
              const r = parseRange(e.target.value);
              setBad(false);
              if (!same(r, value)) onChange(r);
            } catch {
              setBad(true);
            }
          }}
        />
      </div>
      <RangeGrid range={value} onChange={onChange} brush={brush} available={available} compact={compact} label={label} />
      {!minimal && (
        <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Slider label="Brush weight" min={0.25} max={1} step={0.25} value={brush} onChange={setBrush} format={(v) => `${v * 100}%`} />
          <Slider
            label="Top of all hands"
            min={0}
            max={100}
            step={1}
            value={Math.round(fraction * 100)}
            onChange={(v) => onChange(topFraction(HAND_ORDER, v / 100))}
            format={(v) => `${v}%`}
          />
          <div className="flex flex-wrap gap-1.5 sm:col-span-2">
            {QUICK.map(([name, t]) => (
              <button key={name} type="button" className="btn btn-sm" onClick={() => {
                const add = parseRange(t);
                const next = new Float32Array(value);
                for (let i = 0; i < 169; i++) if (add[i] > 0) next[i] = add[i];
                onChange(next);
              }}>
                + {name}
              </button>
            ))}
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(emptyRange())}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
