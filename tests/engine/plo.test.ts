import { describe, expect, it } from 'vitest';
import { parseCards } from '../../src/engine/cards';
import { omahaOuts } from '../../src/engine/omaha';

const outs = (h: string, b: string) => omahaOuts(parseCards(h), parseCards(b)).length;

describe('Omaha wraps', () => {
  it('counts the standard wraps on a rainbow 9-8-2 flop', () => {
    expect(outs('JsTd4c3h', '9h8d2s')).toBe(8); // open-ended: Q or 7
    expect(outs('QsJdTc6h', '9h8d2s')).toBe(13);
    expect(outs('JsTd7c3h', '9h8d2s')).toBe(17);
    expect(outs('JsTd7c6h', '9h8d2s')).toBe(20);
  });
  it('one hole card cannot make a straight', () => {
    // Board 9-8-7 with a single ten in hand: no straight draw using exactly two hole cards plus three board cards needs two cards.
    expect(outs('TsAd4c3h', '9h8d7s')).toBe(0);
  });
  it('rejects a bare preflop board', () => {
    expect(() => omahaOuts(parseCards('AsKsQdJd'), [])).toThrow();
  });
});

import { shortDeckCounts } from '../../src/engine/shortDeck';
import { Category } from '../../src/engine/evalCore';

describe('short deck', () => {
  it('counts all C(36,5) hands, and flushes are rarer than full houses', () => {
    const c = shortDeckCounts();
    expect(c.reduce((a, b) => a + b, 0)).toBe(376_992);
    expect(c[Category.StraightFlush]).toBe(24); // six straights (A-6-7-8-9 up to T-J-Q-K-A) in each of four suits
    expect(c[Category.Quads]).toBe(9 * 32);
    expect(c[Category.FullHouse]).toBe(9 * 4 * 8 * 6);
    expect(c[Category.Flush]).toBe(4 * (126 - 6));
    expect(c[Category.Flush]).toBeLessThan(c[Category.FullHouse]);
  });
});
