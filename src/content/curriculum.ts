export type Level = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export type Track = "Hold'em" | 'Tournaments' | 'Omaha' | 'All games';

export interface LessonMeta {
  id: string;
  title: string;
  level: Level;
  minutes: number;
  /** One line shown in the index. */
  gist: string;
}

export interface ModuleMeta {
  id: string;
  n: number;
  title: string;
  track: Track;
  blurb: string;
  /** Module ids that should come first. */
  requires: string[];
  lessons: LessonMeta[];
}

const L = (id: string, title: string, level: Level, minutes: number, gist: string): LessonMeta => ({ id, title, level, minutes, gist });

export const MODULES: ModuleMeta[] = [
  {
    id: 'm1', n: 1, title: 'Absolute Basics', track: "Hold'em", requires: [],
    blurb: 'The rules, the hands, the positions and a first strategy that already beats most beginners.',
    lessons: [
      L('what-poker-is', 'What poker is', 'Beginner', 8, 'The goal, chips and money, cash games and tournaments.'),
      L('hand-rankings', 'Hand rankings', 'Beginner', 12, 'Nine categories, ordered by how rare they are.'),
      L('holdem-rules', "Texas Hold'em rules", 'Beginner', 15, 'Blinds, streets, showdown, split pots and side pots.'),
      L('betting-actions', 'Betting actions', 'Beginner', 10, 'Check, bet, call, raise, fold and the minimum raise.'),
      L('positions', 'Positions', 'Beginner', 10, 'Why acting last is worth money.'),
      L('first-strategy', 'Your first strategy', 'Beginner', 14, 'Tight and aggressive, with a starting chart.'),
      L('reading-the-board', 'Reading the board', 'Beginner', 12, 'The nuts, draws, paired boards, wet and dry textures.'),
    ],
  },
  {
    id: 'm2', n: 2, title: 'Core Math', track: "Hold'em", requires: ['m1'],
    blurb: 'Outs, odds, expected value and combinations. The arithmetic every later idea is built on.',
    lessons: [
      L('counting-outs', 'Counting outs', 'Beginner', 12, 'Clean outs, tainted outs and discounting.'),
      L('probability-by-street', 'Probability by street', 'Beginner', 12, 'Exact odds and the rule of 2 and 4.'),
      L('pot-odds', 'Pot odds', 'Beginner', 12, 'The price of a call and the equity it needs.'),
      L('implied-odds', 'Implied and reverse implied odds', 'Intermediate', 12, 'Money that goes in after the call.'),
      L('expected-value', 'Expected value', 'Intermediate', 14, 'Decisions as weighted averages.'),
      L('combinatorics', 'Combinatorics', 'Intermediate', 14, 'Counting combos, card removal and blockers.'),
      L('equity-realization', 'Equity realization', 'Intermediate', 10, 'Why raw equity overstates some hands.'),
      L('variance', 'Variance and sample size', 'Intermediate', 12, 'Why results lie in the short run.'),
    ],
  },
  {
    id: 'm3', n: 3, title: 'Preflop', track: "Hold'em", requires: ['m2'],
    blurb: 'Opening, 3-betting, defending the blinds, and how stack depth changes all of it.',
    lessons: [
      L('opening', 'Open-raising', 'Intermediate', 14, 'Ranges by position and how big to raise.'),
      L('three-betting', '3-betting', 'Intermediate', 14, 'Value, bluffs, linear and polarized ranges.'),
      L('four-bets', '4-bets and stack depth', 'Intermediate', 12, '4-bets, 5-bet shoves and what 100 blinds changes.'),
      L('blind-defense', 'Blind defense', 'Intermediate', 12, 'Pot odds from the big blind.'),
      L('squeezes', 'Squeezes, cold calls and limps', 'Intermediate', 12, 'Multiway preflop pots and isolation raises.'),
      L('building-ranges', 'Building ranges', 'Intermediate', 10, 'Painting, counting and saving ranges.'),
    ],
  },
  {
    id: 'm4', n: 4, title: 'Postflop', track: "Hold'em", requires: ['m3'],
    blurb: 'Ranges meeting boards. Betting, sizing, hand reading and planning across three streets.',
    lessons: [
      L('range-advantage', 'Range and nut advantage', 'Intermediate', 12, 'Who the board favors and why it matters.'),
      L('c-betting', 'Continuation betting', 'Intermediate', 14, 'Texture, frequency and small versus large.'),
      L('position-postflop', 'In and out of position', 'Intermediate', 12, 'Check-raising and protecting checks.'),
      L('turn-play', 'Turn play', 'Advanced', 14, 'Barrels, and turn cards that shift equity.'),
      L('river-play', 'River play', 'Advanced', 14, 'Thin value, bluff catching, polar and merged.'),
      L('bet-sizing', 'Bet sizing theory', 'Advanced', 14, 'Sizing follows range shape. Geometric sizing.'),
      L('hand-reading', 'Hand reading', 'Advanced', 14, 'Narrowing a range street by street.'),
      L('blockers', 'Blockers in practice', 'Advanced', 12, 'Which cards to bluff and call with.'),
      L('spr', 'SPR and commitment', 'Advanced', 10, 'Planning the hand from the flop.'),
      L('multiway', 'Multiway pots', 'Advanced', 10, 'Why everything tightens with three players.'),
    ],
  },
  {
    id: 'm5', n: 5, title: 'Game Theory', track: "Hold'em", requires: ['m4'],
    blurb: 'Equilibrium, indifference and what solvers actually compute, built up from toy games.',
    lessons: [
      L('exploit-vs-gto', 'Exploitative and GTO play', 'Advanced', 12, 'Nash equilibrium, simply then rigorously.'),
      L('indifference', 'Indifference', 'Advanced', 14, 'MDF and alpha derived from scratch.'),
      L('river-toy-game', 'The river toy game', 'Advanced', 14, 'Polarized bettor against a bluff catcher.'),
      L('kuhn-poker', 'Kuhn poker and CFR', 'Expert', 16, 'Watch regret minimization find equilibrium.'),
      L('mixed-strategies', 'Mixed strategies', 'Expert', 12, 'Why solvers mix and when it matters.'),
      L('how-solvers-work', 'How solvers work', 'Expert', 14, 'Game trees, abstraction and exploitability.'),
      L('node-locking', 'Node locking and exploits', 'Expert', 12, 'Adjusting to how people really play.'),
    ],
  },
  {
    id: 'm6', n: 6, title: 'Tournaments', track: 'Tournaments', requires: ['m3'],
    blurb: 'Chips are not money. Push or fold, ICM, bubbles and bounties.',
    lessons: [
      L('tournament-structure', 'Tournament structure', 'Intermediate', 10, 'Blinds, antes and stack depth in big blinds.'),
      L('push-fold', 'Push or fold', 'Intermediate', 14, 'Nash ranges from the in-app solver.'),
      L('icm', 'ICM', 'Advanced', 14, 'Turning chip stacks into prize money.'),
      L('bubble-factor', 'Bubble factor and risk premium', 'Advanced', 12, 'Why calling ranges tighten near the money.'),
      L('final-table', 'Final tables', 'Advanced', 12, 'Pay jumps, big stacks and short stacks.'),
      L('bounties', 'Bounty tournaments', 'Advanced', 10, 'Pricing a bounty into pot odds.'),
    ],
  },
  {
    id: 'm8', n: 7, title: 'Bankroll and the Mental Game', track: 'All games', requires: ['m2'],
    blurb: 'Surviving variance: bankroll rules, risk of ruin, downswings, tilt and game selection.',
    lessons: [
      L('bankroll', 'Bankroll management', 'Beginner', 10, 'Buy-in guidelines and where they come from.'),
      L('risk-of-ruin', 'Risk of ruin', 'Intermediate', 12, 'The probability of going broke, simulated.'),
      L('downswings', 'Downswings', 'Intermediate', 10, 'How long and how deep they get.'),
      L('tilt', 'Tilt and decision quality', 'Beginner', 10, 'Judging decisions, not results.'),
      L('live-poker', 'Live poker', 'Beginner', 10, 'Tells, timing and table selection.'),
      L('rake', 'Game selection and rake', 'Intermediate', 10, 'What the house takes from your winrate.'),
    ],
  },
  {
    id: 'm7', n: 8, title: 'Pot-Limit Omaha', track: 'Omaha', requires: ['m4'],
    blurb: 'Four cards, two must play. Close equities, wraps, nut draws and pot-limit arithmetic.',
    lessons: [
      L('plo-rules', 'Rules and the two-plus-three rule', 'Intermediate', 10, 'Exactly two from your hand, three from the board.'),
      L('pot-limit-math', 'Pot-limit betting', 'Intermediate', 10, 'Computing the maximum raise.'),
      L('plo-hand-categories', 'Starting hand categories', 'Intermediate', 12, 'Rundowns, suits, aces and danglers.'),
      L('plo-equities', 'Why equities run close', 'Intermediate', 10, 'Engine-computed matchups.'),
      L('wraps', 'Wraps and nut draws', 'Advanced', 14, 'Counting 13, 17 and 20 out straight draws.'),
      L('plo-blockers', 'Blockers in PLO', 'Advanced', 10, 'The bare ace and set blockers.'),
      L('plo-postflop', 'Postflop strategy', 'Advanced', 12, 'SPR, the nuts and freerolls.'),
      L('plo5-hilo', 'PLO5 and hi-lo', 'Advanced', 10, 'Five cards, split pots, quartering.'),
    ],
  },
  {
    id: 'm9', n: 9, title: 'Other Variants', track: 'All games', requires: ['m1'],
    blurb: 'Short deck, stud, razz and mixed games at overview level.',
    lessons: [
      L('short-deck', 'Short deck', 'Intermediate', 10, 'Thirty-six cards and a reordered ranking.'),
      L('stud-razz', 'Stud and razz', 'Intermediate', 10, 'No community cards, and the low game.'),
      L('mixed-games', 'Mixed games', 'Intermediate', 8, 'Rotations and what carries over.'),
    ],
  },
];

/** Lesson source files, loaded on demand. A lesson is available once its file exists. */
export const LESSON_FILES = import.meta.glob<{ default: React.ComponentType; quiz?: unknown }>('./m*/*.mdx');

export function lessonKey(moduleId: string, lessonId: string): string {
  return `${moduleId}/${lessonId}`;
}

export function lessonAvailable(moduleId: string, lessonId: string): boolean {
  return `./${moduleId}/${lessonId}.mdx` in LESSON_FILES;
}

export interface FlatLesson extends LessonMeta {
  module: ModuleMeta;
  index: number;
  key: string;
  available: boolean;
}

export const ALL_LESSONS: FlatLesson[] = MODULES.flatMap((m) =>
  m.lessons.map((l, index) => ({ ...l, module: m, index, key: lessonKey(m.id, l.id), available: lessonAvailable(m.id, l.id) })),
);

export function findLesson(moduleId: string, lessonId: string): FlatLesson | undefined {
  return ALL_LESSONS.find((l) => l.module.id === moduleId && l.id === lessonId);
}

export function neighbors(key: string): { prev?: FlatLesson; next?: FlatLesson } {
  const avail = ALL_LESSONS.filter((l) => l.available);
  const i = avail.findIndex((l) => l.key === key);
  return { prev: i > 0 ? avail[i - 1] : undefined, next: i >= 0 ? avail[i + 1] : undefined };
}

export const lessonPath = (l: { module: { id: string }; id: string }) => `/learn/${l.module.id}/${l.id}`;
