import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { evaluate, categoryOf, Category, CATEGORY_BASE } from '../../src/engine/evalCore';
import { evaluate5 } from '../../src/engine/evaluator5';
import { evaluate6, evaluate7 } from '../../src/engine/evaluator7';
import { parseCards, permuteSuits, SUIT_PERMUTATIONS } from '../../src/engine/cards';
import { Rng } from '../../src/engine/rng';
import { referenceBest, referenceCategory, referenceScore5 } from './reference';

const ev = (s: string) => evaluate(parseCards(s));

describe('5-card evaluator: full enumeration of C(52,5)', () => {
  const counts = new Array<number>(9).fill(0);
  const refToRank = new Map<number, number>();
  let total = 0;
  let consistent = true;
  for (let a = 0; a < 48; a++)
    for (let b = a + 1; b < 49; b++)
      for (let c = b + 1; c < 50; c++)
        for (let d = c + 1; d < 51; d++)
          for (let e = d + 1; e < 52; e++) {
            const r = evaluate5(a, b, c, d, e);
            const ref = referenceScore5([a, b, c, d, e]);
            counts[categoryOf(r)]++;
            total++;
            const prev = refToRank.get(ref);
            if (prev === undefined) refToRank.set(ref, r);
            else if (prev !== r) consistent = false;
          }

  it('visits 2,598,960 hands', () => expect(total).toBe(2_598_960));

  it('matches the known category counts', () => {
    expect(counts[Category.StraightFlush]).toBe(40);
    expect(counts[Category.Quads]).toBe(624);
    expect(counts[Category.FullHouse]).toBe(3744);
    expect(counts[Category.Flush]).toBe(5108);
    expect(counts[Category.Straight]).toBe(10200);
    expect(counts[Category.Trips]).toBe(54912);
    expect(counts[Category.TwoPair]).toBe(123552);
    expect(counts[Category.Pair]).toBe(1098240);
    expect(counts[Category.HighCard]).toBe(1302540);
  });

  it('has exactly 7,462 distinct ranks, dense in 1..7462', () => {
    const ranks = new Set(refToRank.values());
    expect(ranks.size).toBe(7462);
    expect(Math.min(...ranks)).toBe(1);
    expect(Math.max(...ranks)).toBe(7462);
  });

  it('agrees with the reference evaluator on every hand, in value order', () => {
    expect(consistent).toBe(true);
    expect(refToRank.size).toBe(7462);
    const sorted = [...refToRank.entries()].sort((x, y) => x[0] - y[0]);
    let ok = true;
    sorted.forEach(([ref, rank], i) => {
      if (rank !== i + 1 || categoryOf(rank) !== referenceCategory(ref)) ok = false;
    });
    expect(ok).toBe(true);
  });

  it('counts exactly 4 royal flushes', () => {
    let royals = 0;
    for (let s = 0; s < 4; s++) if (evaluate5(32 + s, 36 + s, 40 + s, 44 + s, 48 + s) === 7462) royals++;
    expect(royals).toBe(4);
  });
});

describe('edge cases', () => {
  it('wheel is the lowest straight', () => {
    expect(ev('As2d3h4c5s')).toBe(CATEGORY_BASE[Category.Straight]);
    expect(ev('2d3h4c5s6s')).toBe(CATEGORY_BASE[Category.Straight] + 1);
  });
  it('steel wheel is the lowest straight flush', () => {
    expect(ev('As2s3s4s5s')).toBe(CATEGORY_BASE[Category.StraightFlush]);
    expect(ev('As2s3s4s5s')).toBeLessThan(ev('2s3s4s5s6s'));
  });
  it('ace plays high in broadway', () => {
    expect(ev('AsKdQhJcTs')).toBe(CATEGORY_BASE[Category.Straight] + 9);
    expect(ev('AsKsQsJsTs')).toBe(7462);
  });
  it('no wrap-around straights', () => {
    expect(categoryOf(ev('QsKdAh2c3s'))).toBe(Category.HighCard);
  });
  it('kickers decide ties', () => {
    expect(ev('AsAdKh7c2s')).toBeGreaterThan(ev('AhAcQh7d2d'));
    expect(ev('AsAdKh7c3s')).toBeGreaterThan(ev('AhAcKd7d2d'));
    expect(ev('AsKdQh7c3s')).toBeGreaterThan(ev('AhKcQd7d2d'));
  });
  it('suits never break ties', () => {
    expect(ev('AsKsQsJs9s')).toBe(ev('AhKhQhJh9h'));
  });
  it('board plays: both players tie when the board is the best hand', () => {
    const board = parseCards('AsKsQsJsTs');
    expect(evaluate([...parseCards('2c2d'), ...board])).toBe(evaluate([...parseCards('9h9d'), ...board]));
    const board2 = parseCards('AsAdKhKcQs');
    expect(evaluate([...parseCards('2c3d'), ...board2])).toBe(evaluate([...parseCards('4h5d'), ...board2]));
  });
  it('counterfeiting: a higher board pair kills small two pair', () => {
    const flop = parseCards('7s6d2h');
    const sevenSix = parseCards('7c6c');
    const aces = parseCards('AcAd');
    expect(evaluate([...sevenSix, ...flop])).toBeGreaterThan(evaluate([...aces, ...flop]));
    const runout = [...flop, ...parseCards('KsKd')];
    expect(evaluate([...sevenSix, ...runout])).toBeLessThan(evaluate([...aces, ...runout]));
  });
  it('7-card: picks the best category', () => {
    expect(categoryOf(ev('AsKsQdJdTd3d2d'))).toBe(Category.Flush);
    expect(categoryOf(ev('AsAdAhKsKd3s2s'))).toBe(Category.FullHouse);
    expect(ev('AsAdAhKsKdKh2s')).toBe(ev('AsAdAhKsKd'));
  });
  it('7-card: three pairs use the best two and the best kicker', () => {
    expect(ev('AsAdKsKdQsQd2h')).toBe(ev('AsAdKsKdQs'));
    expect(ev('AsAd9s9d4s4dQh')).toBe(ev('AsAd9s9dQh'));
  });
  it('7-card: straight flush hidden inside a longer flush', () => {
    expect(ev('As9s8s7s6s5sKd')).toBe(ev('9s8s7s6s5s'));
  });
  it('6-card wrapper agrees with the generic path', () => {
    const c = parseCards('AsAd9s9d4s4d');
    expect(evaluate6(c[0], c[1], c[2], c[3], c[4], c[5])).toBe(evaluate(c));
  });
});

describe('7-card evaluator vs brute force', () => {
  it('matches best-of-21 on 1,000,000 random hands', () => {
    const rng = new Rng(20240601);
    const deck = Array.from({ length: 52 }, (_, i) => i);
    let mismatches = 0;
    for (let n = 0; n < 1_000_000; n++) {
      for (let i = 0; i < 7; i++) {
        const j = i + rng.int(52 - i);
        const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      }
      const fast = evaluate7(deck[0], deck[1], deck[2], deck[3], deck[4], deck[5], deck[6]);
      let best = 0;
      for (let a = 0; a < 3; a++)
        for (let b = a + 1; b < 4; b++)
          for (let c = b + 1; c < 5; c++)
            for (let d = c + 1; d < 6; d++)
              for (let e = d + 1; e < 7; e++) {
                const r = evaluate5(deck[a], deck[b], deck[c], deck[d], deck[e]);
                if (r > best) best = r;
              }
      if (fast !== best) mismatches++;
    }
    expect(mismatches).toBe(0);
  });

  it('matches the independent reference on 20,000 random hand pairs', () => {
    const rng = new Rng(7);
    let bad = 0;
    for (let n = 0; n < 20_000; n++) {
      const deck = rng.shuffle(Array.from({ length: 52 }, (_, i) => i));
      const h1 = deck.slice(0, 7), h2 = deck.slice(7, 14);
      const f1 = evaluate(h1), f2 = evaluate(h2);
      const r1 = referenceBest(h1), r2 = referenceBest(h2);
      if (Math.sign(f1 - f2) !== Math.sign(r1 - r2) || categoryOf(f1) !== referenceCategory(r1)) bad++;
    }
    expect(bad).toBe(0);
  });
});

describe('properties', () => {
  const hand = (n: number) => fc.uniqueArray(fc.integer({ min: 0, max: 51 }), { minLength: n, maxLength: n });

  it('invariant under suit permutation', () => {
    fc.assert(
      fc.property(hand(7), fc.integer({ min: 0, max: 23 }), (cards, p) => {
        expect(evaluate(permuteSuits(cards, SUIT_PERMUTATIONS[p]))).toBe(evaluate(cards));
      }),
      { numRuns: 2000 },
    );
  });
  it('order of input cards does not matter', () => {
    fc.assert(
      fc.property(hand(7), fc.integer(), (cards, seed) => {
        const shuffled = new Rng(seed).shuffle([...cards]);
        expect(evaluate(shuffled)).toBe(evaluate(cards));
      }),
      { numRuns: 2000 },
    );
  });
  it('adding a card never makes the best hand worse', () => {
    fc.assert(
      fc.property(hand(7), (cards) => {
        expect(evaluate(cards.slice(0, 6))).toBeGreaterThanOrEqual(evaluate(cards.slice(0, 5)));
        expect(evaluate(cards)).toBeGreaterThanOrEqual(evaluate(cards.slice(0, 6)));
      }),
      { numRuns: 5000 },
    );
  });
});
