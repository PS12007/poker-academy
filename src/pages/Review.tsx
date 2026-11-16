import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ALL_LESSONS, LESSON_FILES, lessonPath, MODULES } from '../content/curriculum';
import { DRILLS } from '../trainers/registry';
import { currentStreak, useStore } from '../store';
import { grade, isDue } from '../lib/srs';
import { QuestionCard, type Question } from '../components/quiz/Quiz';
import { Figure, PageHeader, Plate } from '../components/ui/primitives';
import { cx, pad, pct } from '../lib/format';

/** Loads the question behind a review card id of the form "module/lesson#index". */
async function loadQuestion(id: string): Promise<Question | null> {
  const [key, idx] = id.split('#');
  const load = LESSON_FILES[`./${key}.mdx`];
  if (!load) return null;
  const mod = (await load()) as { quiz?: Question[] };
  return mod.quiz?.[Number(idx)] ?? null;
}

function Queue() {
  const srs = useStore((s) => s.srs);
  const setSrs = useStore((s) => s.setSrs);
  // Freeze the session's queue when the page opens so grading does not reshuffle it.
  const [queue] = useState(() => Object.keys(srs).filter((id) => isDue(srs[id])).sort((a, b) => srs[a].due - srs[b].due));
  const [i, setI] = useState(0);
  const [q, setQ] = useState<Question | null>(null);
  const [answered, setAnswered] = useState(false);
  const [right, setRight] = useState(0);
  const id = queue[i];

  useEffect(() => {
    setQ(null);
    setAnswered(false);
    if (!id) return;
    let live = true;
    loadQuestion(id).then((x) => live && setQ(x));
    return () => {
      live = false;
    };
  }, [id]);

  const total = Object.keys(srs).length;
  const upcoming = Object.values(srs).filter((s) => !isDue(s)).sort((a, b) => a.due - b.due)[0];

  if (total === 0)
    return (
      <Plate serial="SRS" title="Review queue">
        <p className="max-w-[56ch] text-dim">Nothing to review yet. Finish a lesson quiz and its questions are scheduled here: missed ones tomorrow, the rest at growing intervals.</p>
        <Link to="/course" className="btn btn-primary mt-5">Go to the course</Link>
      </Plate>
    );
  if (!id)
    return (
      <Plate serial="SRS" title="Review queue" right={`${total} cards scheduled`}>
        <div className="display-i text-[34px]">{queue.length ? `Done. ${right} of ${queue.length} right.` : 'Nothing due.'}</div>
        <p className="mt-2 text-dim">
          {upcoming ? `Next card is due ${new Date(upcoming.due).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}.` : 'Every card has been reviewed.'}
        </p>
      </Plate>
    );
  const lesson = ALL_LESSONS.find((l) => l.key === id.split('#')[0]);
  return (
    <Plate serial="SRS" title="Review queue" right={`Card ${i + 1} of ${queue.length}`}>
      {lesson && <div className="label mb-4">From <Link className="link" to={lessonPath(lesson)}>{lesson.title}</Link></div>}
      {q ? (
        <QuestionCard
          key={id}
          question={q}
          onAnswered={(ok) => {
            setAnswered(true);
            if (ok) setRight((r) => r + 1);
            setSrs(id, grade(useStore.getState().srs[id], ok ? 4 : 1));
          }}
        />
      ) : (
        <span className="label pending">Loading</span>
      )}
      <div className="mt-6 flex justify-end">
        <button type="button" className="btn btn-primary" disabled={!answered} onClick={() => setI(i + 1)}>
          {i + 1 >= queue.length ? 'Finish' : 'Next card'}
        </button>
      </div>
    </Plate>
  );
}

function Spark({ history }: { history: { rounds: number; correct: number }[] }) {
  const pts = history.slice(-14);
  if (pts.length < 2) return <span className="num text-[10px] text-faint">needs two days of play</span>;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1)) * 100} ${22 - (p.correct / p.rounds) * 20}`).join('');
  return (
    <svg viewBox="0 0 100 24" className="h-6 w-28" role="img" aria-label="Accuracy by day">
      <path d={d} fill="none" stroke="rgb(var(--madder))" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Review() {
  const lessons = useStore((s) => s.lessons);
  const trainers = useStore((s) => s.trainers);
  const days = useStore((s) => s.days);
  const srs = useStore((s) => s.srs);
  const available = ALL_LESSONS.filter((l) => l.available);
  const done = available.filter((l) => lessons[l.key]?.done);
  const weakest = useMemo(() => done.filter((l) => lessons[l.key].quizBest < 1).sort((a, b) => lessons[a.key].quizBest - lessons[b.key].quizBest).slice(0, 5), [done, lessons]);
  const due = Object.values(srs).filter((s) => isDue(s)).length;
  const played = DRILLS.filter((d) => trainers[d.id]?.rounds);

  return (
    <div>
      <PageHeader serial="04" kicker="Review" title={<>Keep what <span className="italic text-madder">you learned.</span></>} lede="Quiz questions return on a spaced schedule: one day, six days, then longer each time you get them right. Below the queue is your record so far." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Queue />
        <div className="space-y-6">
          <Plate serial="LOG" title="So far">
            <div className="grid grid-cols-2 gap-5">
              <Figure size="md" value={`${done.length}/${available.length}`} caption="lessons complete" />
              <Figure size="md" tone={due ? 'madder' : undefined} value={due} caption="cards due now" />
              <Figure size="md" value={currentStreak(days)} caption="day streak" />
              <Figure size="md" value={days.length} caption="days active" />
            </div>
          </Plate>
          <Plate serial="MOD" title="By module" pad={false}>
            <ul>
              {MODULES.map((m) => {
                const n = m.lessons.filter((l) => lessons[`${m.id}/${l.id}`]?.done).length;
                return (
                  <li key={m.id} className="flex items-center gap-3 border-b border-bone/10 px-4 py-2.5 last:border-0 sm:px-5">
                    <span className="num w-5 text-[10px] text-faint">{pad(m.n)}</span>
                    <Link to={`/course#${m.id}`} className="w-44 truncate text-[14px] hover:text-madder">{m.title}</Link>
                    <span className="h-px flex-1 bg-bone/15"><span className="block h-px bg-madder" style={{ width: `${(n / m.lessons.length) * 100}%` }} /></span>
                    <span className="num w-8 text-right text-[10px] text-dim">{n}/{m.lessons.length}</span>
                  </li>
                );
              })}
            </ul>
          </Plate>
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Plate serial="DRL" title="Drill accuracy" pad={false}>
          {played.length === 0 ? (
            <p className="p-5 text-[14px] text-dim">No drills played yet. <Link className="link" to="/drills">Try one.</Link></p>
          ) : (
            <ul>
              {played.map((d) => {
                const s = trainers[d.id];
                return (
                  <li key={d.id} className="flex items-center gap-4 border-b border-bone/10 px-4 py-3 last:border-0 sm:px-5">
                    <Link to={`/drills/${d.id}`} className="min-w-0 flex-1 truncate text-[14px] hover:text-madder">{d.title}</Link>
                    <Spark history={s.history} />
                    <span className={cx('num w-12 text-right text-[13px]', s.correct / s.rounds >= 0.8 ? 'text-verd' : '')}>{pct(s.correct / s.rounds, 0)}</span>
                    <span className="num w-16 text-right text-[10px] text-dim">{s.rounds} rounds</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Plate>
        <Plate serial="WK" title="Weakest topics" pad={false}>
          {weakest.length === 0 ? (
            <p className="p-5 text-[14px] text-dim">{done.length ? 'Every completed quiz is at full marks.' : 'Complete a lesson quiz to see where you are weakest.'}</p>
          ) : (
            <ul>
              {weakest.map((l) => (
                <li key={l.key} className="flex items-center gap-4 border-b border-bone/10 px-4 py-3 last:border-0 sm:px-5">
                  <Link to={lessonPath(l)} className="min-w-0 flex-1 truncate text-[14px] hover:text-madder">{l.title}</Link>
                  <span className="label">{l.module.title}</span>
                  <span className="num w-12 text-right text-[13px] text-madder">{pct(lessons[l.key].quizBest, 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </Plate>
      </div>
    </div>
  );
}
