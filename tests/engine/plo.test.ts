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
