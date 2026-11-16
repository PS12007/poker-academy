import { useMemo, useState } from 'react';
import { parseCards, RANK_CHARS } from '../../engine/cards';
import { CATEGORY_NAMES } from '../../engine/evalCore';
import { describeHand } from '../../engine/describe';
import { boardTexture } from '../../engine/board';
import { outsOdds } from '../../engine/combinatorics';
import { evBluff } from '../../engine/ev';
import { classByName, HAND_CLASSES, parseRange, rangeFraction, countCombos } from '../../engine/ranges';
import { openRange, POSITION_NAMES, type Position } from '../../engine/teachingRanges';
import { Rng, randomSeed } from '../../engine/rng';
import { CardField } from '../cards/CardField';
import { Hand } from '../cards/PlayingCard';
import { RangeGrid } from '../range/RangeGrid';
import { Figure, How, Plate, Segmented, Slider, Working } from '../ui/primitives';
import { useCached } from '../../lib/engine';
import { cx, int, num, pct, signed } from '../../lib/format';

/* ------------------------------------------------------------ hand namer */
export function HandNamer({ start = 'AsKsQsJsTs' }: { start?: string }) {
  const [cards, setCards] = useState<number[]>(() => parseCards(start));
  const d = cards.length >= 5 ? describeHand(cards) : null;
  return (
    <Plate serial="LAB" title="Name that hand" right={d ? `rank ${int(d.rank)} of 7,462` : `${cards.length} of 5 to 7 cards`}>
      <CardField label="Pick five to seven cards" max={7} value={cards} onChange={setCards} marked={d?.best} defaultOpen />
      <div className="mt-5 border-t border-bone/15 pt-4">
        {d ? (
          <>
            <div className="display-i text-[30px] leading-tight sm:text-[38px]">{d.name}</div>
            <p className="mt-2 text-[13px] text-dim">
              {cards.length > 5 ? 'The five framed cards play. The rest are ignored.' : 'All five cards play.'} Rank 1 is the
              worst possible hand (7-5-4-3-2 in mixed suits) and 7,462 is a royal flush.
            </p>
          </>
        ) : (
          <p className="text-dim">Pick at least five cards.</p>
        )}
      </div>
    </Plate>
  );
}

/* --------------------------------------------------------- ranking table */
const EXAMPLES = ['Ks9d7h4c2s', 'JsJd9h6c3s', 'AsAd8h8c4s', '7s7d7hKc2s', '9s8d7h6c5s', 'As9s7s4s2s', 'KsKdKh7c7s', 'QsQdQhQc5s', '9h8h7h6h5h'];

export function RankingTable() {
  const { data } = useCached('fiveCardCounts', (api) => api.fiveCardCounts());
  const total = 2_598_960;
  return (
    <Plate
      serial="TAB"
      title="The nine categories, strongest first"
      right={data ? <span className="num normal-case tracking-normal">all 2,598,960 hands counted in {data.ms} ms</span> : <span className="pending">counting every 5-card hand</span>}
      pad={false}
    >
      <ol>
        {[8, 7, 6, 5, 4, 3, 2, 1, 0].map((cat, i) => {
          const n = data?.counts[cat];
          return (
            <li key={cat} className="grid grid-cols-[1.8rem_1fr] items-center gap-x-3 border-b border-bone/10 px-4 py-3 last:border-0 sm:grid-cols-[1.8rem_11rem_1fr_auto] sm:px-5">
              <span className="num text-[10px] text-faint">{i + 1}</span>
              <div>
                <div className="text-[15px] font-medium">{CATEGORY_NAMES[cat]}</div>
                <div className="num text-[10.5px] text-dim sm:hidden">{n ? `${int(n)} hands · 1 in ${int(total / n)}` : '···'}</div>
              </div>
              <div className="col-start-2 mt-2 sm:col-start-3 sm:mt-0"><Hand cards={parseCards(EXAMPLES[cat])} size="xs" /></div>
              <div className="num hidden text-right text-[11px] leading-relaxed sm:block">
                <div className={cx(!n && 'pending')}>{n ? int(n) : '·······'} hands</div>
                <div className="text-dim">{n ? `${pct(n / total, n / total < 0.001 ? 4 : 2)} · 1 in ${int(total / n)}` : ''}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </Plate>
  );
}

/* ---------------------------------------------------------- table diagram */
const SEATS: { pos: Position; x: number; y: number; note: string }[] = [
  { pos: 'UTG', x: 22, y: 20, note: 'First to act before the flop, with five players still to act behind. Needs the strongest hands.' },
  { pos: 'HJ', x: 50, y: 9, note: 'Four players behind. Still an early seat. Open a little wider than under the gun.' },
  { pos: 'CO', x: 78, y: 20, note: 'Only the button can act after you postflop. The second most profitable seat.' },
  { pos: 'BTN', x: 85, y: 68, note: 'Acts last on the flop, turn and river, every hand. Sees what everyone does before deciding. The most profitable seat by a wide margin.' },
  { pos: 'SB', x: 50, y: 88, note: 'Posts half a big blind blind, then acts first on every postflop street. The worst seat at the table.' },
  { pos: 'BB', x: 15, y: 68, note: 'Posts one big blind. Gets a discount to call and closes the action before the flop, but plays out of position afterward.' },
];

export function TableDiagram() {
  const [sel, setSel] = useState<Position>('BTN');
  const [street, setStreet] = useState<'pre' | 'post'>('pre');
  const order: Position[] = street === 'pre' ? ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] : ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];
  const seat = SEATS.find((s) => s.pos === sel)!;
  return (
    <Plate serial="MAP" title="Six-handed table" right={<Segmented label="Street" value={street} onChange={setStreet} options={[{ value: 'pre', label: 'Before the flop' }, { value: 'post', label: 'After the flop' }]} />}>
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="relative mx-auto aspect-[16/11] w-full max-w-[460px]">
          <svg viewBox="0 0 160 110" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <ellipse cx="80" cy="55" rx="58" ry="33" fill="rgb(var(--verd) / 0.07)" stroke="rgb(var(--bone) / 0.5)" strokeWidth="0.5" />
            <ellipse cx="80" cy="55" rx="54" ry="29.5" fill="none" stroke="rgb(var(--bone) / 0.2)" strokeWidth="0.3" strokeDasharray="0.6 1.2" />
            <text x="80" y="57" textAnchor="middle" fontSize="5" fill="rgb(var(--faint))" fontFamily="Martian Mono Variable, monospace" letterSpacing="0.6">
              {street === 'pre' ? 'ACTION →  CLOCKWISE' : 'BLINDS ACT FIRST'}
            </text>
          </svg>
          {SEATS.map((s) => {
            const n = order.indexOf(s.pos) + 1;
            const active = s.pos === sel;
            return (
              <button
                key={s.pos}
                type="button"
                onClick={() => setSel(s.pos)}
                aria-pressed={active}
                className={cx(
                  'absolute flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border font-mono transition-colors sm:h-[60px] sm:w-[60px]',
                  active ? 'border-madder bg-madder text-ink' : 'border-bone/40 bg-ink hover:border-bone',
                )}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                <span className="text-[12px] font-semibold tracking-wider">{s.pos}</span>
                <span className={cx('text-[8.5px]', active ? 'text-ink/80' : 'text-faint')}>acts {n}{n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}</span>
              </button>
            );
          })}
        </div>
        <div>
          <div className="label text-madder">{sel}</div>
          <div className="display mt-1 text-[32px]">{POSITION_NAMES[sel]}</div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-dim">{seat.note}</p>
          {sel !== 'BB' && (
            <p className="num mt-3 text-[11px] text-dim">
              teaching open range: {pct(rangeFraction(openRange(sel)))} of hands
            </p>
          )}
        </div>
      </div>
    </Plate>
  );
}

/* --------------------------------------------------------- starting chart */
export function StartingChart({ positions = ['UTG', 'HJ', 'CO', 'BTN', 'SB'], custom }: { positions?: Exclude<Position, 'BB'>[]; custom?: { label: string; range: string }[] }) {
  const options = custom ? custom.map((c) => ({ value: c.label, label: c.label })) : positions.map((p) => ({ value: p as string, label: p as string }));
  const [sel, setSel] = useState(options[options.length > 3 ? 3 : 0].value);
  const range = useMemo(() => (custom ? parseRange(custom.find((c) => c.label === sel)!.range) : openRange(sel as Exclude<Position, 'BB'>)), [sel, custom]);
  return (
    <Plate serial="CHT" title={custom ? 'Starting hands' : 'Opening range by position'} right={<Segmented label="Position" value={sel} onChange={setSel} options={options} />}>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_200px]">
        <RangeGrid range={range} compact label={`${sel} range`} />
        <div>
          <Figure size="lg" value={pct(rangeFraction(range), 1)} caption="of all starting hands" how={<>Combos in the range divided by 1,326. Pairs count 6 combos each, suited hands 4, offsuit hands 12. This range holds {num(countCombos(range), 0)} combos.</>} />
          <p className="mt-5 text-[13px] leading-relaxed text-dim">
            Raise these when everyone before you has folded. Fold the rest. Red cells are pairs, light cells suited hands
            (above the diagonal), grey cells offsuit hands (below it).
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-faint">
            A simplified teaching range written for this course. It is not solver output.
          </p>
        </div>
      </div>
    </Plate>
  );
}

/* ----------------------------------------------------------- board reader */
export function BoardReader({ start = 'JsTs9d' }: { start?: string }) {
  const [board, setBoard] = useState<number[]>(() => parseCards(start));
  const t = useMemo(() => (board.length >= 3 ? boardTexture(board) : null), [board]);
  const totalCombos = ((52 - board.length) * (51 - board.length)) / 2;
  const row = (label: string, n: number) => (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 py-2">
      <div>
        <div className="flex items-baseline justify-between text-[13.5px]">
          <span>{label}</span>
          <span className="num text-[11px] text-dim">{int(n)} holdings · {pct(n / totalCombos)}</span>
        </div>
        <div className="mt-1.5 h-px bg-bone/15"><div className="h-px bg-madder" style={{ width: `${Math.min(100, (n / totalCombos) * 400)}%` }} /></div>
      </div>
    </div>
  );
  return (
    <Plate serial="LAB" title="Read a board">
      <CardField label="Board" hint="3 to 5 cards" max={5} value={board} onChange={setBoard} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[['Dry', 'Ks7d2c'], ['Wet', 'JsTs9d'], ['Paired', '8s8d3c'], ['Monotone', 'Ah9h4h'], ['Low connected', '6s5d4c']].map(([l, b]) => (
          <button key={l} type="button" className="btn btn-sm" onClick={() => setBoard(parseCards(b))}>{l}</button>
        ))}
      </div>
      {t && (
        <div className="mt-5 grid gap-6 border-t border-bone/15 pt-5 md:grid-cols-2">
          <div>
            <div className="label">The nuts</div>
            <div className="display-i mt-1 text-[26px] leading-tight">{t.nuts.name}</div>
            <div className="mt-3 flex items-center gap-3">
              <Hand cards={t.nuts.holdings[0]} size="sm" />
              <span className="text-[13px] text-dim">
                {t.nuts.holdings.length === 1 ? 'The only holding that makes it.' : `One of ${int(t.nuts.holdings.length)} holdings that make it.`}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip">{t.suitLabel}</span>
              <span className="chip">{t.trips ? 'trips on board' : t.paired ? 'paired' : 'unpaired'}</span>
              <span className="chip">{RANK_CHARS[t.highCard]} high</span>
              <span className={cx('chip', t.wetness > 0.5 ? 'border-madder/60 text-madder' : '')}>{t.wetness > 0.66 ? 'wet' : t.wetness > 0.3 ? 'in between' : 'dry'}</span>
            </div>
          </div>
          <div className="divide-y divide-bone/10">
            {row('Already a straight', t.straightCombos)}
            {row('Already a flush', t.flushCombos)}
            {board.length < 5 && row('Flush draw', t.flushDrawCombos)}
            {board.length < 5 && row('Straight draw, 8+ outs', t.openEndedCombos)}
            <p className="pt-3 text-[12px] text-faint">Counted over all {int(totalCombos)} two-card holdings an opponent could have.</p>
          </div>
        </div>
      )}
    </Plate>
  );
}

/* ------------------------------------------------------------- outs table */
export function OutsTable({ rows = [1, 2, 3, 4, 5, 6, 8, 9, 12, 15, 17, 20] }: { rows?: number[] }) {
  return (
    <div className="not-prose my-7 overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr className="border-b border-bone/40 text-right">
            <th className="label py-2 text-left font-normal">Outs</th>
            <th className="label py-2 font-normal">Turn only</th>
            <th className="label py-2 font-normal">River only</th>
            <th className="label py-2 font-normal">Turn or river</th>
            <th className="label py-2 font-normal">Rule of 4</th>
            <th className="label py-2 font-normal">Corrected</th>
          </tr>
        </thead>
        <tbody className="num text-[12.5px]">
          {rows.map((n) => {
            const o = outsOdds(n);
            const err = Math.abs(o.rule4 - o.byRiverFromFlop);
            return (
              <tr key={n} className="border-b border-bone/10 text-right">
                <td className="py-1.5 text-left text-[14px] font-medium text-bone">{n}</td>
                <td className="py-1.5">{pct(o.nextCardFromFlop)}</td>
                <td className="py-1.5">{pct(o.nextCardFromTurn)}</td>
                <td className="py-1.5 text-bone">{pct(o.byRiverFromFlop)}</td>
                <td className={cx('py-1.5', err > 0.03 ? 'text-madder' : 'text-dim')}>{pct(o.rule4, 0)}</td>
                <td className="py-1.5 text-dim">{pct(o.rule4Corrected, 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-dim">Exact columns use 47 unseen cards on the flop and 46 on the turn. Red marks where the rule of 4 is off by more than three points.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- bluff EV */
export function BluffEV() {
  const [pot, setPot] = useState(100);
  const [bet, setBet] = useState(75);
  const [fold, setFold] = useState(40);
  const ev = evBluff(pot, bet, fold / 100);
  const need = bet / (pot + bet);
  return (
    <Plate serial="LAB" title="EV of a pure bluff">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Slider label="Pot" min={10} max={300} step={5} value={pot} onChange={setPot} />
          <Slider label="Your bet" min={5} max={600} step={5} value={bet} onChange={setBet} format={(v) => `${v} · ${pct(v / pot, 0)} pot`} />
          <Slider label="They fold" min={0} max={100} step={1} value={fold} onChange={setFold} format={(v) => `${v}%`} />
        </div>
        <div>
          <Figure size="lg" tone={ev >= 0 ? 'verd' : 'madder'} value={signed(ev, 1)} caption={ev >= 0 ? 'profitable bluff' : 'losing bluff'} />
          <p className="mt-3 text-[13px] text-dim">Break-even point: they must fold {pct(need)} of the time.</p>
        </div>
      </div>
      <div className="mt-5">
        <Working
          steps={[
            { label: 'They fold: you win the pot', expr: `${fold}% × +${pot}`, result: signed((fold / 100) * pot, 1) },
            { label: 'They call: you lose the bet', expr: `${100 - fold}% × −${bet}`, result: signed(-(1 - fold / 100) * bet, 1) },
            { label: 'EV is the sum', expr: `${num((fold / 100) * pot, 1)} − ${num((1 - fold / 100) * bet, 1)}`, result: signed(ev, 1) },
            { label: 'Break-even fold frequency = bet / (pot + bet)', expr: `${bet} / (${pot} + ${bet})`, result: pct(need) },
          ]}
        />
      </div>
    </Plate>
  );
}

/* ----------------------------------------------------------- combo counter */
export function ComboCounter({ start = 'AK', dead = '' }: { start?: string; dead?: string }) {
  const [text, setText] = useState(start);
  const [known, setKnown] = useState<number[]>(() => parseCards(dead));
  const classes = useMemo(() => {
    const t = text.trim();
    const names = /^[2-9TJQKA]{2}$/i.test(t) && t[0].toUpperCase() !== t[1].toUpperCase() ? [`${t.toUpperCase()}s`, `${t.toUpperCase()}o`] : [t.length === 3 ? t.slice(0, 2).toUpperCase() + t[2].toLowerCase() : t.toUpperCase()];
    const fixed = names.map((n) => {
      // Accept either rank order, e.g. KA.
      const a = RANK_CHARS.indexOf(n[0]), b = RANK_CHARS.indexOf(n[1]);
      return a < b ? n[1] + n[0] + n.slice(2) : n;
    });
    const found = fixed.map((n) => classByName(n)).filter((c): c is (typeof HAND_CLASSES)[number] => !!c);
    return found.length === names.length ? found : null;
  }, [text]);
  const used = new Set(known);
  const all = classes?.flatMap((c) => c.combos) ?? [];
  const live = all.filter(([a, b]) => !used.has(a) && !used.has(b));
  return (
    <Plate serial="LAB" title="Count the combos" right={classes ? `${all.length} before blockers` : undefined}>
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <div>
          <label className="label block" htmlFor="combo-hand">Hand</label>
          <input id="combo-hand" className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="AK, AKs, QQ" aria-invalid={!classes} spellCheck={false} />
          <div className="mt-2 flex flex-wrap gap-1">
            {['AA', 'AK', 'AKs', 'KQo', '76s'].map((h) => (
              <button key={h} type="button" className="btn btn-sm" onClick={() => setText(h)}>{h}</button>
            ))}
          </div>
        </div>
        <CardField label="Cards you can see" hint="your hand and the board" max={7} size="sm" value={known} onChange={setKnown} />
      </div>
      {classes ? (
        <div className="mt-5 border-t border-bone/15 pt-4">
          <div className="flex items-end gap-5">
            <Figure size="lg" tone="madder" value={live.length} caption={`of ${all.length} combos remain`} />
            {known.length > 0 && all.length > 0 && <div className="num pb-6 text-[12px] text-dim">{pct(1 - live.length / all.length, 0)} blocked</div>}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
            {all.map(([a, b]) => {
              const dead = used.has(a) || used.has(b);
              return <Hand key={`${a}-${b}`} cards={[a, b]} size="xs" className={dead ? 'opacity-20' : undefined} />;
            })}
          </div>
        </div>
      ) : (
        <p className="mt-5 text-[13px] text-madder">Type a hand like AK, AKs, T9o or QQ.</p>
      )}
    </Plate>
  );
}

/* --------------------------------------------------------- pot odds strip */
/** Draws the pot and the call as proportional blocks, so the fraction is visible. */
export function PotOddsStrip({ pot = 100, bet = 50 }: { pot?: number; bet?: number }) {
  const [b, setB] = useState(bet);
  const total = pot + b + b;
  const need = b / total;
  return (
    <Plate serial="LAB" title="Seeing pot odds">
      <Slider label={`Their bet into a pot of ${pot}`} min={5} max={pot * 2} step={5} value={b} onChange={setB} format={(v) => `${v} · ${pct(v / pot, 0)} pot`} />
      <div className="mt-5 flex h-12 w-full font-mono text-[10px] uppercase tracking-wider">
        <div className="flex items-center justify-center border border-bone/40 text-dim" style={{ width: `${(pot / total) * 100}%` }}>pot {pot}</div>
        <div className="flex items-center justify-center border border-l-0 border-bone/40 bg-bone/15" style={{ width: `${(b / total) * 100}%` }}>bet {b}</div>
        <div className="flex items-center justify-center bg-madder font-semibold text-ink" style={{ width: `${(b / total) * 100}%` }}>call {b}</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-5">
        <Figure
          value={pct(need)}
          tone="madder"
          caption="equity you need"
          how={<>Your call is the red block. The whole bar is the pot after you call. You need to win at least the red share of the time: {b} / ({pot} + {b} + {b}) = {pct(need, 2)}.</>}
        />
        <Figure value={`${num((pot + b) / b, 1)} to 1`} caption="the odds you are getting" />
      </div>
    </Plate>
  );
}

/* --------------------------------------------------------- inline helpers */
/** Engine-backed inline number with a derivation. */
export function Num({ v, how }: { v: string; how: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="num font-medium text-bone">{v}</span>
      <How>{how}</How>
    </span>
  );
}

/* --------------------------------------------------------------- deal demo */
export function DealDemo() {
  const [seed, setSeed] = useState(7);
  const deal = useMemo(() => {
    const deck = new Rng(seed).shuffle(Array.from({ length: 52 }, (_, i) => i));
    const hands = [deck.slice(0, 2), deck.slice(2, 4)];
    const board = deck.slice(4, 9);
    const d = hands.map((h) => describeHand([...h, ...board]));
    return { hands, board, d, winner: d[0].rank === d[1].rank ? -1 : d[0].rank > d[1].rank ? 0 : 1 };
  }, [seed]);
  return (
    <Plate serial="LAB" title="A whole hand in one click" right={<span className="num normal-case tracking-normal">seed {seed}</span>}>
      <div className="grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
        {[0, 1].map((p) => (
          <div key={p} className={p === 1 ? 'sm:order-3 sm:text-right' : undefined}>
            <div className="label mb-2">{p === 0 ? 'Player one' : 'Player two'}</div>
            <Hand cards={deal.hands[p]} size="lg" marked={deal.d[p].best} className={p === 1 ? 'sm:justify-end' : undefined} />
            <div className="display-i mt-3 text-[22px] leading-tight">{deal.d[p].name}</div>
            <div className={cx('label mt-1', deal.winner === p ? 'text-verd' : deal.winner === -1 ? 'text-brass' : 'text-faint')}>
              {deal.winner === p ? 'Wins the pot' : deal.winner === -1 ? 'Splits the pot' : 'Loses'}
            </div>
          </div>
        ))}
        <div className="sm:order-2">
          <div className="label mb-2 sm:text-center">Board</div>
          <Hand cards={deal.board} size="md" marked={deal.winner >= 0 ? deal.d[deal.winner].best : deal.d[0].best} />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-bone/15 pt-4">
        <p className="max-w-[52ch] text-[13px] text-dim">Each player makes the best five-card hand from their two cards plus the five on the board. Framed cards are the ones that play.</p>
        <button type="button" className="btn btn-primary" onClick={() => setSeed(randomSeed())}>Deal again</button>
      </div>
    </Plate>
  );
}

/* ---------------------------------------------------------- minimum raise */
export function MinRaiseCalc() {
  const [prev, setPrev] = useState(10);
  const [cur, setCur] = useState(30);
  const valid = cur > prev && prev >= 0;
  const increment = cur - prev;
  return (
    <Plate serial="LAB" title="The minimum raise">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Slider label="Bet before the last raise" min={0} max={200} step={5} value={prev} onChange={setPrev} />
          <Slider label="Bet you now face" min={5} max={400} step={5} value={cur} onChange={setCur} />
          <p className="text-[13px] text-dim">Set the first slider to 0 if the bet you face is the first bet of the round.</p>
        </div>
        <div>
          {valid ? (
            <>
              <Figure size="lg" tone="madder" value={cur + increment} caption="smallest legal raise, total" />
              <p className="mt-3 text-[13px] text-dim">Any total from {cur + increment} up to your whole stack is allowed in no-limit.</p>
            </>
          ) : (
            <p className="text-madder">The bet you face must be larger than the bet before it.</p>
          )}
        </div>
      </div>
      {valid && (
        <div className="mt-5">
          <Working
            steps={[
              { label: 'Size of the last bet or raise', expr: `${cur} − ${prev}`, result: increment },
              { label: 'Your raise must add at least that much on top', expr: `${cur} + ${increment}`, result: cur + increment },
              { label: 'To just call you put in', expr: `match ${cur}`, result: cur },
            ]}
          />
        </div>
      )}
    </Plate>
  );
}
