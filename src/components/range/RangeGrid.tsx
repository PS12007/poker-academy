import { memo, useCallback, useRef, type CSSProperties } from 'react';
import { HAND_CLASSES, type Range } from '../../engine/ranges';
import { cx } from '../../lib/format';

interface Props {
  range: Range;
  /** Omit for a read-only grid. */
  onChange?: (r: Range) => void;
  /** Weight painted by a click or drag. */
  brush?: number;
  /** Optional per-class value (0..1) drawn as a heat colour, e.g. equity. NaN cells are blank. */
  heat?: Float32Array | null;
  /** Optional per-class text shown under the hand name. */
  cellText?: (index: number) => string | null;
  /** Classes drawn with an accent outline. */
  highlight?: readonly number[];
  /** Per-class dimming, e.g. blocked combos remaining / total. */
  available?: Float32Array | null;
  compact?: boolean;
  label?: string;
  onHover?: (index: number | null) => void;
}

/** Diverging ramp for heat: lapis (low) through neutral to madder (high). */
function heatColor(v: number): string {
  const t = Math.max(0, Math.min(1, v));
  if (t < 0.5) return `rgb(var(--lapis) / ${(0.85 * (1 - t * 2) + 0.08).toFixed(3)})`;
  return `rgb(var(--madder) / ${(0.85 * (t * 2 - 1) + 0.08).toFixed(3)})`;
}

/**
 * The 13 x 13 starting hand grid. Click or drag to paint. The first cell
 * touched decides whether the stroke adds or erases.
 */
export const RangeGrid = memo(function RangeGrid({
  range, onChange, brush = 1, heat, cellText, highlight, available, compact, label, onHover,
}: Props) {
  const painting = useRef<{ value: number } | null>(null);
  const latest = useRef(range);
  latest.current = range;

  const paint = useCallback(
    (index: number) => {
      if (!painting.current || !onChange) return;
      const v = painting.current.value;
      if (latest.current[index] === v) return;
      const next = new Float32Array(latest.current);
      next[index] = v;
      latest.current = next;
      onChange(next);
    },
    [onChange],
  );

  const indexAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const raw = el?.closest<HTMLElement>('[data-cell]')?.dataset.cell;
    return raw === undefined ? null : Number(raw);
  };

  return (
    <div
      role="grid"
      aria-label={label ?? 'Starting hand range'}
      className={cx('grid select-none border-l border-t border-bone/20', onChange && 'touch-none')}
      style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
      onPointerDown={(e) => {
        if (!onChange) return;
        const i = indexAt(e.clientX, e.clientY);
        if (i === null) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        painting.current = { value: Math.abs(latest.current[i] - brush) < 0.005 ? 0 : brush };
        paint(i);
      }}
      onPointerMove={(e) => {
        if (!painting.current) return;
        const i = indexAt(e.clientX, e.clientY);
        if (i !== null) paint(i);
      }}
      onPointerUp={() => (painting.current = null)}
      onPointerCancel={() => (painting.current = null)}
      onPointerLeave={() => onHover?.(null)}
    >
      {HAND_CLASSES.map((h) => {
        const w = range[h.index];
        const hv = heat ? heat[h.index] : NaN;
        const showHeat = heat && !Number.isNaN(hv);
        const avail = available ? available[h.index] : 1;
        const text = cellText?.(h.index);
        const on = w > 0;
        return (
          <div
            key={h.index}
            role="gridcell"
            data-cell={h.index}
            aria-selected={on}
            tabIndex={onChange ? 0 : -1}
            aria-label={`${h.name}${on ? `, weight ${Math.round(w * 100)}%` : ''}`}
            onKeyDown={(e) => {
              if (!onChange || (e.key !== 'Enter' && e.key !== ' ')) return;
              e.preventDefault();
              const next = new Float32Array(range);
              next[h.index] = Math.abs(range[h.index] - brush) < 0.005 ? 0 : brush;
              onChange(next);
            }}
            onPointerEnter={() => onHover?.(h.index)}
            className={cx(
              'relative flex aspect-square items-center justify-center overflow-hidden border-b border-r border-bone/20 font-mono leading-none',
              compact ? 'text-[7px] sm:text-[8.5px]' : 'text-[8px] xs:text-[9.5px] sm:text-[11px]',
              onChange && 'cursor-crosshair',
              h.kind === 'pair' && !on && !showHeat && 'bg-bone/[0.07]',
              highlight?.includes(h.index) && 'z-10 outline outline-[1.5px] outline-brass',
            )}
            style={{ opacity: avail <= 0 ? 0.25 : 1 } as CSSProperties}
          >
            {showHeat ? (
              <span className="absolute inset-0" style={{ background: heatColor(hv) }} />
            ) : (
              on && (
                <span
                  className={cx('absolute inset-x-0 bottom-0', h.kind === 'pair' ? 'bg-madder' : h.kind === 'suited' ? 'bg-bone' : 'bg-bone/70')}
                  style={{ height: `${w * 100}%` }}
                />
              )
            )}
            <span
              className={cx(
                'relative z-[1] flex flex-col items-center gap-[2px]',
                showHeat ? 'text-bone' : on && w > 0.5 ? 'font-semibold text-ink' : on ? 'text-bone' : 'text-dim',
              )}
            >
              {h.name}
              {text && <span className="text-[0.82em] opacity-80">{text}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
});
