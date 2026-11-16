import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ALL_LESSONS, lessonPath, MODULES } from '../content/curriculum';
import { TOOLS } from '../tools/registry';
import { DRILLS } from '../trainers/registry';
import { useStore } from '../store';
import { Guilloche } from '../components/ui/Guilloche';
import { How } from '../components/ui/primitives';
import { Hand } from '../components/cards/PlayingCard';
import { sharedEngine } from '../lib/engine';
import { int, pad, pct } from '../lib/format';
import { cardsToString } from '../engine/cards';
import { Rng, randomSeed } from '../engine/rng';
import type { EquityResult } from '../engine/equity';

const OPENERS: [number[], number[]][] = [
  [[51, 50], [47, 46]], // AA v KK
  [[51, 45], [43, 42]], // AK v QQ
];

/** The thesis of the site, demonstrated: two hands, every board dealt, in front of you. */
function Specimen() {
  const [hands, setHands] = useState<[number[], number[]]>(OPENERS[0]);
  const [res, setRes] = useState<EquityResult | null>(null);
  const [n, setN] = useState(1);

  useEffect(() => {
    let live = true;
    setRes(null);
    sharedEngine()
      .equity({ game: 'holdem', players: hands.map((h) => ({ hands: [h] })), board: [], mode: 'exact' })
      .then((r) => live && setRes(r))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [hands]);

  const redeal = useCallback(() => {
    const deck = new Rng(randomSeed()).shuffle(Array.from({ length: 52 }, (_, i) => i));
    const sort = (h: number[]) => h.sort((a, b) => b - a);
    setHands([sort(deck.slice(0, 2)), sort(deck.slice(2, 4))]);
    setN((x) => x + 1);
  }, []);

  const eq = res?.players.map((p) => p.equity);
  return (
    <div className="plate relative bg-ink/80 backdrop-blur-sm">
      <div className="plate-head">
        <span className="label text-madder">Specimen № {pad(n, 4)}</span>
        <span className="label">Computed just now, on this device</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-bone/15">
        {[0, 1].map((p) => (
          <div key={p} className="p-4 sm:p-5">
            <Hand cards={hands[p]} size="lg" key={cardsToString(hands[p])} />
            <div className={`figure mt-5 text-[46px] sm:text-[64px] ${res ? '' : 'pending'}`}>
              {eq ? (eq[p] * 100).toFixed(2) : '··.··'}
              <span className="text-[0.45em] text-dim">%</span>
              {p === 0 && res && (
                <How>
                  All {int(res.boards)} possible five-card boards were dealt and both hands evaluated on each one. Equity
                  is the share of the pot won, counting half of every split. Nothing is sampled or estimated.
                </How>
              )}
            </div>
            <div className="label mt-2">
              {res ? `wins ${pct(res.players[p].win, 2)} · ties ${pct(res.players[p].tie, 2)}` : 'dealing every board'}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bone/15 px-4 py-3 sm:px-5">
        <span className="num text-[10.5px] text-dim">
          {res ? `exact · ${int(res.boards)} boards · ${res.ms} ms` : 'exact enumeration'}
        </span>
        <button type="button" className="btn btn-sm" onClick={redeal}>
          Deal two more hands
        </button>
      </div>
    </div>
  );
}

function CourseIndex() {
  const lessons = useStore((s) => s.lessons);
  return (
    <ol>
      {MODULES.map((m, i) => {
        const done = m.lessons.filter((l) => lessons[`${m.id}/${l.id}`]?.done).length;
        const first = ALL_LESSONS.find((l) => l.module.id === m.id && l.available);
        const body = (
          <>
            <span className="num w-7 shrink-0 pt-2 text-[10px] text-faint sm:w-10">{pad(m.n)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <h3 className="display text-[30px] transition-colors group-hover:italic group-hover:text-madder sm:text-[44px]">
                  {m.title}
                </h3>
                <span className="leader hidden sm:block" />
                <span className="num hidden shrink-0 text-[11px] text-dim sm:block">
                  {done}/{m.lessons.length}
                </span>
              </div>
              <p className="mt-1.5 max-w-[60ch] text-[14px] text-dim">{m.blurb}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="chip">{m.track}</span>
                <span className="chip">{m.lessons.length} lessons</span>
                {!first && <span className="chip text-faint">In preparation</span>}
              </div>
            </div>
          </>
        );
        return (
          <li key={m.id} className="rise border-b border-bone/15" style={{ '--i': i } as CSSProperties}>
            {first ? (
              <Link to={`/course#${m.id}`} className="group flex gap-3 py-5 sm:gap-6 sm:py-6">{body}</Link>
            ) : (
              <div className="group flex gap-3 py-5 opacity-60 sm:gap-6 sm:py-6">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function Home() {
  const lastLesson = useStore((s) => s.lastLesson);
  const lessons = useStore((s) => s.lessons);
  const available = ALL_LESSONS.filter((l) => l.available);
  const resume = available.find((l) => l.key === lastLesson);
  const nextUp = available.find((l) => !lessons[l.key]?.done) ?? available[0];
  const started = Object.keys(lessons).length > 0 || !!resume;

  return (
    <div>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative -mt-8 overflow-hidden pb-14 pt-10 sm:-mt-12 sm:pb-24 sm:pt-20">
        <Guilloche
          spin
          className="pointer-events-none absolute -right-[62%] -top-[16%] h-[560px] w-[560px] opacity-[0.38] sm:-right-[12%] sm:-top-[24%] sm:h-[1000px] sm:w-[1000px] sm:opacity-60"
        />
        <div className="relative grid items-end gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <div className="ink-in label mb-6 flex items-center gap-3">
              <span className="text-madder">A course in poker</span>
              <span className="hidden h-px w-10 bg-bone/30 xs:block" />
              <span className="hidden xs:block">No-Limit Hold'em first</span>
            </div>
            <h1 className="display text-[19vw] leading-[0.82] sm:text-[132px] lg:text-[168px]">
              <span className="ink-in block">Poker,</span>
              <span className="ink-in block italic text-madder" style={{ '--i': 2 } as CSSProperties}>
                derived.
              </span>
            </h1>
            <p className="rise mt-8 max-w-[48ch] text-[17px] leading-relaxed text-dim sm:text-[19px]" style={{ '--i': 5 } as CSSProperties}>
              From the rules of the game to game theory. Every probability here is either worked out in front of you or
              computed by an engine running in your browser. Nothing is quoted from memory.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={{ '--i': 6 } as CSSProperties}>
              {nextUp && (
                <Link to={lessonPath(started ? (resume ?? nextUp) : nextUp)} className="btn btn-primary">
                  {started ? `Continue: ${(resume ?? nextUp).title}` : 'Start at lesson one'}
                </Link>
              )}
              <Link to="/course" className="btn">The whole course</Link>
              <Link to="/tools/equity" className="btn btn-ghost">Open the equity calculator</Link>
            </div>
          </div>
          <div className="rise" style={{ '--i': 7 } as CSSProperties}>
            <Specimen />
          </div>
        </div>
      </section>

      <hr className="rule-double" />

      {/* ---------------------------------------------------------- ledger */}
      <section className="grid grid-cols-2 divide-bone/15 border-b border-bone/15 sm:grid-cols-4 sm:divide-x">
        {[
          [String(ALL_LESSONS.length), 'lessons, beginner to expert'],
          [String(TOOLS.length), 'instruments and solvers'],
          ['7,462', 'distinct hand values, all tested'],
          ['0', 'numbers taken on faith'],
        ].map(([v, c], i) => (
          <div key={c} className={`px-1 py-6 sm:px-6 ${i < 2 ? 'border-b border-bone/15 sm:border-b-0' : ''}`}>
            <div className="figure text-[44px] sm:text-[58px]">{v}</div>
            <div className="label mt-2">{c}</div>
          </div>
        ))}
      </section>

      {/* ---------------------------------------------------------- course */}
      <section className="mt-16 grid gap-8 lg:mt-24 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="label text-madder">Part one</div>
          <h2 className="display mt-2 text-[40px]">The course</h2>
          <p className="mt-3 text-[14px] text-dim">
            Read in order or jump in. Each lesson ends with a short quiz that feeds your review queue.
          </p>
          <Link to="/course" className="btn btn-sm mt-5">Full index</Link>
        </div>
        <CourseIndex />
      </section>

      {/* ----------------------------------------------------- instruments */}
      <section className="mt-20 lg:mt-28">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="label text-madder">Part two</div>
            <h2 className="display mt-2 text-[40px]">Instruments</h2>
          </div>
          <Link to="/tools" className="btn btn-sm">All instruments</Link>
        </div>
        <div className="grid border-l border-t border-bone/15 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((t) => {
            const inner = (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="label text-madder">{t.serial}</span>
                  <span className="label">{t.component ? t.track : 'Soon'}</span>
                </div>
                <h3 className="display mt-8 text-[25px] leading-[1.02] transition-all group-hover:italic">{t.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-dim">{t.blurb}</p>
              </>
            );
            const cls = 'group block min-h-[190px] border-b border-r border-bone/15 p-5 transition-colors';
            return t.component ? (
              <Link key={t.id} to={`/tools/${t.id}`} className={`${cls} hover:bg-bone/[0.05]`}>{inner}</Link>
            ) : (
              <div key={t.id} className={`${cls} opacity-50`}>{inner}</div>
            );
          })}
          <div className="relative hidden min-h-[190px] overflow-hidden border-b border-r border-bone/15 lg:block">
            <Guilloche variant="seal" spin className="absolute -bottom-16 -right-16 h-[260px] w-[260px]" opacity={0.75} />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- drills */}
      <section className="mt-20 grid gap-8 lg:mt-28 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
        <div>
          <div className="label text-madder">Part three</div>
          <h2 className="display mt-2 text-[40px]">Drills</h2>
          <p className="mt-3 text-[14px] text-dim">Endless, randomized from the engine, scored. Knowing a formula is not the same as doing it in ten seconds.</p>
        </div>
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {DRILLS.map((d) => (
            <li key={d.id} className="border-b border-bone/15">
              {d.component ? (
                <Link to={`/drills/${d.id}`} className="group flex items-baseline gap-3 py-3.5">
                  <span className="label text-madder">{d.serial}</span>
                  <span className="text-[16px] group-hover:text-madder">{d.title}</span>
                  <span className="leader" />
                  <span className="label">{d.track}</span>
                </Link>
              ) : (
                <div className="flex items-baseline gap-3 py-3.5 opacity-50">
                  <span className="label">{d.serial}</span>
                  <span className="text-[16px]">{d.title}</span>
                  <span className="leader" />
                  <span className="label">Soon</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
