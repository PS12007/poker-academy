import { describe, expect, it } from 'vitest';
import { parseCards } from '../../src/engine/cards';
import { describeHand, describeRank } from '../../src/engine/describe';
import { evaluate, Category } from '../../src/engine/evalCore';
import { findOuts, outsVersus } from '../../src/engine/outs';
import { evBluff, evCall, evCallImplied, evShove, impliedOddsNeeded, potOdds, potOddsRatio } from '../../src/engine/ev';
import { alpha, bluffFraction, bluffsPerValue, geometricFraction, geometricPlan, mdf, solveRiverToyGame, spr } from '../../src/engine/theory';
import { awardPots, buildPots } from '../../src/engine/sidePots';

const name = (s: string) => describeHand(parseCards(s)).name;

describe('describe', () => {
  it('names every category', () => {
    expect(name('AsKsQsJsTs')).toBe('Royal flush');
    expect(name('9s8s7s6s5s')).toBe('Straight flush, nine high');
    expect(name('As2s3s4s5s')).toBe('Straight flush, five high');
    expect(name('KsKdKhKc2s')).toBe('Four of a kind, kings');
    expect(name('KsKdKh7c7s')).toBe('Full house, kings full of sevens');
    expect(name('7sKdKh7c7d')).toBe('Full house, sevens full of kings');
    expect(name('As9s7s4s2s')).toBe('Flush, ace high');
    expect(name('As2d3h4c5s')).toBe('Straight, five high');
    expect(name('AsKdQhJcTs')).toBe('Straight, ace high');
    expect(name('8s8d8hKc2s')).toBe('Three of a kind, eights');
    expect(name('AsAd3h3c2s')).toBe('Two pair, aces and threes');
    expect(name('4s4d3h3cAs')).toBe('Two pair, fours and threes');
    expect(name('3s3d2h2cAs')).toBe('Two pair, threes and twos');
    expect(name('JsJd3h9c2s')).toBe('Pair of jacks');
    expect(name('Ks9d7h4c2s')).toBe('King high');
  });
  it('is defined for all 7,462 ranks', () => {
    for (let r = 1; r <= 7462; r++) expect(describeRank(r).length).toBeGreaterThan(5);
  });
  it('finds the five cards that play', () => {
    const d = describeHand(parseCards('AsKsQdJdTd3d2d'));
    expect(d.category).toBe(Category.Flush);
    expect(d.best.every((c) => (c & 3) === 1)).toBe(true);
    expect(evaluate(d.best)).toBe(d.rank);
  });
});

describe('outs', () => {
  it('flush draw: 9 outs', () => {
    const r = findOuts(parseCards('Ah7h'), parseCards('Kh9h2c'));
    expect(r.byCategory.find((g) => g.category === Category.Flush)!.cards.length).toBe(9);
    expect(r.unseen).toBe(47);
  });
  it('open-ended straight draw: 8 outs, gutshot: 4', () => {
    const oesd = findOuts(parseCards('9s8d'), parseCards('7h6c2s'));
    expect(oesd.byCategory.find((g) => g.category === Category.Straight)!.cards.length).toBe(8);
    const gut = findOuts(parseCards('9s8d'), parseCards('6h5c2s'));
    expect(gut.byCategory.find((g) => g.category === Category.Straight)!.cards.length).toBe(4);
  });
  it('overcards: 6 pair outs, and board-pairing cards are not outs', () => {
    const r = findOuts(parseCards('AsKd'), parseCards('Qh7c2s'));
    expect(r.outs.length).toBe(6);
    expect(r.outs.every((o) => o.category === Category.Pair)).toBe(true);
  });
  it('a pair does not count board pairs as improvement, but a set counts them', () => {
    const pair = findOuts(parseCards('AsQd'), parseCards('Qh7c2s'));
    expect(pair.outs.length).toBe(5); // two queens, three aces
    const set = findOuts(parseCards('7s7d'), parseCards('Qh7c2s'));
    expect(set.outs.length).toBe(7); // one seven, three queens, three twos
  });
  it('combo draw: flush plus open-ender is 15', () => {
    const r = findOuts(parseCards('9h8h'), parseCards('7h6h2c'));
    expect(r.outs.filter((o) => o.category >= Category.Straight).length).toBe(15);
    expect(r.outs.length).toBe(21); // plus six cards that only make a pair
  });
  it('versus a known hand', () => {
    const v = outsVersus(parseCards('Ah7h'), parseCards('KsKd'), parseCards('Kh9h2c'));
    expect(v.behind).toBe(true);
    // Nine hearts remain, but the 2h pairs the board and fills the set up: 8 clean outs.
    expect(v.outs.length).toBe(8);
    expect(() => findOuts(parseCards('Ah7h'), [])).toThrow();
    expect(() => outsVersus(parseCards('Ah7h'), parseCards('KsKd'), [])).toThrow();
    const chop = outsVersus(parseCards('As2d'), parseCards('Ah3d'), parseCards('KsQsJd9c'));
    expect(chop.chops.length).toBeGreaterThan(30);
  });
});

describe('ev', () => {
  it('pot odds', () => {
    expect(potOdds(150, 50)).toBeCloseTo(0.25);
    expect(potOddsRatio(150, 50)).toBe(3);
    expect(evCall(150, 50, 0.25)).toBeCloseTo(0);
    expect(evCall(150, 50, 0.35)).toBeCloseTo(20);
  });
  it('implied odds', () => {
    // Pot 175 (100 plus a 75 bet), 75 to call, 18% equity.
    const need = impliedOddsNeeded(175, 75, 0.18);
    expect(evCallImplied(175, 75, 0.18, need)).toBeCloseTo(0, 9);
    expect(impliedOddsNeeded(150, 50, 0.5)).toBeLessThan(0);
    expect(evCallImplied(175, 75, 0.18, need, 50)).toBeLessThan(0);
  });
  it('shove EV', () => {
    const s = evShove(0.5, 30, 0.35, 230, 100);
    expect(s.whenCalled).toBeCloseTo(-19.5);
    expect(s.ev).toBeCloseTo(0.5 * 30 + 0.5 * -19.5);
    expect(evShove(s.breakEvenFoldEquity, 30, 0.35, 230, 100).ev).toBeCloseTo(0, 9);
    expect(evShove(0, 30, 0.6, 230, 100).breakEvenFoldEquity).toBe(0);
    expect(evBluff(100, 50, 1 / 3)).toBeCloseTo(0);
  });
});

describe('theory', () => {
  it('MDF, alpha and bluff ratios', () => {
    expect(mdf(100, 100)).toBeCloseTo(0.5);
    expect(mdf(100, 50)).toBeCloseTo(2 / 3);
    expect(alpha(100, 50)).toBeCloseTo(1 / 3);
    expect(mdf(100, 75) + alpha(100, 75)).toBeCloseTo(1);
    expect(bluffFraction(100, 100)).toBeCloseTo(1 / 3);
    expect(bluffFraction(100, 50)).toBeCloseTo(0.25);
    expect(bluffsPerValue(100, 100)).toBeCloseTo(0.5);
    expect(spr(900, 100)).toBe(9);
  });
  it('geometric sizing gets stacks in exactly', () => {
    for (const [pot, stack, n] of [[10, 95, 3], [20, 200, 2], [6, 97, 3], [100, 100, 1]]) {
      const plan = geometricPlan(pot, stack, n);
      expect(plan[n - 1].stackAfter).toBeCloseTo(0, 9);
      expect(plan[n - 1].potAfter).toBeCloseTo(pot + 2 * stack, 9);
      const f = geometricFraction(pot, stack, n);
      for (const s of plan) expect(s.bet / s.potBefore).toBeCloseTo(f, 9);
    }
  });
  it('river toy game', () => {
    const g = solveRiverToyGame(100, 100, 0.5);
    expect(g.bluffShare).toBeCloseTo(1 / 3);
    expect(g.callFreq).toBeCloseTo(0.5);
    expect(g.bluffFreqOfAir).toBeCloseTo(0.5);
    expect(g.bettorEV).toBeCloseTo(75);
    // The caller is indifferent: EV(call) = bluffShare x (pot + bet) - (1 - bluffShare) x bet = 0.
    expect(g.bluffShare * 200 - (1 - g.bluffShare) * 100).toBeCloseTo(0);
    const heavy = solveRiverToyGame(100, 100, 0.9);
    expect(heavy.callFreq).toBe(0);
    expect(heavy.bettorEV).toBe(100);
  });
});

describe('side pots', () => {
  it('three-way all-in with different stacks', () => {
    const pots = buildPots([{ committed: 50 }, { committed: 150 }, { committed: 300 }]);
    expect(pots.map((p) => p.amount)).toEqual([150, 200, 150]);
    expect(pots.map((p) => p.eligible)).toEqual([[0, 1, 2], [1, 2], [2]]);
  });
  it('folded money stays in the pots it reached', () => {
    const pots = buildPots([{ committed: 100 }, { committed: 40, folded: true }, { committed: 100 }]);
    expect(pots.length).toBe(1);
    expect(pots[0].amount).toBe(240);
    const p2 = buildPots([{ committed: 30 }, { committed: 100, folded: true }, { committed: 60 }]);
    expect(p2.map((p) => p.amount)).toEqual([90, 100]);
    expect(p2.reduce((s, p) => s + p.amount, 0)).toBe(190);
  });
  it('awards and splits', () => {
    const r = awardPots([{ committed: 50, rank: 9 }, { committed: 150, rank: 5 }, { committed: 300, rank: 5 }]);
    expect(r.payouts).toEqual([150, 100, 250]);
    expect(r.payouts.reduce((a, b) => a + b, 0)).toBe(500);
  });
});
