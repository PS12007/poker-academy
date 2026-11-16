# Poker Academy

**Live site: https://ps12007.github.io/poker-academy/**

An interactive poker course: lessons from the rules to game theory, calculators, simulations and drills.
Every number on the site is derived on screen or computed by the engine in your browser. No backend, no account.

## What is in it

- **Course**: MDX lessons with live tools, worked examples and quizzes that feed a spaced-repetition queue.
- **Instruments**: equity calculator (exact and Monte Carlo), range builder, odds and outs, pot odds and EV, side pots, variance simulator.
- **Drills**: endless seeded rounds with accuracy, streak and timing stats.
- **Engine**: pure TypeScript. Hand evaluator verified against all 2,598,960 five-card and 133,784,560 seven-card hands.

## Develop

```
npm install
npm run dev        # local site
npm test           # engine and content tests
npm run build      # production build
```

Pushing to `main` runs the tests and deploys to GitHub Pages. See `PLAN.md` for the build plan and `CLAUDE.md` for conventions.
