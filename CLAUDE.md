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

Phase 5: Modules 3 and 4 (preflop, postflop), heatmap tool, more drills. Phases 1 to 4 are done and deployed to GitHub Pages on every push to main.
