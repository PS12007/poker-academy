# Poker Academy: build plan

Interactive poker course: curriculum, calculators, simulations and trainers, all backed by one tested engine.
Static site, no backend. Hold'em is built first and deepest, then tournaments, then PLO and other variants.

## Build order

The original spec's phases are reordered so that everything Hold'em ships before other games.

| Phase | Scope | Status |
|---|---|---|
| 1 | Scaffold, cards, evaluators (5/7 card, Omaha), RNG, combinatorics, verification tests | done |
| 2 | Ranges, exact + Monte Carlo equity, exact range vs range, workers, benchmark | done |
| 3 | App shell, design system, card and range components, Equity / Range / Outs / Pot odds tools, progress store | |
| 4 | MDX pipeline, Modules 1 and 2, quizzes, glossary, cheat sheets, Hand ranking / Outs / Pot odds trainers | |
| 5 | Modules 3 and 4, range heatmap, Combo and Equity estimation trainers, hand replayer | |
| 6 | Theory functions, river toy game, Kuhn CFR lab, push/fold Nash solver, Module 5, MDF trainer | |
| 7 | Tournaments (Hold'em): ICM calculator, Module 6, ICM trainer | |
| 8 | Bankroll and mental game: variance simulator, Module 8, spaced repetition, placement quiz, dashboard, search, notes | |
| 9 | PLO: Module 7, PLO equity, pot-limit calculator, PLO trainer | |
| 10 | Other variants (Module 9), accessibility and performance pass, Playwright, service worker, deploy config | |

## File tree

```
src/
  engine/            pure TS, no DOM, runs in Node and in workers
    cards.ts         card = rank*4 + suit, parsing, suit isomorphism
    evalCore.ts      suit-mask evaluator, 1..7462, higher is better
    evaluator5.ts    evaluator7.ts    omaha.ts
    combinatorics.ts nCr, outs, hypergeometric, starting hand facts
    ranges.ts        169-class ranges, text syntax, blockers
    equity/          exact.ts  monteCarlo.ts  rangeVsRange.ts  index.ts
    describe.ts      hand naming, best five
    outs.ts          outs finder by category
    ev.ts            pot odds, EV of call / shove, implied odds
    theory.ts        MDF, alpha, bluff ratio, geometric sizing, SPR
    sidePots.ts      potLimit.ts
    icm.ts           pushFold.ts      cfr/kuhn.ts
    variance.ts      rng.ts
    teachingRanges.ts  original simplified opening ranges, labeled as such
  workers/           Comlink workers wrapping the engine
  content/           MDX lessons by module + curriculum.ts + glossary.ts
  components/        cards, range, table, charts, quiz, lesson, ui
  tools/             standalone calculators (also embeddable in lessons)
  trainers/          drills
  pages/             routes
  store/             zustand stores persisted to localStorage
  lib/               formatting, hooks, worker client
tests/engine/        vitest + fast-check
scripts/             bench.ts, gen-data.ts, lint-content.ts
```

## Data model

- `Card`: int 0..51. `Range`: Float32Array(169) of weights. `PlayerSpec`: weighted list of concrete holdings.
- Lesson: one MDX file exporting `quiz` (array of questions), rendered inside a lesson shell. Metadata
  (title, difficulty, minutes, objectives, prerequisites) lives in `content/curriculum.ts`.
- Progress store: `{ lessons: {id: {done, quizBest, at}}, trainers: {id: {rounds, correct, history}}, srs: {cardId: SM-2 state}, notes, settings, savedRanges }`.

## Curriculum

1. **Absolute Basics**: what poker is, hand rankings, Hold'em rules, betting actions, positions, first strategy, reading the board
2. **Core Math**: outs, probability by street, pot odds, implied odds, expected value, combinatorics, equity realization, variance
3. **Preflop**: opening, 3-betting, 4-bets and stack depth, blind defense, squeezes and isolation, building ranges
4. **Postflop**: range vs nut advantage, c-betting, position and check-raising, turn, river, sizing theory, hand reading, blockers, SPR, multiway
5. **Game Theory**: exploit vs GTO, indifference, river toy game, Kuhn CFR, mixed strategies, how solvers work, node locking
6. **Tournaments**: structure, push/fold, ICM, bubble factor, final tables, bounties
7. **Pot-Limit Omaha**: rules, pot-limit math, hand categories, close equities, wraps, blockers, postflop, PLO5 and hi-lo
8. **Cash, Bankroll, Mental Game**: bankroll, risk of ruin, downswings, tilt, live poker, rake
9. **Other Variants**: short deck, stud and razz, mixed games

## Deviations from the spec (deliberate)

- Charts are hand-built SVG instead of Recharts. Smaller bundle and they match the visual system.
- Formulas are typeset with a small `<Formula>` component instead of KaTeX.
- The 7-card enumeration test runs in about five seconds, so it runs in the normal test suite instead of CI only.
- Higher rank value is better (7462 is a royal flush). The spec only requires 1..7462.
