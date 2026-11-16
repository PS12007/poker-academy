import { Children, isValidElement, useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { parseCards } from '../../engine/cards';
import { expandRange, parseRange } from '../../engine/ranges';
import type { EquityRequest, PlayerSpec } from '../../engine/equity';
import { GLOSSARY } from '../../content/glossary';
import { useCached } from '../../lib/engine';
import { cx, int, pct } from '../../lib/format';
import { Guilloche } from '../ui/Guilloche';
import { How } from '../ui/primitives';
import { Hand, type CardSize } from '../cards/PlayingCard';

/** Flattens MDX list children (ul > li) into an array of item contents. */
function items(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement<{ children?: ReactNode }>(child)) return;
      const type = child.type as string | { isLi?: boolean };
      if (type === 'li' || (typeof type !== 'string' && type.isLi)) out.push(child.props.children);
      else walk(child.props.children);
    });
  };
  walk(children);
  return out;
}

export function Objectives({ children }: { children: ReactNode }) {
  const list = items(children);
  return (
    <aside className="not-prose my-8 border-y border-bone/25 py-5" aria-label="Learning objectives">
      <div className="label mb-3 text-madder">After this lesson you can</div>
      <ul className="grid gap-x-10 gap-y-2 sm:grid-cols-2">
        {list.map((it, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-snug">
            <span className="mt-[0.55em] h-[5px] w-[5px] shrink-0 rotate-45 bg-madder" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** The three to six things worth memorizing, set like a certificate. */
export function Remember({ children }: { children: ReactNode }) {
  const list = items(children);
  return (
    <aside className="not-prose plate relative my-10 overflow-hidden" aria-label="Remember">
      <Guilloche variant="seal" className="pointer-events-none absolute -right-20 -top-20 h-[260px] w-[260px]" opacity={0.55} />
      <div className="plate-head relative">
        <span className="label text-madder">Remember</span>
        <span className="label">{list.length} things</span>
      </div>
      <ol className="relative divide-y divide-bone/10 px-4 sm:px-5">
        {list.map((it, i) => (
          <li key={i} className="flex gap-4 py-3.5">
            <span className="figure w-8 shrink-0 text-[30px] text-madder">{i + 1}</span>
            <span className="pt-1 text-[15.5px] leading-snug">{it}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function Example({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="my-8 border-l border-bone/30 pl-5 sm:pl-7">
      <div className="label mb-2 text-brass">Worked example{title ? `: ${title}` : ''}</div>
      <div className="lesson-example">{children}</div>
    </section>
  );
}

export function Mistakes({ children }: { children: ReactNode }) {
  const list = items(children);
  return (
    <aside className="not-prose my-10" aria-label="Common mistakes">
      <div className="label mb-3 text-madder">Common mistakes</div>
      <ul className="border-t border-bone/25">
        {list.map((it, i) => (
          <li key={i} className="flex gap-4 border-b border-bone/15 py-3 text-[15px] leading-snug">
            <span className="num pt-0.5 text-[11px] text-madder" aria-hidden="true">✕</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** A displayed formula. Plain text set in the display italic, with an optional name. */
export function Formula({ name, children }: { name?: string; children: ReactNode }) {
  return (
    <figure className="not-prose my-7 border-y border-bone/20 py-5 text-center">
      <div className="display-i text-[22px] leading-snug sm:text-[28px]">{children}</div>
      {name && <figcaption className="label mt-3">{name}</figcaption>}
    </figure>
  );
}

/** Wraps an interactive widget inside lesson prose. */
export function Live({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="not-prose my-9 lg:-mx-10">
      <div className="mb-2 flex items-center gap-3">
        <span className="label text-verd">Live</span>
        {title && <span className="label">{title}</span>}
        <span className="h-px flex-1 bg-bone/20" />
      </div>
      {children}
    </div>
  );
}

export function Cards({ c, size = 'sm', label }: { c: string; size?: CardSize; label?: string }) {
  return (
    <span className="not-prose my-1 inline-flex flex-col gap-1 align-middle">
      <Hand cards={parseCards(c)} size={size} />
      {label && <span className="label">{label}</span>}
    </span>
  );
}

/** A row of labelled hands and a board, for setting a scene. */
export function Scene({ hands, board, labels }: { hands: string[]; board?: string; labels?: string[] }) {
  return (
    <div className="not-prose my-7 flex flex-wrap items-end gap-x-8 gap-y-4">
      {hands.map((h, i) => (
        <div key={i}>
          <div className="label mb-1.5">{labels?.[i] ?? (i === 0 ? 'You' : `Opponent${hands.length > 2 ? ` ${i}` : ''}`)}</div>
          <Hand cards={parseCards(h)} size="md" />
        </div>
      ))}
      {board !== undefined && (
        <div>
          <div className="label mb-1.5">Board</div>
          <Hand cards={parseCards(board)} size="md" />
        </div>
      )}
    </div>
  );
}

const HAND_RE = /^([2-9TJQKA][cdhs]){2}$/i;

function side(text: string, blocked: number[]): PlayerSpec {
  if (HAND_RE.test(text.replace(/\s/g, ''))) return { hands: [parseCards(text)] };
  const combos = expandRange(parseRange(text), blocked);
  return { hands: combos.map((c) => [c.c1, c.c2]), weights: combos.map((c) => c.w) };
}

/**
 * Inline engine-computed equity: <Eq a="AsAh" b="KsKh" /> renders the equity
 * of a against b. Either side may be a hand or a range. Exact when feasible.
 */
export function Eq({ a, b, board = '', digits = 1, of = 0 }: { a: string; b: string; board?: string; digits?: number; of?: 0 | 1 }) {
  const key = `eq|${a}|${b}|${board}`;
  const { data, error } = useCached(key, (api) => {
    const bd = parseCards(board);
    const req: EquityRequest = { game: 'holdem', players: [side(a, bd), side(b, bd)], board: bd, iterations: 600_000, seed: 1 };
    return api.equity(req);
  });
  if (error) return <span className="num text-madder">error</span>;
  if (!data) return <span className="num pending">··.·%</span>;
  return (
    <span className="whitespace-nowrap">
      <span className="num font-medium text-bone">{pct(data.players[of].equity, digits)}</span>
      <How>
        {data.method === 'exact' ? (
          <>Exact. {int(data.boards)} showdowns enumerated for {a} against {b}{board ? ` on ${board}` : ''}. Wins {pct(data.players[of].win, 2)}, ties {pct(data.players[of].tie, 2)}.</>
        ) : (
          <>Monte Carlo, {int(data.samples)} trials, seed {data.seed}. 95% interval {pct(data.players[of].ci![0], 2)} to {pct(data.players[of].ci![1], 2)}.</>
        )}
      </How>
    </span>
  );
}

/** Glossary term with a definition on hover, focus or tap. */
export function Term({ k, children }: { k?: string; children: ReactNode }) {
  const key = (k ?? (typeof children === 'string' ? children : '')).toLowerCase();
  const entry = GLOSSARY.find((g) => g.term.toLowerCase() === key || g.aka?.some((a) => a.toLowerCase() === key));
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!entry) return <>{children}</>;
  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="cursor-help border-b border-dotted border-brass text-inherit"
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        {children}
      </button>
      {open && (
        <span id={id} role="tooltip" className="plate absolute left-0 top-full z-40 mt-1 block w-[min(300px,80vw)] p-3 text-left text-[13px] leading-relaxed text-bone" style={{ background: 'rgb(var(--ink))' }}>
          <span className="label mb-1 block text-brass">{entry.term}</span>
          {entry.def}
        </span>
      )}
    </span>
  );
}

export function LessonLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="link" to={to}>{children}</Link>;
}

/** Small engine-backed table. Rows are computed by the caller. */
export function DataTable({ head, rows, caption, className }: { head: ReactNode[]; rows: ReactNode[][]; caption?: ReactNode; className?: string }) {
  return (
    <figure className={cx('not-prose my-7 overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-bone/40">
            {head.map((h, i) => (
              <th key={i} className={cx('label py-2 pr-4 font-normal', i > 0 && 'text-right')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-bone/10">
              {r.map((c, j) => (
                <td key={j} className={cx('py-2 pr-4 text-[14px]', j > 0 && 'num text-right text-[13px]')}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && <figcaption className="mt-2 text-[12px] text-dim">{caption}</figcaption>}
    </figure>
  );
}
