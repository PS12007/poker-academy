import { describe, expect, it } from 'vitest';
import { maxRaiseTo, replayStreet } from '../../src/engine/potLimit';

describe('pot limit', () => {
  it('maximum bet with nothing to call is the pot', () => {
    expect(maxRaiseTo(100, 0, 0)).toBe(100);
  });
  it('facing a bet: call, then raise the new pot', () => {
    // Pot 100, opponent bets 100. Call 100 makes the pot 300, raise 300 more: total 400.
    expect(maxRaiseTo(200, 100, 0)).toBe(400);
  });
  it('preflop pot raise with blinds 1 and 2 is to 7', () => {
    // UTG: call 2 makes the pot 5, raise 5: total 7.
    expect(maxRaiseTo(3, 2, 0)).toBe(7);
    const s = replayStreet(0, [{ player: 2, kind: 'raise' }], 2, [1, 2]);
    expect(s[0].maxTo).toBe(7);
    expect(s[0].potAfter).toBe(10);
  });
  it('small blind completing and raising the pot', () => {
    // Blinds 1/2, everyone folds to the small blind: call 1 makes 4, raise 4 more: total 6.
    expect(maxRaiseTo(3, 2, 1)).toBe(6);
  });
  it('re-raises compound', () => {
    // Pot 10 on the flop. A bets 10 (pot). B raises max: call 10 -> 30, raise 30 -> to 40. A re-raises max.
    const s = replayStreet(10, [{ player: 0, kind: 'bet' }, { player: 1, kind: 'raise' }, { player: 0, kind: 'raise' }], 2);
    expect(s[0].after).toBe(10);
    expect(s[1].after).toBe(40);
    // Pot before A acts: 10 + 10 + 40 = 60. A has 10 in, needs 30 to call -> 90, raise 90 -> to 130.
    expect(s[2].maxTo).toBe(130);
    expect(s[2].working).toEqual({ potBefore: 60, call: 30, raiseBy: 90 });
  });
  it('rejects illegal sizes', () => {
    expect(() => replayStreet(10, [{ player: 0, kind: 'bet', to: 11 }], 2)).toThrow();
    expect(() => replayStreet(10, [{ player: 0, kind: 'bet', to: 1 }], 2)).toThrow();
    expect(() => replayStreet(10, [{ player: 0, kind: 'bet', to: 6 }, { player: 1, kind: 'check' }], 2)).toThrow();
    // Minimum raise is the size of the last raise.
    const s = replayStreet(10, [{ player: 0, kind: 'bet', to: 6 }, { player: 1, kind: 'raise', to: 12 }], 2);
    expect(s[1].minTo).toBe(12);
  });
});
