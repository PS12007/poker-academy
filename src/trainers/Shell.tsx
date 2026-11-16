import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import { randomSeed, Rng } from '../engine/rng';
import { Plate } from '../components/ui/primitives';
import { cx, num, pct } from '../lib/format';

export interface RoundApi<T> {
  round: T;
  /** Round number in this session, from 1. */
  n: number;
  seed: number;
  answered: boolean;
  correct: boolean | null;
  /** Report the outcome. Error is the absolute miss for estimation drills. */
  answer: (correct: boolean, error?: number) => void;
  next: () => void;
  /** Seconds since the round was shown. */
  elapsed: number;
}

interface Props<T> {
  id: string;
  /** Builds one round from a seeded generator, so any round can be reproduced from its seed. */
  generate: (rng: Rng) => T;
  children: (api: RoundApi<T>) => ReactNode;
  /** Seconds allowed. When it runs out the round counts as wrong. */
  timeLimit?: number;
  /** Label for the average error stat, if the drill reports errors. */
  errorLabel?: string;
}

/** Frame shared by every drill: endless seeded rounds, timing, and persistent statistics. */
export function DrillShell<T>({ id, generate, children, timeLimit, errorLabel }: Props<T>) {
  const stats = useStore((s) => s.trainers[id]);
  const record = useStore((s) => s.recordRound);
  const [seed, setSeed] = useState(() => randomSeed());
  const [n, setN] = useState(1);
  const [round, setRound] = useState<T>(() => generate(new Rng(seed)));
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [session, setSession] = useState({ rounds: 0, correct: 0 });
  const started = useRef(Date.now());
  const answered = correct !== null;

  const answer = useCallback(
    (ok: boolean, error = 0) => {
      if (correct !== null) return;
      setCorrect(ok);
      setSession((s) => ({ rounds: s.rounds + 1, correct: s.correct + (ok ? 1 : 0) }));
      record(id, ok, Date.now() - started.current, error);
    },
    [correct, id, record],
  );

  const next = useCallback(() => {
    const s = randomSeed();
    setSeed(s);
    setRound(generate(new Rng(s)));
    setCorrect(null);
    setElapsed(0);
    setN((x) => x + 1);
    started.current = Date.now();
  }, [generate]);

  useEffect(() => {
    if (answered) return;
    const t = setInterval(() => {
      const e = (Date.now() - started.current) / 1000;
      setElapsed(e);
      if (timeLimit && e >= timeLimit) answer(false);
    }, 100);
    return () => clearInterval(t);
  }, [answered, timeLimit, answer]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (answered && (e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [answered, next]);

  const cell = (label: string, value: ReactNode, tone?: string) => (
    <div className="px-4 py-3">
      <div className={cx('figure text-[26px]', tone)}>{value}</div>
      <div className="label mt-1">{label}</div>
    </div>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
      <Plate
        serial={`№ ${String(n).padStart(3, '0')}`}
        title="Round"
        right={
          <span className="num normal-case tracking-normal">
            {timeLimit ? `${Math.max(0, timeLimit - elapsed).toFixed(1)} s left · ` : ''}seed {seed}
          </span>
        }
      >
        {timeLimit && (
          <div className="-mt-1 mb-5 h-px bg-bone/15">
            <div className={cx('h-px', answered ? 'bg-bone/40' : 'bg-madder')} style={{ width: `${Math.max(0, 1 - elapsed / timeLimit) * 100}%` }} />
          </div>
        )}
        {children({ round, n, seed, answered, correct, answer, next, elapsed })}
        {answered && (
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-bone/15 pt-4">
            <span className={cx('display-i text-[28px]', correct ? 'text-verd' : 'text-madder')} role="status">
              {correct ? 'Correct.' : timeLimit && elapsed >= timeLimit ? 'Out of time.' : 'Not this time.'}
            </span>
            <button type="button" className="btn btn-primary" onClick={next} autoFocus>
              Next round
            </button>
          </div>
        )}
      </Plate>

      <aside className="plate self-start">
        <div className="plate-head"><span className="label text-bone">Your record</span></div>
        <div className="grid grid-cols-2 divide-x divide-y divide-bone/10 xl:grid-cols-1 xl:divide-x-0">
          {cell('this session', `${session.correct}/${session.rounds}`)}
          {cell('all-time accuracy', stats?.rounds ? pct(stats.correct / stats.rounds, 0) : 'n/a')}
          {cell('current streak', stats?.streak ?? 0, (stats?.streak ?? 0) >= 5 ? 'text-verd' : undefined)}
          {cell('best streak', stats?.bestStreak ?? 0)}
          {cell('average time', stats?.rounds ? `${num(stats.totalMs / stats.rounds / 1000, 1)} s` : 'n/a')}
          {errorLabel ? cell(errorLabel, stats?.rounds ? num(stats.totalError / stats.rounds, 1) : 'n/a') : cell('rounds played', stats?.rounds ?? 0)}
        </div>
      </aside>
    </div>
  );
}

/** A row of large answer buttons. */
export function Choices<T extends string | number>({
  options, onPick, disabled, picked, correctValue,
}: {
  options: { value: T; label: ReactNode }[];
  onPick: (v: T) => void;
  disabled?: boolean;
  picked?: T | null;
  correctValue?: T;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const isRight = disabled && correctValue === o.value;
        const isWrongPick = disabled && picked === o.value && correctValue !== o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            disabled={disabled}
            onClick={() => onPick(o.value)}
            className={cx('btn min-w-[6.5rem] flex-1 !py-4 !text-[12px] disabled:!opacity-100', isRight && '!border-verd !bg-verd/15 !text-verd', isWrongPick && '!border-madder !bg-madder/15 !text-madder', disabled && !isRight && !isWrongPick && '!opacity-40')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
