import MiniSearch from 'minisearch';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_LESSONS, lessonPath } from '../../content/curriculum';
import { GLOSSARY } from '../../content/glossary';
import { FORMULAS } from '../../content/formulas';
import { TOOLS } from '../../tools/registry';
import { DRILLS } from '../../trainers/registry';
import { cx } from '../../lib/format';

interface Doc {
  id: string;
  kind: 'Lesson' | 'Term' | 'Instrument' | 'Drill' | 'Formula';
  title: string;
  text: string;
  to: string;
}

function buildDocs(): Doc[] {
  const docs: Doc[] = [];
  for (const l of ALL_LESSONS)
    if (l.available) docs.push({ id: `l:${l.key}`, kind: 'Lesson', title: l.title, text: `${l.gist} ${l.module.title} ${l.level}`, to: lessonPath(l) });
  for (const g of GLOSSARY) docs.push({ id: `g:${g.term}`, kind: 'Term', title: g.term, text: `${g.def} ${(g.aka ?? []).join(' ')}`, to: '/reference/glossary' });
  for (const t of TOOLS) if (t.component) docs.push({ id: `t:${t.id}`, kind: 'Instrument', title: t.title, text: t.blurb, to: `/tools/${t.id}` });
  for (const d of DRILLS) if (d.component) docs.push({ id: `d:${d.id}`, kind: 'Drill', title: d.title, text: d.blurb, to: `/drills/${d.id}` });
  for (const f of FORMULAS) docs.push({ id: `f:${f.name}`, kind: 'Formula', title: f.name, text: `${f.formula} ${f.note}`, to: '/reference/formulas' });
  return docs;
}

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const { index, docs } = useMemo(() => {
    const docs = buildDocs();
    const index = new MiniSearch<Doc>({ fields: ['title', 'text'], storeFields: ['kind', 'title', 'to', 'text'], searchOptions: { boost: { title: 3 }, prefix: true, fuzzy: 0.2 } });
    index.addAll(docs);
    return { index, docs };
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) return docs.filter((d) => d.kind === 'Instrument').slice(0, 8);
    return index.search(q).slice(0, 12).map((r) => r as unknown as Doc);
  }, [q, index, docs]);

  useEffect(() => {
    input.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  useEffect(() => setSel(0), [q]);

  const go = (d?: Doc) => {
    if (!d) return;
    navigate(d.to);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/80 px-4 pt-[12vh] backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label="Search" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="plate w-full max-w-[640px] bg-ink" style={{ background: 'rgb(var(--ink))' }}>
        <div className="flex items-center gap-3 border-b border-bone/20 px-4">
          <span className="label text-madder">Find</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              else if (e.key === 'Enter') go(results[sel]);
            }}
            placeholder="Lessons, terms, instruments, formulas"
            aria-label="Search"
            className="w-full bg-transparent py-4 font-display text-[22px] text-bone outline-none placeholder:text-faint"
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Esc</button>
        </div>
        <ul className="max-h-[56vh] overflow-y-auto" role="listbox">
          {results.length === 0 && <li className="px-4 py-6 text-[14px] text-dim">Nothing matches.</li>}
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === sel}>
              <button
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => go(r)}
                className={cx('flex w-full items-baseline gap-4 border-b border-bone/10 px-4 py-3 text-left', i === sel && 'bg-bone/[0.07]')}
              >
                <span className={cx('label w-20 shrink-0', i === sel && 'text-madder')}>{r.kind}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px]">{r.title}</span>
                  <span className="block truncate text-[12.5px] text-dim">{r.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="label flex gap-4 px-4 py-2 text-faint">
          <span>↑ ↓ to move</span><span>Enter to open</span><span>/ to search anywhere</span>
        </div>
      </div>
    </div>
  );
}
