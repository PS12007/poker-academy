import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { parseCards } from '../../src/engine/cards';
import {
  computeEquity, equityByNextCard, exactWork, handSpec, handVsHand, monteCarloEquity, rangeSpec, rangeVsRangeBoard,
  classEquities, validateRequest,
} from '../../src/engine/equity';
import {
  classByName, classCombosRemaining, classOfCards, countCombos, expandRange, fullRange, HAND_CLASSES, parseRange,
  rangeFraction, rangeFromNames, rangeToString, topFraction, tryParseRange,
} from '../../src/engine/ranges';

const eq = (a: string, b: string, board = '') => handVsHand([a, b], board).players[0].equity;

describe('ranges', () => {
  it('has 169 classes and 1,326 combos', () => {
    expect(HAND_CLASSES.length).toBe(169);
    expect(HAND_CLASSES.reduce((n, h) => n + h.combos.length, 0)).toBe(1326);
    expect(HAND_CLASSES.filter((h) => h.kind === 'pair').every((h) => h.combos.length === 6)).toBe(true);
    expect(HAND_CLASSES.filter((h) => h.kind === 'suited').every((h) => h.combos.length === 4)).toBe(true);
    expect(HAND_CLASSES.filter((h) => h.kind === 'offsuit').every((h) => h.combos.length === 12)).toBe(true);
    for (const h of HAND_CLASSES) for (const [a, b] of h.combos) expect(classOfCards(a, b)).toBe(h.index);
  });
  it('parses the documented syntax', () => {
    expect(countCombos(parseRange('QQ+'))).toBe(18);
    expect(countCombos(parseRange('22-55'))).toBe(24);
    expect(countCombos(parseRange('AKs'))).toBe(4);
    expect(countCombos(parseRange('AKo'))).toBe(12);
    expect(countCombos(parseRange('AK'))).toBe(16);
    expect(countCombos(parseRange('A5s-A2s'))).toBe(16);
    expect(countCombos(parseRange('ATs+'))).toBe(16);
    expect(countCombos(parseRange('KTo+'))).toBe(36);
    expect(countCombos(parseRange('T9s-65s'))).toBe(20);
    expect(countCombos(parseRange('QQ+, AKs, A5s-A2s, KQo'))).toBe(18 + 4 + 16 + 12);
    expect(countCombos(parseRange('76s:0.5'))).toBe(2);
    expect(countCombos(parseRange('76s@25'))).toBe(1);
    expect(countCombos(parseRange('random'))).toBe(1326);
    expect(rangeFraction(fullRange())).toBe(1);
  });
  it('rejects nonsense', () => {
    expect(tryParseRange('AAs')).toBeNull();
    expect(tryParseRange('XY')).toBeNull();
    expect(tryParseRange('AKs-QQ')).toBeNull();
    expect(tryParseRange('AKs-T2s')).toBeNull();
    expect(tryParseRange('AKs:7')).toBeNull();
    expect(() => rangeFromNames(['ZZ'])).toThrow();
  });
  it('round-trips through text', () => {
    for (const t of ['QQ+, AKs, A5s-A2s, KQo', '22+, A2s+, K9s+, ATo+, KJo+', '77-99, T9s, 98s:0.5, AQo:0.25', 'JJ, 55-33, K5s-K3s']) {
      const r = parseRange(t);
      expect(Array.from(parseRange(rangeToString(r)))).toEqual(Array.from(r));
    }
    fc.assert(
      fc.property(fc.array(fc.constantFrom(0, 0, 0.5, 1), { minLength: 169, maxLength: 169 }), (ws) => {
        const r = Float32Array.from(ws);
        expect(Array.from(parseRange(rangeToString(r)))).toEqual(Array.from(r));
      }),
      { numRuns: 200 },
    );
  });
  it('removes blocked combos', () => {
    const dead = parseCards('AsKd');
    expect(classCombosRemaining(classByName('AA')!.index, dead)).toBe(3);
    expect(classCombosRemaining(classByName('KK')!.index, dead)).toBe(3);
    expect(classCombosRemaining(classByName('AKs')!.index, dead)).toBe(2);
    expect(classCombosRemaining(classByName('AKo')!.index, dead)).toBe(7);
    expect(countCombos(parseRange('AA'), parseCards('As'))).toBe(3);
    expect(expandRange(parseRange('AA'), parseCards('AsAh')).length).toBe(1);
  });
  it('topFraction fills to the requested combo count', () => {
    const order = HAND_CLASSES.map((h) => h.index);
    expect(countCombos(topFraction(order, 0.1))).toBeCloseTo(132.6, 3);
    expect(countCombos(topFraction(order, 1))).toBe(1326);
  });
});

describe('exact equity: known matchups', () => {
  it('enumerates all 1,712,304 boards heads-up preflop', () => {
    const r = handVsHand(['AsAh', 'KsKh']);
    expect(r.method).toBe('exact');
    expect(r.boards).toBe(1_712_304);
    expect(r.players[0].equity + r.players[1].equity).toBeCloseTo(1, 12);
  });
  it('AA vs KK is about 82/18', () => {
    const e = eq('AsAh', 'KsKh');
    expect(e).toBeGreaterThan(0.81);
    expect(e).toBeLessThan(0.83);
  });
  it('AKo vs 22 is close to a flip with 22 slightly ahead', () => {
    const e = eq('AsKd', '2h2c');
    expect(e).toBeGreaterThan(0.46);
    expect(e).toBeLessThan(0.5);
  });
  it('AKs vs QQ is about 46/54', () => {
    const e = eq('AsKs', 'QhQd');
    expect(e).toBeGreaterThan(0.45);
    expect(e).toBeLessThan(0.47);
  });
  it('AA vs 72o is about 87/13', () => {
    const e = eq('AsAh', '7d2c');
    expect(e).toBeGreaterThan(0.86);
    expect(e).toBeLessThan(0.89);
  });
  it('a 9-out flush draw on the flop has about 35% against a made hand', () => {
    // Hearts draw with no pair outs or straight outs vs top pair holding no heart redraws.
    const e = eq('7h2h', 'AsKd', 'Ah9h4c');
    expect(e).toBeGreaterThan(0.33);
    expect(e).toBeLessThan(0.39);
  });
  it('a river with a made board has no randomness', () => {
    const r = handVsHand(['AsAh', 'KsKh'], '2c3d4h8s9s');
    expect(r.boards).toBe(1);
    expect(r.players[0].win).toBe(1);
  });
  it('splits when the board plays', () => {
    const r = handVsHand(['2c2d', '3c3d'], 'AsKsQsJsTs');
    expect(r.players[0].tie).toBe(1);
    expect(r.players[0].equity).toBe(0.5);
  });
  it('three players sum to 1', () => {
    const r = handVsHand(['AsAh', 'KsKh', '7d6d']);
    expect(r.players.reduce((s, p) => s + p.equity, 0)).toBeCloseTo(1, 12);
    expect(r.boards).toBe(1_370_754);
  });
  it('dead cards change the answer', () => {
    const a = handVsHand(['AsAh', 'KsKh']).players[1].equity;
    const b = handVsHand(['AsAh', 'KsKh'], '', 'KdKc').players[1].equity;
    expect(b).toBeLessThan(a);
  });
});

describe('range equity and card removal', () => {
  it('AK vs a range holding AA sees 3 combos of aces, not 6', () => {
    const hero = parseCards('AsKd');
    const spec = rangeSpec('AA', hero);
    expect(spec.hands.length).toBe(3);
    // Exact equity vs {AA} must equal the average of the three live AA combos, each weighted equally.
    const exact = computeEquity({ game: 'holdem', players: [{ hands: [hero] }, rangeSpec('AA')], board: [], mode: 'exact' });
    const manual = computeEquity({ game: 'holdem', players: [{ hands: [hero] }, spec], board: [], mode: 'exact' });
    expect(exact.players[0].equity).toBeCloseTo(manual.players[0].equity, 12);
    expect(exact.boards).toBe(3 * 1_712_304);
  });
  it('blockers shift a range: AK faces relatively fewer AA/KK/AK than QQ does', () => {
    const range = parseRange('QQ+, AK');
    expect(countCombos(range)).toBe(34);
    expect(countCombos(range, parseCards('AsKd'))).toBe(6 + 3 + 3 + 9);
  });
  it('Monte Carlo agrees with exact within its confidence interval', () => {
    const req = {
      game: 'holdem' as const,
      players: [handSpec('AsKd'), rangeSpec('QQ+, AKs, AKo')],
      board: [],
    };
    const exact = computeEquity({ ...req, mode: 'exact' });
    const mc = monteCarloEquity({ ...req, iterations: 200_000, seed: 12345 });
    const p = mc.players[0];
    expect(Math.abs(p.equity - exact.players[0].equity)).toBeLessThan(4 * p.se!);
    expect(p.ci![0]).toBeLessThan(p.equity);
    expect(mc.seed).toBe(12345);
  });
  it('Monte Carlo is reproducible from its seed', () => {
    const req = { game: 'holdem' as const, players: [rangeSpec('TT+, AQs+'), rangeSpec('22+, A2s+, KTs+')], board: [], iterations: 20_000 };
    const a = monteCarloEquity({ ...req, seed: 9 }), b = monteCarloEquity({ ...req, seed: 9 }), c = monteCarloEquity({ ...req, seed: 10 });
    expect(a.players[0].equity).toBe(b.players[0].equity);
    expect(a.players[0].equity).not.toBe(c.players[0].equity);
  });
  it('auto mode picks exact for small jobs and Monte Carlo for big ones', () => {
    const small = computeEquity({ game: 'holdem', players: [handSpec('AsKd'), handSpec('QhQd')], board: [] });
    expect(small.method).toBe('exact');
    const bigReq = { game: 'holdem' as const, players: [rangeSpec('random'), rangeSpec('random')], board: [], iterations: 20_000, seed: 3 };
    expect(exactWork(bigReq)).toBeGreaterThan(1e9);
    const big = computeEquity(bigReq);
    expect(big.method).toBe('mc');
    expect(Math.abs(big.players[0].equity - 0.5)).toBeLessThan(0.02);
  });
  it('validates input', () => {
    expect(() => validateRequest({ game: 'holdem', players: [handSpec('AsKd')], board: [] })).toThrow();
    expect(() => validateRequest({ game: 'holdem', players: [handSpec('AsKd'), handSpec('QhQd')], board: [1, 2] })).toThrow();
    expect(() => validateRequest({ game: 'holdem', players: [handSpec('AsKd'), { hands: [] }], board: [] })).toThrow();
    expect(() => validateRequest({ game: 'holdem', players: [handSpec('AsKd'), { hands: [[1, 1]] }], board: [] })).toThrow();
    expect(() => validateRequest({ game: 'holdem', players: [handSpec('AsKd'), handSpec('QhQd')], board: [1, 2, 3], dead: [3] })).toThrow();
    expect(() => monteCarloEquity({ game: 'holdem', players: [handSpec('AsKd'), handSpec('AsQd')], board: [], iterations: 10 })).toThrow();
    expect(() => monteCarloEquity({ game: 'holdem', players: [handSpec('AsKd'), handSpec('QhQd')], board: parseCards('AsTd2c'), iterations: 10 })).toThrow();
  });
});

describe('exact range vs range on a board', () => {
  const board = parseCards('Ts7s2d');
  const hero = expandRange(parseRange('JJ+, AKs, T9s, 87s, 55'));
  const villain = expandRange(parseRange('TT, 77, 22, ATs, KTs, 98s, A5s, QQ, AsKs'.replace(', AsKs', '')));

  it('matches brute-force enumeration over every combo pair', () => {
    const fast = rangeVsRangeBoard(hero, villain, board);
    const brute = computeEquity({
      game: 'holdem',
      players: [
        { hands: hero.map((c) => [c.c1, c.c2]), weights: hero.map((c) => c.w) },
        { hands: villain.map((c) => [c.c1, c.c2]), weights: villain.map((c) => c.w) },
      ],
      board,
      mode: 'exact',
    });
    expect(fast.equity[0]).toBeCloseTo(brute.players[0].equity, 10);
    expect(fast.win[0]).toBeCloseTo(brute.players[0].win, 10);
    expect(fast.tie).toBeCloseTo(brute.players[0].tie, 10);
    expect(fast.boards).toBe(1176);
    expect(fast.equity[0] + fast.equity[1]).toBeCloseTo(1, 12);
  });

  it('per-combo equities match hand vs range', () => {
    const fast = rangeVsRangeBoard(hero, villain, board);
    for (const h of [fast.hero[0], fast.hero[7], fast.hero[fast.hero.length - 1]]) {
      const single = computeEquity({
        game: 'holdem',
        players: [{ hands: [[h.c1, h.c2]] }, { hands: villain.map((c) => [c.c1, c.c2]), weights: villain.map((c) => c.w) }],
        board,
        mode: 'exact',
      });
      expect(h.equity).toBeCloseTo(single.players[0].equity, 10);
    }
  });

  it('handles weights, overlapping ranges, turn and river boards', () => {
    const a = expandRange(parseRange('AA, KK:0.5, AKs, QJs:0.25'));
    const b = expandRange(parseRange('AA:0.5, KK, AKs, T9s'));
    for (const bd of ['Ts7s2dKh', 'Ts7s2dKhAc']) {
      const cards = parseCards(bd);
      const fast = rangeVsRangeBoard(a, b, cards);
      const brute = computeEquity({
        game: 'holdem',
        players: [
          { hands: a.map((c) => [c.c1, c.c2]), weights: a.map((c) => c.w) },
          { hands: b.map((c) => [c.c1, c.c2]), weights: b.map((c) => c.w) },
        ],
        board: cards,
        mode: 'exact',
      });
      expect(fast.equity[0]).toBeCloseTo(brute.players[0].equity, 10);
    }
    expect(() => rangeVsRangeBoard(a, b, [])).toThrow();
  });

  it('aggregates to hand classes', () => {
    const fast = rangeVsRangeBoard(hero, villain, board);
    const cls = classEquities(fast.hero);
    expect(cls[classByName('JJ')!.index]).toBeGreaterThan(0);
    expect(Number.isNaN(cls[classByName('32o')!.index])).toBe(true);
  });
});

describe('equity by next card', () => {
  it('averages back to the flop equity', () => {
    const req = { game: 'holdem' as const, players: [handSpec('7h2h'), handSpec('AsKd')], board: parseCards('Ah9h4c') };
    const flop = computeEquity(req).players[0].equity;
    const turns = equityByNextCard(req);
    expect(turns.length).toBe(45);
    expect(turns.reduce((s, t) => s + t.equity[0], 0) / 45).toBeCloseTo(flop, 10);
    expect(() => equityByNextCard({ ...req, board: [] })).toThrow();
  });
});

describe('omaha equity', () => {
  it('exact on a flop sums to 1 and respects the two-card rule', () => {
    const r = handVsHand(['AsKsQdJd', '7h7c2c3d'], 'Ts9s7d');
    expect(r.method).toBe('exact');
    expect(r.players[0].equity + r.players[1].equity).toBeCloseTo(1, 12);
    expect(r.players[0].equity).toBeGreaterThan(0.4);
  });
  it('preflop equities run close: AAKK double suited vs a double-suited rundown', () => {
    const r = computeEquity({
      game: 'omaha',
      players: [handSpec('AsKsAhKh'), handSpec('9d8d7c6c')],
      board: [],
      mode: 'mc',
      iterations: 60_000,
      seed: 5,
    });
    expect(r.players[0].equity).toBeGreaterThan(0.55);
    expect(r.players[0].equity).toBeLessThan(0.68);
    expect(() => validateRequest({ game: 'omaha', players: [handSpec('AsKs'), handSpec('9d8d')], board: [] })).toThrow();
  });
});
