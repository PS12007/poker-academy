import { useEffect, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ALL_LESSONS, lessonPath, MODULES } from '../content/curriculum';
import { useStore } from '../store';
import { PageHeader } from '../components/ui/primitives';
import { cx, pad } from '../lib/format';

const LEVEL_MARK: Record<string, string> = { Beginner: 'I', Intermediate: 'II', Advanced: 'III', Expert: 'IV' };

export default function Course() {
  const lessons = useStore((s) => s.lessons);
  const placement = useStore((s) => s.placement);
  const { hash } = useLocation();

  useEffect(() => {
    // HashRouter owns the URL hash, so in-page anchors arrive as a trailing "#id".
    const id = hash.replace('#', '') || window.location.hash.split('#')[2];
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const total = ALL_LESSONS.filter((l) => l.available).length;
  const done = ALL_LESSONS.filter((l) => lessons[l.key]?.done).length;

  return (
    <div>
      <PageHeader
        serial="01"
        kicker="The course"
        title={<>Nine modules, <span className="italic text-madder">in order.</span></>}
        lede="Each module assumes the ones listed as its prerequisites. Levels run I (beginner) to IV (expert). Nothing is locked: if you already play, start wherever the material stops being obvious."
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="chip">{done} of {total} available lessons complete</span>
          {placement && <span className="chip text-madder">Placement suggests module {MODULES.find((m) => m.id === placement)?.n}</span>}
          <Link to="/placement" className="btn btn-sm">Take the placement quiz</Link>
        </div>
      </PageHeader>

      <ol className="mb-14 grid gap-px border border-bone/20 bg-bone/20 sm:grid-cols-3" aria-label="How to use the course">
        {[
          ['Read a lesson', 'Short sections, one idea at a time. Dotted words have a definition: hover or tap them.'],
          ['Play with the live tool', 'Every lesson has one. Change the cards or the numbers and watch the answer move.'],
          ['Take the quiz, then drill', 'The quiz marks the lesson done and schedules review. Drills build speed at the table.'],
        ].map(([t, d], i) => (
          <li key={t} className="bg-ink p-5">
            <div className="figure text-[40px] text-madder">{i + 1}</div>
            <div className="mt-2 text-[16px] font-medium">{t}</div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{d}</p>
          </li>
        ))}
      </ol>

      <div className="space-y-14">
        {MODULES.map((m) => {
          const mDone = m.lessons.filter((l) => lessons[`${m.id}/${l.id}`]?.done).length;
          return (
            <section key={m.id} id={m.id} className="scroll-mt-28 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <div className="figure text-[84px] text-madder">{pad(m.n)}</div>
                <h2 className="display mt-1 text-[34px]">{m.title}</h2>
                <p className="mt-3 text-[14px] leading-relaxed text-dim">{m.blurb}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="chip">{m.track}</span>
                  {m.requires.length > 0 && (
                    <span className="chip">after {m.requires.map((r) => pad(MODULES.find((x) => x.id === r)!.n)).join(', ')}</span>
                  )}
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-bone/20">
                    <div className="h-px bg-madder" style={{ width: `${(mDone / m.lessons.length) * 100}%` }} />
                  </div>
                  <span className="num text-[10px] text-dim">{mDone}/{m.lessons.length}</span>
                </div>
              </div>
              <ol className="border-t border-bone/30">
                {m.lessons.map((l, i) => {
                  const key = `${m.id}/${l.id}`;
                  const flat = ALL_LESSONS.find((x) => x.key === key)!;
                  const p = lessons[key];
                  const row = (
                    <>
                      <span className="num w-9 shrink-0 text-[10px] text-faint">{m.n}.{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-3">
                          <span className={cx('text-[17px] leading-snug', flat.available && 'group-hover:text-madder')}>{l.title}</span>
                          <span className="leader hidden sm:block" />
                        </span>
                        <span className="mt-0.5 block text-[13px] text-dim">{l.gist}</span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-3">
                        <span className="label hidden w-7 text-right sm:block" title={l.level}>{LEVEL_MARK[l.level]}</span>
                        <span className="num hidden w-12 text-right text-[10px] text-dim sm:block">{l.minutes} min</span>
                        <span className={cx('num w-12 text-right text-[10px]', p?.done ? 'text-verd' : 'text-faint')}>
                          {p?.done ? `${Math.round(p.quizBest * 100)}% ✓` : flat.available ? 'open' : 'soon'}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={l.id} className="rise border-b border-bone/15" style={{ '--i': i } as CSSProperties}>
                      {flat.available ? (
                        <Link to={lessonPath(flat)} className="group flex items-baseline gap-3 py-3.5">{row}</Link>
                      ) : (
                        <div className="flex items-baseline gap-3 py-3.5 opacity-45">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
