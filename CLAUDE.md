# Poker Academy

Static React app that teaches poker with a tested engine behind every number. See PLAN.md for phases and file tree.

## Commands

- `npm run dev` start Vite
- `npm test` all engine tests (includes full C(52,5) and C(52,7) enumerations, about 10 s)
- `npm run typecheck`, `npm run lint`, `npm run build`
- `npm run bench` evaluator and equity throughput
- `npm run lint:content` fails if a lesson lacks objectives, a Remember box or a quiz
- `npm run gen` regenerates engine-computed data in `src/generated/`

Run typecheck, lint, test and build before every commit that ends a phase.

## Conventions

- `src/engine/` is pure TypeScript. No React, no DOM, no `Math.random` (use `rng.ts` with a seed).
- Card = `rank * 4 + suit`, rank 0..12 is 2..A, suit 0..3 is c d h s.
- Hand rank is 1..7462 and HIGHER IS BETTER.
- A range is `Float32Array(169)`, index `row * 13 + col`, rows and cols run A..2, suited above the diagonal.
- Never type an equity or probability into lesson text. Use engine functions or the `<Eq>` / `<Num>` components.
- Preflop ranges are either solver output from this repo or labeled as simplified teaching ranges.
- Content voice: plain, direct, technical. No hype, no em dashes, few quotation marks.
- Heavy work goes through `src/workers/` (Comlink). Cancel by terminating the worker.
- Write files with the Write tool, not shell heredocs (heredocs with quotes break in this shell).

## Design system

Security-print / engraved-ledger look: ink background, bone type, hairline rules, guilloche line art,
serial numbers and microtext. Fonts: Bodoni Moda (display), Schibsted Grotesk (text), Martian Mono (data).
No rounded cards with drop shadows, no gradient buttons, no glass. Tokens live in `src/index.css`.

## Current phase

Phase 6 (game theory) is in progress. Live site: https://ps12007.github.io/poker-academy/ (every push to main runs
typecheck, lint, tests and deploys via .github/workflows/deploy.yml).

Done: engine, all tools except ICM and pot-limit, Modules 1 to 4 complete, Module 5 lessons 1 to 3
(exploit-vs-gto, indifference, river-toy-game), drills D-01 to D-08, reference pages, review queue, placement quiz.

Next, in order:
1. Module 5 lessons 4 to 7: kuhn-poker (use <KuhnLab />), mixed-strategies (<PushFoldTool />), how-solvers-work, node-locking.
2. Phase 7 tournaments: src/engine/icm.ts (Malmuth-Harville, bubble factor) with tests against hand-computed 3-player
   examples, ICM calculator tool (T-09), Module 6 (folder src/content/m6), ICM drill (D-09).
3. Phase 8: Module 8 lessons (folder src/content/m8, shown as module 7 in the UI), global search (minisearch is installed, unused).
4. Phase 9 PLO: pot-limit calculator (src/engine/potLimit.ts, T-11), Omaha mode in the equity calculator, Module 7 (src/content/m7), PLO drill (D-10).
5. Phase 10: Module 9, Playwright smoke tests, service worker for offline, accessibility and Lighthouse pass, README screenshots.

## How to add things

- Lesson: create src/content/<moduleId>/<lessonId>.mdx (ids are in src/content/curriculum.ts). It becomes available automatically.
  It must export `quiz` (5 to 10 questions) and contain <Objectives>, <Remember> (3 to 6 items), <Mistakes> and at least one <Live>.
  tests/content/lessons.test.tsx renders every lesson and enforces this. Components usable without import are listed in
  src/components/lesson/prose.tsx (MDX_COMPONENTS).
- MDX gotchas: a block of exports must not start with a // comment (it becomes prose). Braces inside backticks are literal.
  Avoid the less-than sign in prose. No em or en dashes.
- Tool: add a component in src/tools and set `component` in src/tools/registry.ts. Drill: same in src/trainers/registry.ts, built on DrillShell.
- Heavy computation: add a method to src/workers/engine.worker.ts and call it through useJob or useCached (src/lib/engine.ts).
- Visual check: npm run build, npx vite preview --port 4173, then node scripts/shot.mjs <outDir> <route[@mobile][@full]>.
  Pass routes without a leading slash (Git Bash rewrites them), e.g. tools/equity or home.
- Generated data: npm run gen (hand order) and npx tsx scripts/gen-equity169.ts (push/fold equity table, about two minutes).
