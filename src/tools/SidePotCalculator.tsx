import { useMemo, useState } from 'react';
import { awardPots } from '../engine/sidePots';
import { Plate } from '../components/ui/primitives';
import { cx, num } from '../lib/format';

interface Row {
  name: string;
  committed: number;
  folded: boolean;
  /** 1 is the best hand at showdown. */
  place: number;
}

const START: Row[] = [
  { name: 'Ana', committed: 50, folded: false, place: 1 },
  { name: 'Ben', committed: 150, folded: false, place: 2 },
  { name: 'Cho', committed: 300, folded: false, place: 3 },
  { name: 'Dev', committed: 20, folded: true, place: 4 },
];

export default function SidePotCalculator({ embedded }: { embedded?: boolean }) {
  const [rows, setRows] = useState<Row[]>(START);
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const result = useMemo(
    () => awardPots(rows.map((r) => ({ committed: Math.max(0, r.committed), folded: r.folded, rank: 100 - r.place }))),
    [rows],
  );
  const total = rows.reduce((s, r) => s + Math.max(0, r.committed), 0);
  // Uncalled chips: a single-player top pot is simply returned.
  const live = rows.filter((r) => !r.folded);

  return (
    <div className={embedded ? 'space-y-6' : 'grid gap-6 xl:grid-cols-2'}>
      <Plate serial="IN" title="Chips put in over the whole hand" right={`${rows.length} players`}>
        <div className="grid grid-cols-[1fr_5.5rem_4.5rem_3.2rem] items-end gap-x-3 gap-y-1">
          <span className="label">Player</span>
          <span className="label">Chips in</span>
          <span className="label">Hand</span>
          <span className="label text-right">Fold</span>
          {rows.map((r, i) => (
            <div key={i} className="contents">
              <input className="field" value={r.name} aria-label={`Player ${i + 1} name`} onChange={(e) => set(i, { name: e.target.value })} />
              <input className="field" type="number" min={0} value={r.committed} aria-label={`${r.name} chips in`} onChange={(e) => set(i, { committed: Number(e.target.value) })} />
              <select className="field" value={r.place} disabled={r.folded} aria-label={`${r.name} hand strength`} onChange={(e) => set(i, { place: Number(e.target.value) })}>
                {rows.map((_, k) => (
                  <option key={k} value={k + 1} className="bg-ink">{k === 0 ? 'Best' : `${k + 1}${k === 1 ? 'nd' : k === 2 ? 'rd' : 'th'}`}</option>
                ))}
              </select>
              <label className="flex h-full items-center justify-end">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--madder))]" checked={r.folded} onChange={(e) => set(i, { folded: e.target.checked })} aria-label={`${r.name} folded`} />
              </label>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn btn-sm" disabled={rows.length >= 9} onClick={() => setRows((rs) => [...rs, { name: `Player ${rs.length + 1}`, committed: 100, folded: false, place: rs.length + 1 }])}>+ Player</button>
          <button type="button" className="btn btn-sm" disabled={rows.length <= 2} onClick={() => setRows((rs) => rs.slice(0, -1))}>− Player</button>
        </div>
        <p className="mt-4 text-[13px] text-dim">Give two players the same hand rank to see a split pot.</p>
      </Plate>

      <Plate serial="OUT" title="Pots" right={`${num(total, 0)} chips in play`}>
        {live.length < 1 ? (
          <p className="text-dim">Somebody has to stay in.</p>
        ) : (
          <>
            <ol className="divide-y divide-bone/10 border-y border-bone/15">
              {result.pots.map((p, i) => {
                const returned = p.eligible.length === 1 && result.pots.length > 1;
                return (
                  <li key={i} className="grid grid-cols-[5.5rem_1fr_auto] items-baseline gap-3 py-3">
                    <span className="label text-madder">{i === 0 ? 'Main pot' : `Side pot ${i}`}</span>
                    <span className="text-[14px]">
                      {returned ? (
                        <>Uncalled. Returned to <strong>{rows[p.eligible[0]].name}</strong>.</>
                      ) : (
                        <>
                          <span className="text-dim">Contested by</span> {p.eligible.map((e) => rows[e].name).join(', ')}.{' '}
                          <span className="text-dim">Won by</span> <strong>{p.winners.map((w) => rows[w].name).join(' and ')}</strong>
                          {p.winners.length > 1 ? ', split' : ''}.
                        </>
                      )}
                    </span>
                    <span className="figure text-[26px]">{num(p.amount, 0)}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {rows.map((r, i) => {
                const net = result.payouts[i] - Math.max(0, r.committed);
                return (
                  <div key={i}>
                    <div className="label truncate">{r.name}</div>
                    <div className={cx('num text-[15px]', net > 0 ? 'text-verd' : net < 0 ? 'text-madder' : 'text-dim')}>
                      {net > 0 ? '+' : net < 0 ? '−' : ''}{num(Math.abs(net), 0)}
                    </div>
                    <div className="num text-[10px] text-faint">collects {num(result.payouts[i], 0)}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-[13px] leading-relaxed text-dim">
              Method: sort the amounts put in by players still in the hand. Each distinct amount is a layer. Everyone,
              folded or not, pays into a layer up to that amount, and only players who put in at least that much can win it.
            </p>
          </>
        )}
      </Plate>
    </div>
  );
}
