import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface DrillMeta {
  id: string;
  serial: string;
  title: string;
  blurb: string;
  track: "Hold'em" | 'Tournaments' | 'Omaha' | 'All games';
  component?: LazyExoticComponent<ComponentType>;
}

export const DRILLS: DrillMeta[] = [
  { id: 'hand-ranking', serial: 'D-01', title: 'Which hand wins', track: "Hold'em", blurb: 'Two hands and a board. Kickers, counterfeits and boards that play.', component: lazy(() => import('./HandRankingDrill')) },
  { id: 'outs', serial: 'D-02', title: 'Count the outs', track: "Hold'em", blurb: 'Ten seconds to count every card that makes a straight or better.', component: lazy(() => import('./OutsDrill')) },
  { id: 'pot-odds', serial: 'D-03', title: 'Call or fold', track: 'All games', blurb: 'Pot, bet and your equity. Decide, then see the arithmetic.', component: lazy(() => import('./PotOddsDrill')) },
  { id: 'equity', serial: 'D-04', title: 'Estimate the equity', track: "Hold'em", blurb: 'Guess hand against hand, before or on the flop. Scored by how far off you are.', component: lazy(() => import('./EquityDrill')) },
  { id: 'combos', serial: 'D-05', title: 'Count the combos', track: "Hold'em", blurb: 'How many combinations remain given the board and your cards.', component: lazy(() => import('./ComboDrill')) },
  { id: 'preflop', serial: 'D-06', title: 'Preflop decisions', track: "Hold'em", blurb: 'Position and action in, fold, call or raise out.', component: lazy(() => import('./PreflopDrill')) },
  { id: 'mdf', serial: 'D-07', title: 'MDF and alpha', track: "Hold'em", blurb: 'Rapid-fire bet sizes. Defend how often? Bluff how often?', component: lazy(() => import('./MdfDrill')) },
  { id: 'replayer', serial: 'D-08', title: 'Hand replayer', track: "Hold'em", blurb: 'Original hands street by street with a decision at each key point.', component: lazy(() => import('./HandReplayer')) },
  { id: 'icm', serial: 'D-09', title: 'ICM spots', track: 'Tournaments', blurb: 'Call or fold a shove on the bubble.' },
  { id: 'plo', serial: 'D-10', title: 'Omaha hand reading', track: 'Omaha', blurb: 'Find the real best hand under the two-card rule, and count wrap outs.' },
];

export const findDrill = (id: string) => DRILLS.find((d) => d.id === id);
