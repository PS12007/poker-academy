import type { SrsState } from '../store';

const DAY = 86_400_000;

export function newCard(now = Date.now()): SrsState {
  return { ease: 2.5, interval: 0, reps: 0, due: now, lapses: 0 };
}

/**
 * SM-2 scheduling. Quality runs 0..5: below 3 is a failure and the card
 * returns tomorrow with its repetition count reset. Otherwise intervals go
 * 1 day, 6 days, then the previous interval times the ease factor.
 */
export function grade(s: SrsState, quality: number, now = Date.now()): SrsState {
  const q = Math.max(0, Math.min(5, quality));
  const ease = Math.max(1.3, s.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (q < 3) return { ease, interval: 1, reps: 0, due: now + DAY, lapses: s.lapses + 1 };
  const reps = s.reps + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(s.interval * ease);
  return { ease, interval, reps, due: now + interval * DAY, lapses: s.lapses };
}

export function isDue(s: SrsState, now = Date.now()): boolean {
  return s.due <= now;
}

export const cardId = (lessonKey: string, index: number) => `${lessonKey}#${index}`;
