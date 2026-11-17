import { useMemo, useState } from 'react';
import { callDecision, finishProbabilities, icmEquity } from '../engine/icm';
import { Figure, Plate, Working } from '../components/ui/primitives';
import { cx, int, num, pct } from '../lib/format';

interface Row {
  name: string;
  stack: number;
}

const START: Row[] = [
  { name: 'Ana', stack: 5000 },
  { name: 'Ben', stack: 3000 },
  { name: 'Cho', stack: 1500 },
  { name: 'Dev', stack: 500 },
];

export interface IcmProps {
  initial?: { stacks?: number[]; payouts?: number[] };
  embedded?: boolean;
}

export default function IcmCalculator({ initial, embedded }: IcmProps) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.stacks ? initial.stacks.map((s, i) => ({ name: ['Ana', 'Ben', 'Cho', 'Dev', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy'][i] ?? `P${i + 1}`, stack: s })) : START,
  );
  const [payText, setPayText] = useState((initial?.payouts ?? [50, 30, 20]).join(', '));
  const [shover, setShover] = useState(0);
  const [caller, setCaller] = useState(1);
  const [dead, setDead] = useState(0);

  const payouts = useMemo(() => payText.split(/[,\s]+/).map(Number).filter((x) => Number.isFinite(x) && x >= 0), [payText]);
  const stacks = rows.map((r) => Math.max(0, r.stack));
  const total = stacks.reduce((a, b) => a + b, 0);
  const prize = payouts.reduce((a, b) => a + b, 0);
  const ok = total > 0 && payouts.length > 0 && rows.length >= 2;
  const eq = useMemo(() => (ok ? icmEquity(stacks, payouts) : []), [ok, stacks.join(), payouts.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const probs = useMemo(() => (ok ? finishProbabilities(stacks, Math.min(payouts.length, rows.length)) : []), [ok, stacks.join(), payouts.length, rows.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const valid = ok && shover !== caller && shover < rows.length && caller < rows.length && stacks[shover] > 0 && stacks[caller] > 0;
  const d = valid ? callDecision({ stacks, payouts, shover, caller, dead }) : null;
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className={embedded ? 'space-y-6' : 'grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'}>
      <div className="space-y-6">
        <Plate serial="IN" title="Stacks and payouts" right={`${int(total)} chips`}>
          <div className="grid grid-cols-[1fr_7rem] items-end gap-x-4 gap-y-1">
            <span className="label">Player</span>
            <span className="label">Chips</span>
            {rows.map((r, i) => (
              <div key={i} className="contents">
                <input className="field" value={r.name} aria-label={`Player ${i + 1} name`} onChange={(e) => set(i, { name: e.target.value })} />
                <input className="field" type="number" min={0} value={r.stack} aria-label={`${r.name} chips`} onChange={(e) => set(i, { stack: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn btn-sm" disabled={rows.length >= 9} onClick={() => setRows((rs) => [...rs, { name: `P${rs.length + 1}`, stack: 1000 }])}>+ Player</button>
            <button type="button" className="btn btn-sm" disabled={rows.length <= 2} onClick={() => { setRows((rs) => rs.slice(0, -1)); setShover(0); setCaller(1); }}>− Player</button>
          </div>
          <div className="mt-6">
            <label className="label block" htmlFor="icm-pay">Payouts, first place first</label>
            <input id="icm-pay" className="field" value={payText} onChange={(e) => setPayText(e.target.value)} aria-invalid={!payouts.length} placeholder="50, 30, 20" />
            <p className="mt-2 text-[12.5px] text-dim">Any units: money, percentages or buy-ins. Prize pool {num(prize, 0)}.</p>
          </div>
        </Plate>

        <Plate serial="EQ" title="Prize equity" pad={false}>
          {!ok ? (
            <p className="p-5 text-dim">Enter at least two stacks and one payout.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-bone/40">
                  <th className="label px-4 py-2 text-left font-normal sm:px-5">Player</th>
                  <th className="label py-2 pr-3 text-right font-normal">Chips</th>
                  <th className="label py-2 pr-3 text-right font-normal">Prize equity</th>
                  <th className="label hidden py-2 pr-3 text-right font-normal sm:table-cell">Chip share of pool</th>
                  <th className="label py-2 pr-4 text-right font-normal sm:pr-5">P(1st)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const chip = (stacks[i] / total) * prize;
                  return (
                    <tr key={i} className="border-b border-bone/10">
                      <td className="px-4 py-2 text-[14px] sm:px-5">{r.name}</td>
                      <td className="num py-2 pr-3 text-right text-[13px]">{int(stacks[i])}</td>
                      <td className="num py-2 pr-3 text-right text-[14px] text-bone">{num(eq[i], 2)}</td>
                      <td className={cx('num hidden py-2 pr-3 text-right text-[12px] sm:table-cell', eq[i] > chip ? 'text-verd' : 'text-madder')}>{num(chip, 2)}</td>
                      <td className="num py-2 pr-4 text-right text-[12px] text-dim sm:pr-5">{pct(probs[i]?.[0] ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {ok && (
            <p className="px-4 py-3 text-[12.5px] leading-relaxed text-dim sm:px-5">
              Short stacks are worth more than their chip share (green) and big stacks less (red). Method: Malmuth-Harville.
              P(first) is chip share. Each lower place is assigned the same way among the players left, over every order.
            </p>
          )}
        </Plate>
      </div>

      <Plate serial="CALL" title="Call or fold an all-in">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="label block" htmlFor="icm-shover">Shover</label>
            <select id="icm-shover" className="field" value={shover} onChange={(e) => setShover(Number(e.target.value))}>
              {rows.map((r, i) => <option key={i} value={i} className="bg-ink">{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label block" htmlFor="icm-caller">Caller (you)</label>
            <select id="icm-caller" className="field" value={caller} onChange={(e) => setCaller(Number(e.target.value))}>
              {rows.map((r, i) => <option key={i} value={i} className="bg-ink">{r.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label block" htmlFor="icm-dead">Dead money in pot</label>
            <input id="icm-dead" className="field" type="number" min={0} value={dead} onChange={(e) => setDead(Math.max(0, Number(e.target.value)))} />
          </div>
        </div>
        <p className="mt-2 text-[12.5px] text-dim">Stacks as they stand before the shove. Dead money is blinds and antes from players who folded, and it goes to whoever wins.</p>

        {!d ? (
          <p className="mt-6 text-madder">Choose two different players who both have chips.</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Figure size="lg" tone="madder" value={pct(d.requiredEquity)} caption="equity needed under ICM" />
              <Figure size="md" value={pct(d.chipRequired)} caption="needed in chips alone" />
              <Figure size="md" value={num(d.bubbleFactor, 2)} caption="bubble factor" />
            </div>
            <div className="mt-6">
              <Working
                steps={[
                  { label: `${rows[caller].name} folds: prize equity`, expr: 'ICM of stacks after folding', result: num(d.foldEquity, 2) },
                  { label: 'Calls and wins', expr: `doubles through by ${int(Math.min(stacks[shover], stacks[caller]))}${dead ? ` plus ${int(dead)} dead` : ''}`, result: num(d.winEquity, 2) },
                  { label: 'Calls and loses', expr: 'loses the same chips', result: num(d.loseEquity, 2) },
                  { label: 'Gain from winning', expr: `${num(d.winEquity, 2)} − ${num(d.foldEquity, 2)}`, result: num(d.winEquity - d.foldEquity, 2) },
                  { label: 'Cost of losing', expr: `${num(d.foldEquity, 2)} − ${num(d.loseEquity, 2)}`, result: num(d.foldEquity - d.loseEquity, 2) },
                  { label: 'Equity needed = cost / (gain + cost)', expr: `${num(d.foldEquity - d.loseEquity, 2)} / ${num(d.winEquity - d.loseEquity, 2)}`, result: pct(d.requiredEquity) },
                ]}
              />
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-dim">
              The bubble factor is the cost of losing divided by the gain from winning. Above 1, chips you lose are worth
              more than chips you win, so you need more than chip pot odds to call. Compare the equity needed with your
              hand's equity against the shover's range in the equity calculator.
            </p>
          </>
        )}
      </Plate>
    </div>
  );
}
