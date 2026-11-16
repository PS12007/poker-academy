import { describe, expect, it } from 'vitest';
import { evalMasks, categoryOf, Category } from '../../src/engine/evalCore';

/** All C(52,7) = 133,784,560 seven-card hands. Takes about five seconds. */
describe('7-card evaluator: full enumeration of C(52,7)', () => {
  it('matches the known best-hand category counts', () => {
    const counts = new Array<number>(9).fill(0);
    const m = new Int32Array(4);
    const bit = (c: number) => 1 << (c >> 2);
    let total = 0;
    for (let a = 0; a < 46; a++) {
      m[a & 3] ^= bit(a);
      for (let b = a + 1; b < 47; b++) {
        m[b & 3] ^= bit(b);
        for (let c = b + 1; c < 48; c++) {
          m[c & 3] ^= bit(c);
          for (let d = c + 1; d < 49; d++) {
            m[d & 3] ^= bit(d);
            for (let e = d + 1; e < 50; e++) {
              m[e & 3] ^= bit(e);
              for (let f = e + 1; f < 51; f++) {
                m[f & 3] ^= bit(f);
                for (let g = f + 1; g < 52; g++) {
                  m[g & 3] ^= bit(g);
                  counts[categoryOf(evalMasks(m[0], m[1], m[2], m[3]))]++;
                  total++;
                  m[g & 3] ^= bit(g);
                }
                m[f & 3] ^= bit(f);
              }
              m[e & 3] ^= bit(e);
            }
            m[d & 3] ^= bit(d);
          }
          m[c & 3] ^= bit(c);
        }
        m[b & 3] ^= bit(b);
      }
      m[a & 3] ^= bit(a);
    }
    expect(total).toBe(133_784_560);
    expect(counts[Category.StraightFlush]).toBe(41_584);
    expect(counts[Category.Quads]).toBe(224_848);
    expect(counts[Category.FullHouse]).toBe(3_473_184);
    expect(counts[Category.Flush]).toBe(4_047_644);
    expect(counts[Category.Straight]).toBe(6_180_020);
    expect(counts[Category.Trips]).toBe(6_461_620);
    expect(counts[Category.TwoPair]).toBe(31_433_400);
    expect(counts[Category.Pair]).toBe(58_627_800);
    expect(counts[Category.HighCard]).toBe(23_294_460);
  }, 1_800_000);
});
