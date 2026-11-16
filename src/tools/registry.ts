import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface ToolMeta {
  id: string;
  serial: string;
  title: string;
  blurb: string;
  track: "Hold'em" | 'Tournaments' | 'Omaha' | 'All games';
  component?: LazyExoticComponent<ComponentType>;
}

export const TOOLS: ToolMeta[] = [
  {
    id: 'equity', serial: 'T-01', title: 'Equity Calculator', track: "Hold'em",
    blurb: 'Hands or ranges for up to nine players. Exact enumeration when it fits, Monte Carlo with a confidence interval when it does not.',
    component: lazy(() => import('./EquityCalculator')),
  },
  {
    id: 'range', serial: 'T-02', title: 'Range Builder', track: "Hold'em",
    blurb: 'Paint a 13 by 13 grid, set weights, count combos with blockers, save and compare ranges.',
    component: lazy(() => import('./RangeBuilder')),
  },
  {
    id: 'outs', serial: 'T-03', title: 'Odds and Outs', track: "Hold'em",
    blurb: 'Every improving card found and grouped, with exact odds next to the rule of 2 and 4.',
    component: lazy(() => import('./OutsCalculator')),
  },
  {
    id: 'pot-odds', serial: 'T-04', title: 'Pot Odds and EV', track: 'All games',
    blurb: 'Break-even equity, EV of a call, implied odds, MDF and alpha from one set of inputs.',
    component: lazy(() => import('./PotOddsCalculator')),
  },
  { id: 'heatmap', serial: 'T-05', title: 'Range vs Range Heatmap', track: "Hold'em", blurb: 'Exact equity of every hand in a range against another range on a given board.' },
  { id: 'side-pots', serial: 'T-06', title: 'Side Pot Calculator', track: 'All games', blurb: 'Who can win which chips when stacks are uneven.', component: lazy(() => import('./SidePotCalculator')) },
  { id: 'toy-games', serial: 'T-07', title: 'Toy Game Lab', track: "Hold'em", blurb: 'The polarized river game and Kuhn poker solved by CFR while you watch.' },
  { id: 'push-fold', serial: 'T-08', title: 'Push/Fold Nash Solver', track: 'Tournaments', blurb: 'Heads-up jam and call ranges by stack depth and ante, solved in your browser.' },
  { id: 'icm', serial: 'T-09', title: 'ICM Calculator', track: 'Tournaments', blurb: 'Stacks and payouts in, prize equity out, plus a bubble call or fold helper.' },
  { id: 'variance', serial: 'T-10', title: 'Variance Simulator', track: 'All games', blurb: 'Bankroll paths, percentiles, risk of ruin and the longest break-even stretch.', component: lazy(() => import('./VarianceSimulator')) },
  { id: 'pot-limit', serial: 'T-11', title: 'Pot-Limit Calculator', track: 'Omaha', blurb: 'The maximum legal bet at every step of an action sequence.' },
];

export const findTool = (id: string) => TOOLS.find((t) => t.id === id);
