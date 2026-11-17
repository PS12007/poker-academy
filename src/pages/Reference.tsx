import { useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { GLOSSARY } from '../content/glossary';
import { FORMULAS } from '../content/formulas';
import { ALL_LESSONS, lessonPath } from '../content/curriculum';
import { holdemStartingHandFacts, probFlopFlush, probFlopPairOrBetterUnpaired, probFlopSetOrBetter, probFlushByRiver } from '../engine/combinatorics';
import { potOdds } from '../engine/ev';
import { omahaOuts } from '../engine/omaha';
import { maxRaiseTo } from '../engine/potLimit';
import { parseCards } from '../engine/cards';
import { alpha, bluffFraction, mdf } from '../engine/theory';
import { PageHeader, Plate } from '../components/ui/primitives';
import { Eq } from '../components/lesson/blocks';
import { OutsTable, RankingTable } from '../components/lesson/widgets';
import { C } from '../components/cards/PlayingCard';
import { cx, num, oddsText, pct } from '../lib/format';

const SECTIONS = [
  { id: 'glossary', label: 'Glossary' },
  { id: 'cheatsheets', label: 'Cheat sheets' },
  { id: 'formulas', label: 'Formulas' },
  { id: 'engine', label: 'Engine notes' },
];

const lessonLink = (key?: string) => {
  const l = ALL_LESSONS.find((x) => x.key === key);
  return l?.available ? <Link className="link" to={lessonPath(l)}>{l.title}</Link> : l ? <span className="text-faint">{l.title} (soon)</span> : null;
};

function Glossary() {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return GLOSSARY.filter((g) => !s || g.term.toLowerCase().includes(s) || g.def.toLowerCase().includes(s) || g.aka?.some((a) => a.toLowerCase().includes(s)));
  }, [q]);
  return (
    <div>
      <div className="mb-6 max-w-sm">
        <label className="label block" htmlFor="gloss-q">Filter {GLOSSARY.length} terms</label>
        <input id="gloss-q" className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="type a term" />
      </div>
      <dl className="grid gap-x-12 border-t border-bone/30 md:grid-cols-2">
        {list.map((g) => (
          <div key={g.term} className="border-b border-bone/15 py-4">
            <dt className="flex items-baseline gap-3">
              <span className="display text-[24px]">{g.term}</span>
              {g.aka && <span className="label">{g.aka.join(' · ')}</span>}
            </dt>
            <dd className="mt-1 text-[14.5px] leading-relaxed text-dim">
              {g.def} {g.lesson && <span className="text-[13px]">{lessonLink(g.lesson)}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {list.length === 0 && <p className="mt-6 text-dim">No term matches.</p>}
    </div>
  );
}

const SIZES: [number, string][] = [[0.25, '¼ pot'], [0.33, '⅓ pot'], [0.5, '½ pot'], [0.66, '⅔ pot'], [0.75, '¾ pot'], [1, 'pot'], [1.5, '1.5× pot'], [2, '2× pot']];
const WRAPS: [string, string][] = [
  ['JsTd4c3h', 'Open-ended, two cards'],
  ['QsJdTc6h', 'Three cards above the board'],
  ['JsTd6c3h', 'Two above, one below'],
  ['JsTd7c3h', 'Two above, one in the gap'],
  ['QsJdTc7h', 'Three above, one below'],
  ['JsTd7c6h', 'The full wrap'],
];

const MATCHUPS: [string, string, string][] = [
  ['AsAh', 'KsKh', 'Pair over pair'],
  ['AsKs', 'QhQd', 'Two overcards (suited) against a pair'],
  ['AsKd', '2h2c', 'Two overcards against a small pair'],
  ['AsKd', 'AhQc', 'Dominated kicker'],
  ['QsQh', 'AdQc', 'Pair against one overcard, dominated'],
  ['AsKd', '8h7h', 'Two overcards against suited connectors'],
  ['AsAh', '8h7h', 'Aces against suited connectors'],
  ['AsAh', '7d2c', 'Best against worst'],
  ['Kh9c', '7s6s', 'Two high cards against two low'],
];

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-bone/40">{head.map((h, i) => <th key={h} className={cx('label py-2 pr-3 font-normal', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-bone/10">
              {r.map((c, j) => <td key={j} className={cx('py-1.5 pr-3', j ? 'num text-right text-[12.5px]' : 'text-[14px]')}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheatSheets() {
  const f = useMemo(() => holdemStartingHandFacts(), []);
  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between gap-4">
        <p className="max-w-[60ch] text-[14px] text-dim">Every figure on these sheets is computed when the page opens. Print them or save as PDF from the print dialog.</p>
        <button type="button" className="btn btn-sm" onClick={() => window.print()}>Print or save PDF</button>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Plate serial="CS-1" title="Outs to odds"><OutsTable /></Plate>
        <Plate serial="CS-2" title="Bet size: what the caller and the bettor need">
          <Table
            head={['Bet', 'Caller needs', 'Odds', 'MDF', 'Alpha', 'Bluff share']}
            rows={SIZES.map(([s, l]) => [l, pct(potOdds(1 + s, s)), `${num((1 + s) / s, 1)} to 1`, pct(mdf(1, s)), pct(alpha(1, s)), pct(bluffFraction(1, s))])}
          />
          <p className="mt-3 text-[12px] text-dim">Caller needs = bet / (pot + 2 × bet). MDF = pot / (pot + bet). Alpha = 1 − MDF. Bluff share is the fraction of a balanced river betting range that is bluffs.</p>
        </Plate>
        <Plate serial="CS-3" title="Preflop and flop facts">
          <Table
            head={['Event', 'Probability', 'Odds against']}
            rows={[
              ['Dealt any pocket pair', pct(f.pPair, 2), oddsText(f.pPair)],
              ['Dealt pocket aces', pct(f.pAces, 3), oddsText(f.pAces)],
              ['Dealt suited cards', pct(f.pSuited, 1), oddsText(f.pSuited)],
              ['Pair flops a set or better', pct(probFlopSetOrBetter(), 2), oddsText(probFlopSetOrBetter())],
              ['Unpaired hand flops a pair or better', pct(probFlopPairOrBetterUnpaired(), 1), oddsText(probFlopPairOrBetterUnpaired())],
              ['Suited hand flops a flush', pct(probFlopFlush(), 2), oddsText(probFlopFlush())],
              ['Suited hand makes a flush by the river', pct(probFlushByRiver(), 1), oddsText(probFlushByRiver())],
            ]}
          />
          <p className="mt-3 text-[12px] text-dim">{f.totalCombos.toLocaleString()} starting combos, {f.distinctHands} distinct hands. Pair 6 combos, suited 4, offsuit 12.</p>
        </Plate>
        <Plate serial="CS-4" title="Common preflop matchups, all-in">
          <Table
            head={['Matchup', 'First hand', 'Second hand']}
            rows={MATCHUPS.map(([a, b, label]) => [
              <span key="l"><C c={a} /> <span className="text-faint">v</span> <C c={b} /><span className="ml-2 text-[12px] text-dim">{label}</span></span>,
              <Eq key="a" a={a} b={b} />,
              <Eq key="b" a={a} b={b} of={1} />,
            ])}
          />
          <p className="mt-3 text-[12px] text-dim">Exact: all 1,712,304 boards enumerated for each matchup.</p>
        </Plate>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Plate serial="CS-5" title="Omaha straight draws on a 9-8-2 rainbow flop">
          <Table
            head={['Hole cards', 'Shape', 'Outs', 'By the river']}
            rows={WRAPS.map(([h, label]) => {
              const n = omahaOuts(parseCards(h), parseCards('9h8d2s'), 4).length;
              return [<C key="h" c={h} />, label, n, pct(1 - ((45 - n) / 45) * ((44 - n) / 44))];
            })}
          />
          <p className="mt-3 text-[12px] text-dim">Counted by dealing every unseen card under the two-plus-three rule. 45 unseen cards on an Omaha flop.</p>
        </Plate>
        <Plate serial="CS-6" title="Pot-limit: the largest raise">
          <Table
            head={['Pot before the bet', 'Bet you face', 'Max raise to', 'Pot if the raise is called']}
            rows={[[10, 5], [10, 10], [30, 10], [100, 50], [100, 100], [1, 2]].map(([pot, bet]) => { const to = maxRaiseTo(pot + bet, bet, 0); return [String(pot), String(bet), String(to), String(pot + 2 * to)]; })}
          />
          <p className="mt-3 text-[12px] text-dim">Facing a bet B into a pot P, the maximum raise is to 3B + P. The last row is preflop with blinds of 1 and 2: the small blind is the pot and the big blind is the bet, so the first raise can go to 7.</p>
        </Plate>
      </div>
      <RankingTable />
    </div>
  );
}

function Formulas() {
  return (
    <ol className="border-t border-bone/30">
      {FORMULAS.map((f, i) => (
        <li key={f.name} className="grid gap-x-8 gap-y-1 border-b border-bone/15 py-4 md:grid-cols-[2rem_15rem_1fr_13rem]">
          <span className="num text-[10px] text-faint">{String(i + 1).padStart(2, '0')}</span>
          <span className="text-[15px]">{f.name}</span>
          <span>
            <span className="display-i block text-[21px] leading-snug">{f.formula}</span>
            {f.note && <span className="text-[13px] text-dim">{f.note}</span>}
          </span>
          <span className="text-[13px] md:text-right">{lessonLink(f.lesson)}</span>
        </li>
      ))}
    </ol>
  );
}

function EngineNotes() {
  const P = ({ children }: { children: React.ReactNode }) => <p className="my-3 text-[15.5px] leading-relaxed text-bone/90">{children}</p>;
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <div className="max-w-[68ch]">
        <h2 className="display text-[32px]">The hand evaluator</h2>
        <P>A hand of five to seven cards is reduced to four 13-bit masks, one per suit, where bit r is set if the hand holds rank r in that suit. Everything after that is bitwise logic and lookups in tables of 8,192 entries.</P>
        <P><strong>Flushes.</strong> If any suit mask has five or more bits, the hand is a flush or straight flush. With at most seven cards a flush rules out four of a kind and full houses, so the answer comes from one table lookup on that mask.</P>
        <P><strong>Everything else.</strong> AND and OR over the four masks give the ranks held at least twice, at least three times and four times. Those identify quads, full houses, trips, two pair and pairs with no loops and no sorting.</P>
        <P><strong>One number.</strong> Each category maps to a dense index using the combinatorial number system on the kickers. The result is an integer from 1 (seven-five high) to 7,462 (royal flush). Comparing two hands is comparing two integers.</P>
        <h2 className="display mt-10 text-[32px]">Equity</h2>
        <P><strong>Exact.</strong> Every compatible assignment of holdings and every board completion is dealt. Holdings that share a card are skipped, which is all that card removal requires.</P>
        <P><strong>Monte Carlo.</strong> Each trial draws one holding per player by weight, rejects the whole trial on any clash, then deals a random board. Results report the standard error and a 95% interval, and carry their seed.</P>
        <P><strong>Range against range on a board.</strong> For each runout, both ranges are evaluated once and sorted. Running totals of opposing weight, overall and per card, give every hand its wins and ties with blocked combos removed by inclusion and exclusion. It is exact and about a thousand times faster than the direct loop.</P>
        <h2 className="display mt-10 text-[32px]">Randomness</h2>
        <P>All sampling uses xoshiro128** seeded through splitmix32. Nothing in the engine calls the browser's random source, so any simulation can be repeated from its seed.</P>
      </div>
      <div className="space-y-6">
        <Plate serial="VER" title="What the tests verify">
          <ul className="space-y-2.5 text-[14px] text-dim">
            {[
              'All 2,598,960 five-card hands: category counts match, and every hand agrees with an independent reference evaluator',
              'Exactly 7,462 distinct ranks, dense from 1 to 7,462',
              'All 133,784,560 seven-card hands: best-hand category counts match the known values',
              'One million random seven-card hands against best-of-21 brute force',
              'Suit permutation, card order and add-a-card properties',
              'Exact range-against-range matches the direct enumeration to ten decimals',
              'Monte Carlo lands inside its own confidence interval of the exact answer',
              'Every lesson renders and every quiz answer is valid',
            ].map((t) => (
              <li key={t} className="flex gap-3"><span className="mt-[0.55em] h-[5px] w-[5px] shrink-0 rotate-45 bg-verd" />{t}</li>
            ))}
          </ul>
        </Plate>
        <RankingTable />
      </div>
    </div>
  );
}

export default function Reference() {
  const { section = 'glossary' } = useParams();
  return (
    <div>
      <PageHeader serial="05" kicker="Reference" title={<>Look it <span className="italic text-madder">up.</span></>} />
      <nav className="no-print -mt-4 mb-10 flex flex-wrap gap-x-7 gap-y-2 border-b border-bone/20" aria-label="Reference sections">
        {SECTIONS.map((s) => (
          <NavLink key={s.id} to={`/reference/${s.id}`} className={() => cx('-mb-px border-b-2 pb-3 font-mono text-[10.5px] uppercase tracking-[0.16em]', section === s.id ? 'border-madder text-bone' : 'border-transparent text-dim hover:text-bone')}>
            {s.label}
          </NavLink>
        ))}
      </nav>
      {section === 'cheatsheets' ? <CheatSheets /> : section === 'formulas' ? <Formulas /> : section === 'engine' ? <EngineNotes /> : <Glossary />}
    </div>
  );
}
