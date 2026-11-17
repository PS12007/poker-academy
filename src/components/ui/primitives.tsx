import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../../lib/format';

/** A framed panel with a serial number and a title line. */
export function Plate({
  title, serial, right, children, className, pad = true, id,
}: {
  title?: ReactNode;
  serial?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cx('plate', className)}>
      {(title || serial || right) && (
        <header className="plate-head">
          <div className="flex min-w-0 items-baseline gap-3">
            {serial && <span className="label shrink-0 text-madder">{serial}</span>}
            {title && <h3 className="label truncate text-bone">{title}</h3>}
          </div>
          {right && <div className="label min-w-0">{right}</div>}
        </header>
      )}
      <div className={pad ? 'p-4 sm:p-5' : undefined}>{children}</div>
    </section>
  );
}

export function Microtext({ text, className }: { text: string; className?: string }) {
  const line = `${text} · `.repeat(40);
  return (
    <div className={cx('microtext', className)} aria-hidden="true">
      <span>
        {line}
        {line}
      </span>
    </div>
  );
}

/** Click-away popover used for derivations. */
export function Popover({
  trigger, children, align = 'left', width = 320,
}: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-controls': string }) => ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-block">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-controls': id })}
      {open && (
        <span
          id={id}
          role="note"
          className={cx(
            'plate absolute top-full z-40 mt-2 block bg-ink p-4 text-left font-sans text-[13px] font-normal normal-case leading-relaxed tracking-normal text-bone shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)]',
            align === 'left' ? 'left-0' : 'right-0',
          )}
          style={{ width: `min(${width}px, 84vw)`, background: 'rgb(var(--ink))' }}
        >
          {children}
        </span>
      )}
    </span>
  );
}

/**
 * A number with provenance. The dagger opens how the value was obtained:
 * a derivation, or the method, sample count and seed.
 */
export function How({ children, align }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <Popover
      align={align}
      trigger={(p) => (
        <button type="button" className="dagger" aria-label="How this number was computed" {...p}>
          †
        </button>
      )}
    >
      <span className="label mb-2 block text-madder">How this was computed</span>
      {children}
    </Popover>
  );
}

/** Large display figure with a caption underneath. */
export function Figure({
  value, caption, how, size = 'md', tone, className,
}: {
  value: ReactNode;
  caption?: ReactNode;
  how?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'madder' | 'verd' | 'brass' | 'dim';
  className?: string;
}) {
  const sz = { sm: 'text-[28px]', md: 'text-[40px]', lg: 'text-[56px] sm:text-[68px]', xl: 'text-[72px] sm:text-[112px]' }[size];
  const color = tone ? { madder: 'text-madder', verd: 'text-verd', brass: 'text-brass', dim: 'text-dim' }[tone] : '';
  return (
    <div className={className}>
      <div className={cx('figure', sz, color)}>
        {value}
        {how && <How>{how}</How>}
      </div>
      {caption && <div className="label mt-2">{caption}</div>}
    </div>
  );
}

export function Slider({
  value, min, max, step = 1, onChange, label, format, id,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: ReactNode;
  format?: (v: number) => string;
  id?: string;
}) {
  const auto = useId();
  const fid = id ?? auto;
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div>
      {label && (
        <div className="flex items-baseline justify-between">
          <label htmlFor={fid} className="label">{label}</label>
          <span className="num text-[13px] text-bone">{format ? format(value) : value}</span>
        </div>
      )}
      <input
        id={fid}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': fill } as CSSProperties}
      />
    </div>
  );
}

export function NumberField({
  value, onChange, label, min, max, step, suffix, id,
}: {
  value: number;
  onChange: (v: number) => void;
  label: ReactNode;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  id?: string;
}) {
  const auto = useId();
  const fid = id ?? auto;
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((t) => (Number(t) === value ? t : String(value)));
  }, [value]);
  return (
    <div>
      <label htmlFor={fid} className="label block">{label}</label>
      <div className="flex items-baseline gap-2">
        <input
          id={fid}
          className="field"
          type="number"
          inputMode="decimal"
          value={text}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(v)) onChange(v);
          }}
        />
        {suffix && <span className="label">{suffix}</span>}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value, options, onChange, label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex border border-bone/40">
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors',
            i > 0 && 'border-l border-bone/40',
            o.value === value ? 'bg-bone text-ink' : 'text-dim hover:text-bone',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Thin progress line with a cancel affordance. */
export function ProgressLine({ value, onCancel, label }: { value: number; onCancel?: () => void; label?: string }) {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <div className="relative h-px flex-1 bg-bone/20">
        <div className="absolute inset-y-0 left-0 h-px bg-madder transition-[width] duration-100" style={{ width: `${Math.round(value * 100)}%` }} />
        <div
          className="absolute top-1/2 h-[7px] w-[7px] -translate-y-1/2 rotate-45 bg-madder transition-[left] duration-100"
          style={{ left: `calc(${Math.round(value * 100)}% - 3px)` }}
        />
      </div>
      <span className="num w-10 text-right text-[11px] text-dim">{Math.round(value * 100)}%</span>
      {label && <span className="label">{label}</span>}
      {onCancel && (
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}

/** Two-part horizontal bar, e.g. win / tie / lose. Labels carry the meaning, not colour alone. */
export function SplitBar({ parts }: { parts: { value: number; className: string; label: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="flex h-[6px] w-full overflow-hidden bg-bone/10" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
      {parts.map((p) => (
        <div key={p.label} className={cx(p.className, 'transition-[width] duration-500')} style={{ width: `${(p.value / total) * 100}%` }} />
      ))}
    </div>
  );
}

/** Stacked step-by-step working, numbered like a ledger. */
export function Working({ steps }: { steps: { label: ReactNode; expr: ReactNode; result?: ReactNode }[] }) {
  return (
    <ol className="divide-y divide-bone/10 border-y border-bone/15">
      {steps.map((s, i) => (
        <li key={i} className="grid grid-cols-[1.6rem_1fr] gap-x-3 py-2.5 sm:grid-cols-[1.6rem_1fr_auto]">
          <span className="num pt-0.5 text-[10px] text-faint">{String(i + 1).padStart(2, '0')}</span>
          <div className="min-w-0">
            <div className="text-[13px] text-dim">{s.label}</div>
            <div className="num mt-0.5 break-words text-[13px] text-bone">{s.expr}</div>
          </div>
          {s.result !== undefined && (
            <div className="num col-start-2 text-[14px] text-madder sm:col-start-3 sm:self-end sm:text-right">{s.result}</div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function PageHeader({
  serial, kicker, title, lede, children,
}: {
  serial?: string;
  kicker?: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 sm:mb-12">
      <div className="mb-4 flex items-center gap-3">
        {serial && <span className="label text-madder">{serial}</span>}
        {kicker && <span className="label">{kicker}</span>}
        <span className="h-px flex-1 bg-bone/20" />
      </div>
      <h1 className="display rise text-[44px] sm:text-[72px]">{title}</h1>
      {lede && <p className="rise mt-5 max-w-[62ch] text-[17px] leading-relaxed text-dim" style={{ '--i': 1 } as CSSProperties}>{lede}</p>}
      {children}
    </header>
  );
}
