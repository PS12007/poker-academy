export interface FormulaEntry {
  name: string;
  formula: string;
  note: string;
  /** "module/lesson" where it is derived. */
  lesson: string;
}

export const FORMULAS: FormulaEntry[] = [
  { name: 'Hit on one card', formula: 'outs / unseen cards', note: '47 unseen on the flop, 46 on the turn.', lesson: 'm2/probability-by-street' },
  { name: 'Hit by the river', formula: '1 − (47 − outs)/47 × (46 − outs)/46', note: 'From the flop, seeing both cards.', lesson: 'm2/probability-by-street' },
  { name: 'Rule of 2 and 4', formula: 'outs × 2 (one card), outs × 4 (two cards)', note: 'Approximate percentages.', lesson: 'm2/probability-by-street' },
  { name: 'Corrected rule for big draws', formula: '4 × outs − (outs − 8)', note: 'Use when outs exceed 8.', lesson: 'm2/probability-by-street' },
  { name: 'Runner-runner', formula: '(first outs / 47) × (second outs / 46)', note: 'Backdoor flush: 10/47 × 9/46.', lesson: 'm2/probability-by-street' },
  { name: 'Pot odds', formula: 'equity needed = call / (pot + call)', note: 'Pot includes the bet you face.', lesson: 'm2/pot-odds' },
  { name: 'Odds to percentage', formula: 'x to 1 → 1 / (x + 1)', note: '', lesson: 'm2/pot-odds' },
  { name: 'Implied odds', formula: 'extra needed = call × (1 − equity) / equity − pot', note: 'Average extra won on the times you hit.', lesson: 'm2/implied-odds' },
  { name: 'Expected value', formula: 'EV = Σ probability × result', note: 'Folding is zero.', lesson: 'm2/expected-value' },
  { name: 'EV of a call', formula: 'equity × pot − (1 − equity) × call', note: 'No further betting.', lesson: 'm2/expected-value' },
  { name: 'EV of a pure bluff', formula: 'fold% × pot − (1 − fold%) × bet', note: '', lesson: 'm2/expected-value' },
  { name: 'EV of a shove', formula: 'fold% × pot + (1 − fold%) × (equity × final pot − risk)', note: 'Final pot includes your shove.', lesson: 'm2/expected-value' },
  { name: 'Combos', formula: 'pair 6 · suited 4 · offsuit 12 · unpaired 16', note: '1,326 in total, 169 distinct hands.', lesson: 'm2/combinatorics' },
  { name: 'Equity realization', formula: 'realized share = raw equity × realization factor', note: 'The factor is estimated, not looked up.', lesson: 'm2/equity-realization' },
  { name: 'Spread of results', formula: 'sd × √(hands / 100)', note: 'sd in bb per 100 hands.', lesson: 'm2/variance' },
  { name: 'Uncertainty of a measured winrate', formula: 'sd / √(hands / 100)', note: 'One standard error, in bb/100.', lesson: 'm2/variance' },
  { name: 'Risk of ruin', formula: 'exp(−2 × winrate × bankroll / sd²)', note: 'Positive winrate, never moving down.', lesson: 'm2/variance' },
  { name: 'Minimum defense frequency', formula: 'MDF = pot / (pot + bet)', note: 'Pot before the bet.', lesson: 'm5/indifference' },
  { name: 'Alpha', formula: 'α = bet / (pot + bet) = 1 − MDF', note: 'How often a pure bluff must work.', lesson: 'm5/indifference' },
  { name: 'Balanced river bluff share', formula: 'bluffs / (bluffs + value) = bet / (pot + 2 × bet)', note: 'Equals the caller’s pot odds.', lesson: 'm5/river-toy-game' },
  { name: 'Geometric sizing', formula: '(1 + 2f)ⁿ = (pot + 2 × stack) / pot', note: 'f is the pot fraction bet on each of n streets.', lesson: 'm4/bet-sizing' },
  { name: 'Stack-to-pot ratio', formula: 'SPR = effective stack / pot', note: 'Measured on the flop.', lesson: 'm4/spr' },
];
