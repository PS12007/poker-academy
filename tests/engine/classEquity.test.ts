import { describe, expect, it } from 'vitest';
import { equityVsTop } from '../../src/lib/classEquity';
import { classByName } from '../../src/engine/ranges';
import { EQUITY_VS_RANDOM } from '../../src/generated/handOrder';
import { PUSH_FOLD_CHARTS } from '../../src/generated/pushFoldCharts';

const idx = (n: string) => classByName(n)!.index;

describe('equity against the top of the range', () => {
  it('against every hand it matches equity against a random hand', () => {
    for (const h of ['AA', '72o', 'KQs', 'T9s', '22']) {
      expect(Math.abs(equityVsTop(idx(h), 1) - EQUITY_VS_RANDOM[idx(h)])).toBeLessThan(0.01);
    }
  });
  it('gets worse as the opposing range tightens, except for aces', () => {
    expect(equityVsTop(idx('KQo'), 0.05)).toBeLessThan(equityVsTop(idx('KQo'), 0.4));
    expect(equityVsTop(idx('AA'), 0.05)).toBeGreaterThan(0.8);
    expect(equityVsTop(idx('72o'), 0.05)).toBeLessThan(0.25);
  });
});

describe('precomputed push/fold charts', () => {
  it('are monotone in stack depth for the jam range size', () => {
    const size = (s: number) => PUSH_FOLD_CHARTS[s].jam.reduce((a, b) => a + b, 0);
    expect(size(5)).toBeGreaterThan(size(10));
    expect(size(10)).toBeGreaterThan(size(20));
  });
  it('always jam and call aces, never call with seven-deuce at 10bb', () => {
    expect(PUSH_FOLD_CHARTS[10].jam[idx('AA')]).toBe(1);
    expect(PUSH_FOLD_CHARTS[10].call[idx('AA')]).toBe(1);
    expect(PUSH_FOLD_CHARTS[10].call[idx('72o')]).toBe(0);
    for (const s of Object.values(PUSH_FOLD_CHARTS)) expect(s.exploitability).toBeLessThan(0.001);
  });
});
