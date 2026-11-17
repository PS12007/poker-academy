import { useMemo, useState } from 'react';
import { replayStreet, type PotLimitAction } from '../engine/potLimit';
import { Figure, NumberField, Plate, Working } from '../components/ui/primitives';
import { cx, num } from '../lib/format';

type Kind = PotLimitAction['kind'];

export interface PotLimitProps {
  initial?: { pot?: number; preflop?: boolean };
  embedded?: boolean;
}

/** Enter a street of pot-limit action one step at a time and see the legal range at each point. */
export default function PotLimitCalculator({ initial, embedded }: PotLimitProps) {
  const [preflop, setPreflop] = useState(initial?.preflop ?? true);
  const [pot, setPot] = useState(initial?.pot ?? 20);
  const [bb, setBb] = useState(2);
  const [players, setPlayers] = useState(6);
  const [actions, setActions] = useState<PotLimitAction[]>([]);
  const [size, setSize] = useState<string>('');

  // Preflop: seat 0 is the small blind, seat 1 the big blind, action starts at seat 2. Postflop: seat 0 first.
  const start = preflop ? [bb / 2, bb] : [];
  const potStart = preflop ? 0 : pot;
  const result = useMemo(() => {
    try {
      return { steps: replayStreet(potStart, actions, bb, start), error: null as string | null };
    } catch (e) {
      return { steps: [], error: e instanceof Error ? e.message : String(e) };
    }
  }, [potStart, actions, bb, start.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const folded = new Set(actions.filter((a) => a.kind === 'fold').map((a) => a.player));
  const order = Array.from({ length: players }, (_, i) => (preflop ? (i + 2) % players : i));
  const next = (() => {
    if (!actions.length) return order[0];
    const last = actions[actions.length - 1].player;
    let k = order.indexOf(last);
    for (let n = 0; n < players; n++) {
      k = (k + 1) % players;
      if (!folded.has(order[k])) return order[k];
    }
    return order[0];
  })();
  // Preview of the next player's options.
  const preview = useMemo(() => {
    try {
      return replayStreet(potStart, [...actions, { player: next, kind: 'call' }], bb, start).at(-1)!;
    } catch {
      return null;
    }
  }, [potStart, actions, next, bb, start.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = (p: number) => (preflop ? (p === 0 ? 'SB' : p === 1 ? 'BB' : `Seat ${p + 1}`) : `Seat ${p + 1}`);
  const act = (kind: Kind, to?: number) => {
    setActions((a) => [...a, { player: next, kind, to }]);
    setSize('');
  };
  const potAfterCalls = preview ? preview.working.potBefore : 0;

  return (
    <div className={embedded ? 'space-y-6' : 'grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]'}>
      <Plate serial="IN" title="Setup">
        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-2 flex gap-2">
            <button type="button" className={cx('btn btn-sm', preflop && 'btn-primary')} onClick={() => { setPreflop(true); setActions([]); }}>Preflop</button>
            <button type="button" className={cx('btn btn-sm', !preflop && 'btn-primary')} onClick={() => { setPreflop(false); setActions([]); }}>Flop, turn or river</button>
          </div>
          <NumberField label="Big blind" value={bb} onChange={(v) => { setBb(Math.max(0.01, v)); setActions([]); }} min={0} />
          {preflop ? (
            <NumberField label="Players" value={players} onChange={(v) => { setPlayers(Math.max(2, Math.min(9, Math.round(v)))); setActions([]); }} min={2} max={9} />
          ) : (
            <NumberField label="Pot at the start of the street" value={pot} onChange={(v) => { setPot(Math.max(0, v)); setActions([]); }} min={0} />
          )}
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-dim">
          The largest legal raise is the pot after you call: call first, then raise the size of the pot that results.
          Press the buttons in order to enter the action, and the calculator shows the legal range for the player to act.
        </p>
      </Plate>

      <div className="space-y-6">
        <Plate serial="ACT" title={`${name(next)} to act`} right={`pot ${num(potAfterCalls, 2)}`}>
          {preview ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Figure size="md" value={num(preview.toCall, 2)} caption="to call" />
                <Figure size="md" value={num(preview.minTo, 2)} caption="minimum bet or raise to" />
                <Figure size="lg" tone="madder" value={num(preview.maxTo, 2)} caption="maximum, pot-limit" />
              </div>
              <div className="mt-5">
                <Working
                  steps={[
                    { label: 'Pot now, including all bets on this street', expr: '', result: num(preview.working.potBefore, 2) },
                    { label: 'Call first', expr: `+ ${num(preview.working.call, 2)}`, result: num(preview.working.potBefore + preview.working.call, 2) },
                    { label: 'Then raise by the size of that pot', expr: `${num(preview.toCall, 2)} call + ${num(preview.working.raiseBy, 2)} raise`, result: `to ${num(preview.maxTo, 2)}` },
                  ]}
                />
              </div>
              <div className="mt-5 flex flex-wrap items-end gap-2">
                {preview.toCall > 0 ? (
                  <>
                    <button type="button" className="btn btn-sm" onClick={() => act('fold')}>Fold</button>
                    <button type="button" className="btn btn-sm" onClick={() => act('call')}>Call {num(preview.toCall, 2)}</button>
                  </>
                ) : (
                  <button type="button" className="btn btn-sm" onClick={() => act('check')}>Check</button>
                )}
                <button type="button" className="btn btn-sm btn-primary" onClick={() => act(preview.toCall > 0 || preflop ? 'raise' : 'bet')}>Pot it: to {num(preview.maxTo, 2)}</button>
                <div className="flex items-end gap-2">
                  <input className="field w-24" inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} placeholder="custom" aria-label="Custom bet or raise total" />
                  <button type="button" className="btn btn-sm" disabled={!(Number(size) > 0)} onClick={() => act(preview.toCall > 0 || preflop ? 'raise' : 'bet', Number(size))}>Bet to</button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-dim">No legal action.</p>
          )}
          {result.error && <p className="mt-3 text-[13px] text-madder" role="alert">{result.error}. Undo the last action.</p>}
        </Plate>

        <Plate serial="LOG" title="Action so far" right={actions.length ? <span className="flex gap-3"><button type="button" className="hover:text-bone" onClick={() => setActions((a) => a.slice(0, -1))}>Undo</button><button type="button" className="hover:text-bone" onClick={() => setActions([])}>Clear</button></span> : undefined} pad={false}>
          {!result.steps.length ? (
            <p className="p-5 text-[14px] text-dim">{preflop ? `Blinds posted: ${num(bb / 2, 2)} and ${num(bb, 2)}.` : `Pot ${num(pot, 2)}.`} No action yet.</p>
          ) : (
            <ol>
              {result.steps.map((s, i) => (
                <li key={i} className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-3 border-b border-bone/10 px-4 py-2.5 last:border-0 sm:px-5">
                  <span className="label">{name(s.player)}</span>
                  <span className="text-[14px]">
                    {s.kind === 'call' ? `calls ${num(s.toCall, 2)}` : s.kind === 'bet' || s.kind === 'raise' ? `${s.kind === 'bet' ? 'bets' : 'raises'} to ${num(s.after, 2)}` : s.kind === 'check' ? 'checks' : 'folds'}
                    {(s.kind === 'bet' || s.kind === 'raise') && Math.abs(s.after - s.maxTo) < 1e-9 && <span className="label ml-2 text-madder">pot</span>}
                  </span>
                  <span className="num text-[11px] text-dim">pot {num(s.potAfter, 2)} · max was {num(s.maxTo, 2)}</span>
                </li>
              ))}
            </ol>
          )}
        </Plate>
      </div>
    </div>
  );
}
