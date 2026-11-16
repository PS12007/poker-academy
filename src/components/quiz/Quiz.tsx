import { useState, type ReactNode } from 'react';
import { useStore } from '../../store';
import { cardId, grade, newCard } from '../../lib/srs';
import { cx } from '../../lib/format';
import { Plate } from '../ui/primitives';

export interface ChoiceQuestion {
  q: ReactNode;
  choices: ReactNode[];
  /** Index of the correct choice. */
  answer: number;
  why: ReactNode;
}
export interface NumericQuestion {
  q: ReactNode;
  /** The correct value. Compute it with the engine where possible. */
  numeric: number;
  /** Accepted absolute error. Defaults to 0.5. */
  tolerance?: number;
  unit?: string;
  why: ReactNode;
}
export type Question = ChoiceQuestion | NumericQuestion;

export const isNumeric = (q: Question): q is NumericQuestion => 'numeric' in q;

/** One question with its answer controls. Reports the outcome once. */
export function QuestionCard({ question, onAnswered }: { question: Question; onAnswered: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState<boolean | null>(null);

  const settle = (ok: boolean) => {
    setResult(ok);
    onAnswered(ok);
  };

  return (
    <div>
      <div className="text-[18px] leading-snug">{question.q}</div>
      {isNumeric(question) ? (
        <form
          className="mt-5 flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (result !== null || text.trim() === '') return;
            const v = Number(text.replace(/[%,\s]/g, ''));
            settle(Number.isFinite(v) && Math.abs(v - question.numeric) <= (question.tolerance ?? 0.5));
          }}
        >
          <div className="w-40">
            <label className="label block" htmlFor="quiz-num">Your answer{question.unit ? ` (${question.unit})` : ''}</label>
            <input id="quiz-num" className="field" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} disabled={result !== null} autoComplete="off" />
          </div>
          <button type="submit" className="btn btn-sm" disabled={result !== null || text.trim() === ''}>Check</button>
        </form>
      ) : (
        <ol className="mt-5 border-t border-bone/20" role="radiogroup">
          {question.choices.map((c, i) => {
            const isAnswer = i === question.answer;
            const shown = result !== null;
            return (
              <li key={i} className="border-b border-bone/20">
                <button
                  type="button"
                  role="radio"
                  aria-checked={picked === i}
                  disabled={shown}
                  onClick={() => {
                    setPicked(i);
                    settle(isAnswer);
                  }}
                  className={cx(
                    'flex w-full items-baseline gap-4 px-1 py-3 text-left transition-colors',
                    !shown && 'hover:bg-bone/[0.06]',
                    shown && isAnswer && 'bg-verd/10',
                    shown && picked === i && !isAnswer && 'bg-madder/10',
                  )}
                >
                  <span className={cx('num w-5 text-[11px]', shown && isAnswer ? 'text-verd' : shown && picked === i ? 'text-madder' : 'text-faint')}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 text-[15px]">{c}</span>
                  {shown && isAnswer && <span className="label text-verd">Correct</span>}
                  {shown && picked === i && !isAnswer && <span className="label text-madder">Your pick</span>}
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {result !== null && (
        <div className="mt-5 border-l-2 pl-4" style={{ borderColor: result ? 'rgb(var(--verd))' : 'rgb(var(--madder))' }} role="status">
          <div className={cx('label', result ? 'text-verd' : 'text-madder')}>
            {result ? 'Right' : isNumeric(question) ? `Not quite. Answer: ${question.numeric}${question.unit ? ` ${question.unit}` : ''}` : 'Not quite'}
          </div>
          <div className="mt-1.5 text-[14px] leading-relaxed text-dim">{question.why}</div>
        </div>
      )}
    </div>
  );
}

/** The end-of-lesson quiz. Finishing it marks the lesson complete and schedules every question for review. */
export function Quiz({ questions, lessonKey }: { questions: Question[]; lessonKey: string }) {
  const completeLesson = useStore((s) => s.completeLesson);
  const setSrs = useStore((s) => s.setSrs);
  const [run, setRun] = useState(0);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const answered = answers.length > i;
  const finished = i >= questions.length;
  const score = answers.filter(Boolean).length;

  const next = () => {
    if (i + 1 >= questions.length) {
      completeLesson(lessonKey, score / questions.length);
      const existing = useStore.getState().srs;
      answers.forEach((ok, k) => {
        const id = cardId(lessonKey, k);
        setSrs(id, grade(existing[id] ?? newCard(), ok ? 4 : 1));
      });
    }
    setI(i + 1);
  };

  return (
    <Plate
      serial="QUIZ"
      title="Check yourself"
      right={finished ? `${score} of ${questions.length}` : `Question ${i + 1} of ${questions.length}`}
      id="quiz"
    >
      {finished ? (
        <div>
          <div className="figure text-[72px]">
            {score}
            <span className="text-[0.4em] text-dim"> / {questions.length}</span>
          </div>
          <p className="mt-3 max-w-[56ch] text-[15px] text-dim">
            {score === questions.length
              ? 'All correct. The lesson is marked complete and these questions will come back for review at growing intervals.'
              : 'The lesson is marked complete. Questions you missed return in tomorrow’s review, the rest later.'}
          </p>
          <button type="button" className="btn btn-sm mt-5" onClick={() => { setI(0); setAnswers([]); setRun((r) => r + 1); }}>
            Take it again
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-5 flex gap-1" aria-hidden="true">
            {questions.map((_, k) => (
              <span key={k} className={cx('h-[3px] flex-1', k < answers.length ? (answers[k] ? 'bg-verd' : 'bg-madder') : k === i ? 'bg-bone/60' : 'bg-bone/15')} />
            ))}
          </div>
          <QuestionCard key={`${run}-${i}`} question={questions[i]} onAnswered={(ok) => setAnswers((a) => [...a, ok])} />
          <div className="mt-6 flex justify-end">
            <button type="button" className="btn btn-primary" disabled={!answered} onClick={next}>
              {i + 1 >= questions.length ? 'Finish' : 'Next question'}
            </button>
          </div>
        </div>
      )}
    </Plate>
  );
}
