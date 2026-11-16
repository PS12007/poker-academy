import { MDXProvider } from '@mdx-js/react';
import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findLesson, LESSON_FILES, lessonPath, neighbors } from '../content/curriculum';
import { MDX_COMPONENTS } from '../components/lesson/prose';
import { Quiz, type Question } from '../components/quiz/Quiz';
import { useStore } from '../store';
import { pad } from '../lib/format';
import { Loading } from '../App';
import NotFound from './NotFound';

interface LessonModule {
  default: ComponentType;
  quiz?: Question[];
}

function Notes({ lessonKey }: { lessonKey: string }) {
  const note = useStore((s) => s.notes[lessonKey] ?? '');
  const setNote = useStore((s) => s.setNote);
  return (
    <div>
      <label className="label mb-2 block" htmlFor="lesson-notes">Your notes</label>
      <textarea
        id="lesson-notes"
        value={note}
        onChange={(e) => setNote(lessonKey, e.target.value)}
        placeholder="Saved in this browser as you type."
        rows={5}
        className="w-full resize-y border border-bone/20 bg-transparent p-3 font-sans text-[13.5px] leading-relaxed text-bone outline-none placeholder:text-faint focus:border-madder"
      />
    </div>
  );
}

export default function Lesson() {
  const { moduleId = '', lessonId = '' } = useParams();
  const meta = findLesson(moduleId, lessonId);
  const [mod, setMod] = useState<LessonModule | null>(null);
  const [failed, setFailed] = useState(false);
  const [toc, setToc] = useState<{ id: string; text: string }[]>([]);
  const article = useRef<HTMLDivElement>(null);
  const visit = useStore((s) => s.visitLesson);
  const progress = useStore((s) => (meta ? s.lessons[meta.key] : undefined));

  useEffect(() => {
    setMod(null);
    setFailed(false);
    const load = LESSON_FILES[`./${moduleId}/${lessonId}.mdx`];
    if (!load) return;
    let live = true;
    load()
      .then((m) => live && setMod(m as LessonModule))
      .catch(() => live && setFailed(true));
    visit(`${moduleId}/${lessonId}`);
    return () => {
      live = false;
    };
  }, [moduleId, lessonId, visit]);

  useEffect(() => {
    if (!mod || !article.current) return;
    setToc(Array.from(article.current.querySelectorAll('h2.lesson-h2')).map((h) => ({ id: h.id, text: h.textContent ?? '' })));
  }, [mod]);

  if (!meta || !meta.available) return <NotFound />;
  if (failed) return <p className="text-madder">This lesson failed to load. Check your connection and reload.</p>;
  const { prev, next } = neighbors(meta.key);
  const Content = mod?.default;

  return (
    <div>
      <header className="mb-10 border-b border-bone/20 pb-8 sm:mb-14">
        <nav className="label mb-6 flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Breadcrumb">
          <Link to="/course" className="hover:text-bone">Course</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/course#${meta.module.id}`} className="hover:text-bone">{pad(meta.module.n)} {meta.module.title}</Link>
          <span aria-hidden="true">/</span>
          <span className="text-madder">Lesson {meta.module.n}.{meta.index + 1}</span>
        </nav>
        <h1 className="display rise max-w-[16ch] text-[46px] sm:text-[84px]">{meta.title}</h1>
        <p className="rise mt-5 max-w-[52ch] font-display text-[22px] italic leading-snug text-dim" style={{ '--i': 1 } as CSSProperties}>{meta.gist}</p>
        <div className="rise mt-6 flex flex-wrap gap-2" style={{ '--i': 2 } as CSSProperties}>
          <span className="chip">{meta.level}</span>
          <span className="chip">{meta.minutes} min</span>
          <span className="chip">{meta.module.track}</span>
          {progress?.done && <span className="chip border-verd/50 text-verd">Complete · best {Math.round(progress.quizBest * 100)}%</span>}
        </div>
      </header>

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <article ref={article} className="mx-auto max-w-[70ch] xl:mx-0 xl:ml-[8%]">
            {Content ? (
              <MDXProvider components={MDX_COMPONENTS}>
                <Content />
              </MDXProvider>
            ) : (
              <Loading />
            )}
            {mod?.quiz && (
              <div className="mt-14">
                <Quiz key={meta.key} questions={mod.quiz} lessonKey={meta.key} />
              </div>
            )}
            <nav className="mt-14 grid gap-px border border-bone/20 bg-bone/20 sm:grid-cols-2" aria-label="Lesson navigation">
              {prev ? (
                <Link to={lessonPath(prev)} className="group bg-ink p-5 hover:bg-ink2">
                  <div className="label">← Previous</div>
                  <div className="display mt-2 text-[24px] group-hover:italic">{prev.title}</div>
                </Link>
              ) : <div className="bg-ink" />}
              {next ? (
                <Link to={lessonPath(next)} className="group bg-ink p-5 text-right hover:bg-ink2">
                  <div className="label text-madder">Next →</div>
                  <div className="display mt-2 text-[24px] group-hover:italic">{next.title}</div>
                </Link>
              ) : (
                <Link to="/course" className="group bg-ink p-5 text-right hover:bg-ink2">
                  <div className="label text-madder">End of what is written so far</div>
                  <div className="display mt-2 text-[24px] group-hover:italic">Back to the course index</div>
                </Link>
              )}
            </nav>
          </article>
        </div>

        <aside className="no-print hidden xl:block">
          <div className="sticky top-28 space-y-8">
            {toc.length > 0 && (
              <nav aria-label="In this lesson">
                <div className="label mb-3">In this lesson</div>
                <ol className="space-y-2 border-l border-bone/20">
                  {toc.map((t, i) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="-ml-px flex gap-2 border-l border-transparent pl-3 text-left text-[13px] leading-snug text-dim hover:border-madder hover:text-bone"
                        onClick={() => document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        <span className="num text-[9px] text-faint">{pad(i + 1)}</span>
                        {t.text}
                      </button>
                    </li>
                  ))}
                  {mod?.quiz && (
                    <li>
                      <button type="button" className="-ml-px border-l border-transparent pl-3 text-left text-[13px] text-madder hover:border-madder" onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })}>
                        Quiz · {mod.quiz.length} questions
                      </button>
                    </li>
                  )}
                </ol>
              </nav>
            )}
            <Notes lessonKey={meta.key} />
          </div>
        </aside>
      </div>
      <div className="mx-auto mt-10 max-w-[70ch] xl:hidden">
        <Notes lessonKey={meta.key} />
      </div>
    </div>
  );
}
