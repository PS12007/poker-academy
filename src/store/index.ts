import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

const memory = new Map<string, string>();
/** localStorage that never throws (private mode, blocked storage, quota). Falls back to memory. */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      memory.delete(k);
    }
  },
};

export interface LessonProgress {
  done: boolean;
  /** Best quiz score as a fraction 0..1. */
  quizBest: number;
  at: number;
}

export interface TrainerStats {
  rounds: number;
  correct: number;
  /** Sum of absolute errors, for estimation drills. */
  totalError: number;
  totalMs: number;
  streak: number;
  bestStreak: number;
  /** One entry per session day: accuracy that day. */
  history: { day: string; rounds: number; correct: number }[];
}

/** SM-2 state for one review card. */
export interface SrsState {
  ease: number;
  interval: number;
  reps: number;
  due: number;
  lapses: number;
}

export interface Settings {
  theme: 'dark' | 'light';
  fourColor: boolean;
}

export interface SavedRange {
  name: string;
  text: string;
}

interface Data {
  settings: Settings;
  lessons: Record<string, LessonProgress>;
  trainers: Record<string, TrainerStats>;
  srs: Record<string, SrsState>;
  notes: Record<string, string>;
  savedRanges: SavedRange[];
  lastLesson: string | null;
  placement: string | null;
  days: string[];
}

interface Actions {
  setSettings: (s: Partial<Settings>) => void;
  completeLesson: (id: string, quizScore: number) => void;
  visitLesson: (id: string) => void;
  recordRound: (trainer: string, correct: boolean, ms: number, error?: number) => void;
  setSrs: (id: string, s: SrsState) => void;
  setNote: (lesson: string, text: string) => void;
  saveRange: (r: SavedRange) => void;
  deleteRange: (name: string) => void;
  setPlacement: (moduleId: string) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  reset: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const initial: Data = {
  settings: { theme: 'dark', fourColor: false },
  lessons: {},
  trainers: {},
  srs: {},
  notes: {},
  savedRanges: [],
  lastLesson: null,
  placement: null,
  days: [],
};

const touchDay = (days: string[]) => (days.includes(today()) ? days : [...days, today()].slice(-400));

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      completeLesson: (id, quizScore) =>
        set((st) => ({
          lessons: {
            ...st.lessons,
            [id]: { done: true, quizBest: Math.max(quizScore, st.lessons[id]?.quizBest ?? 0), at: Date.now() },
          },
          days: touchDay(st.days),
        })),
      visitLesson: (id) => set({ lastLesson: id }),
      recordRound: (trainer, correct, ms, error = 0) =>
        set((st) => {
          const prev: TrainerStats = st.trainers[trainer] ?? {
            rounds: 0, correct: 0, totalError: 0, totalMs: 0, streak: 0, bestStreak: 0, history: [],
          };
          const streak = correct ? prev.streak + 1 : 0;
          const day = today();
          const history = [...prev.history];
          const last = history[history.length - 1];
          if (last && last.day === day)
            history[history.length - 1] = { day, rounds: last.rounds + 1, correct: last.correct + (correct ? 1 : 0) };
          else history.push({ day, rounds: 1, correct: correct ? 1 : 0 });
          return {
            trainers: {
              ...st.trainers,
              [trainer]: {
                rounds: prev.rounds + 1,
                correct: prev.correct + (correct ? 1 : 0),
                totalError: prev.totalError + error,
                totalMs: prev.totalMs + ms,
                streak,
                bestStreak: Math.max(prev.bestStreak, streak),
                history: history.slice(-120),
              },
            },
            days: touchDay(st.days),
          };
        }),
      setSrs: (id, s) => set((st) => ({ srs: { ...st.srs, [id]: s }, days: touchDay(st.days) })),
      setNote: (lesson, text) => set((st) => ({ notes: { ...st.notes, [lesson]: text } })),
      saveRange: (r) => set((st) => ({ savedRanges: [...st.savedRanges.filter((x) => x.name !== r.name), r] })),
      deleteRange: (name) => set((st) => ({ savedRanges: st.savedRanges.filter((x) => x.name !== name) })),
      setPlacement: (moduleId) => set({ placement: moduleId }),
      exportData: () => {
        const { settings, lessons, trainers, srs, notes, savedRanges, lastLesson, placement, days } = get();
        return JSON.stringify(
          { app: 'poker-academy', version: 1, exportedAt: new Date().toISOString(), data: { settings, lessons, trainers, srs, notes, savedRanges, lastLesson, placement, days } },
          null,
          2,
        );
      },
      importData: (json) => {
        try {
          const parsed = JSON.parse(json);
          if (parsed?.app !== 'poker-academy' || typeof parsed.data !== 'object') return false;
          set({ ...initial, ...parsed.data, settings: { ...initial.settings, ...parsed.data.settings } });
          return true;
        } catch {
          return false;
        }
      },
      reset: () => set({ ...initial, settings: get().settings }),
    }),
    { name: 'poker-academy', version: 1, storage: createJSONStorage(() => safeStorage) },
  ),
);

/** Consecutive days of activity ending today or yesterday. */
export function currentStreak(days: readonly string[]): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
