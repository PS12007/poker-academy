import { RANK_CHARS, makeCard } from './cards';

/**
 * Hold'em ranges.
 *
 * A range is 169 weights (0..1), one per strategically distinct starting hand,
 * laid out on the usual 13x13 grid: index = row * 13 + col, with row and col
 * running A, K, Q ... 2. Above the diagonal is suited, below is offsuit, the
 * diagonal is pocket pairs.
 */
export type Range = Float32Array;

export const NUM_CLASSES = 169;

export interface HandClass {
  index: number;
  row: number;
  col: number;
  /** Higher rank 0..12 (2..A). */
  hi: number;
  lo: number;
  kind: 'pair' | 'suited' | 'offsuit';
  name: string;
  /** All concrete two-card combos of this class: 6, 4 or 12 of them. */
  combos: readonly (readonly [number, number])[];
}

export const HAND_CLASSES: readonly HandClass[] = (() => {
  const out: HandClass[] = [];
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const a = 12 - row, b = 12 - col;
      const hi = Math.max(a, b), lo = Math.min(a, b);
      const kind = row === col ? 'pair' : row < col ? 'suited' : 'offsuit';
      const combos: [number, number][] = [];
      for (let s1 = 0; s1 < 4; s1++) {
        for (let s2 = 0; s2 < 4; s2++) {
          if (kind === 'pair' && s1 >= s2) continue;
          if (kind === 'suited' && s1 !== s2) continue;
          if (kind === 'offsuit' && s1 === s2) continue;
          combos.push([makeCard(hi, s1), makeCard(lo, s2)]);
        }
      }
      const name = RANK_CHARS[hi] + RANK_CHARS[lo] + (kind === 'pair' ? '' : kind === 'suited' ? 's' : 'o');
      out.push({ index: row * 13 + col, row, col, hi, lo, kind, name, combos });
    }
  }
  return out;
})();

const NAME_TO_INDEX = new Map(HAND_CLASSES.map((h) => [h.name, h.index]));

export function classIndex(hi: number, lo: number, suited: boolean): number {
  if (hi < lo) [hi, lo] = [lo, hi];
  if (hi === lo) return (12 - hi) * 14;
  return suited ? (12 - hi) * 13 + (12 - lo) : (12 - lo) * 13 + (12 - hi);
}

/** The class index of two concrete cards. */
export function classOfCards(c1: number, c2: number): number {
  return classIndex(c1 >> 2, c2 >> 2, (c1 & 3) === (c2 & 3));
}

export function classByName(name: string): HandClass | undefined {
  const i = NAME_TO_INDEX.get(name);
  return i === undefined ? undefined : HAND_CLASSES[i];
}

export function emptyRange(): Range {
  return new Float32Array(NUM_CLASSES);
}

export function fullRange(): Range {
  return new Float32Array(NUM_CLASSES).fill(1);
}

export class RangeParseError extends Error {}

function rankIdx(ch: string): number {
  const i = RANK_CHARS.indexOf(ch.toUpperCase());
  if (i < 0) throw new RangeParseError(`Unknown rank "${ch}"`);
  return i;
}

/**
 * Parses range text such as "QQ+, AKs, A5s-A2s, KTo+, 22-55, AK, 76s:0.5".
 *
 *   QQ        one pair class          QQ+      QQ and every better pair
 *   22-55     pair interval           AKs/AKo  suited / offsuit only
 *   AK        both suited and offsuit ATs+     ATs, AJs, AQs, AKs (kicker goes up)
 *   A5s-A2s   kicker interval         T9s-65s  connector ladder (same gap)
 *   :0.5      weight suffix on any token (also @50 for percent)
 *   random    every hand
 */
export function parseRange(text: string): Range {
  const r = emptyRange();
  const tokens = text.split(/[,;\s]+/).filter(Boolean);
  for (const raw of tokens) {
    let tok = raw;
    let weight = 1;
    const wm = tok.match(/^(.*?)(?::([\d.]+)|@([\d.]+)%?)$/);
    if (wm) {
      tok = wm[1];
      weight = wm[2] !== undefined ? parseFloat(wm[2]) : parseFloat(wm[3]) / 100;
      if (!(weight >= 0 && weight <= 1)) throw new RangeParseError(`Bad weight in "${raw}"`);
    }
    if (/^(random|any|all|100%)$/i.test(tok)) {
      r.fill(weight);
      continue;
    }
    for (const idx of expandToken(tok)) r[idx] = weight;
  }
  return r;
}

export function tryParseRange(text: string): Range | null {
  try {
    return parseRange(text);
  } catch {
    return null;
  }
}

interface Shape {
  hi: number;
  lo: number;
  /** 's', 'o' or '' for both (or pair). */
  suit: string;
}

function parseShape(s: string): Shape {
  const m = s.match(/^([2-9TJQKA])([2-9TJQKA])([so]?)$/i);
  if (!m) throw new RangeParseError(`Cannot read "${s}"`);
  const a = rankIdx(m[1]), b = rankIdx(m[2]);
  const suit = m[3].toLowerCase();
  if (a === b && suit) throw new RangeParseError(`A pair cannot be suited or offsuit: "${s}"`);
  return { hi: Math.max(a, b), lo: Math.min(a, b), suit };
}

function shapeIndices(hi: number, lo: number, suit: string): number[] {
  if (hi === lo) return [classIndex(hi, lo, false)];
  if (suit === 's') return [classIndex(hi, lo, true)];
  if (suit === 'o') return [classIndex(hi, lo, false)];
  return [classIndex(hi, lo, true), classIndex(hi, lo, false)];
}

function expandToken(tok: string): number[] {
  const out: number[] = [];
  if (tok.includes('-')) {
    const [l, rgt] = tok.split('-');
    const a = parseShape(l), b = parseShape(rgt);
    const suit = a.suit || b.suit;
    if ((a.suit && b.suit && a.suit !== b.suit) || (a.hi === a.lo) !== (b.hi === b.lo))
      throw new RangeParseError(`Mismatched interval "${tok}"`);
    if (a.hi === a.lo) {
      for (let p = Math.min(a.hi, b.hi); p <= Math.max(a.hi, b.hi); p++) out.push(...shapeIndices(p, p, ''));
    } else if (a.hi === b.hi) {
      for (let k = Math.min(a.lo, b.lo); k <= Math.max(a.lo, b.lo); k++) out.push(...shapeIndices(a.hi, k, suit));
    } else if (a.hi - a.lo === b.hi - b.lo) {
      const gap = a.hi - a.lo;
      for (let h = Math.min(a.hi, b.hi); h <= Math.max(a.hi, b.hi); h++) out.push(...shapeIndices(h, h - gap, suit));
    } else throw new RangeParseError(`Cannot interpret interval "${tok}"`);
    return out;
  }
  if (tok.endsWith('+')) {
    const a = parseShape(tok.slice(0, -1));
    if (a.hi === a.lo) for (let p = a.hi; p <= 12; p++) out.push(...shapeIndices(p, p, ''));
    else for (let k = a.lo; k < a.hi; k++) out.push(...shapeIndices(a.hi, k, a.suit));
    return out;
  }
  const a = parseShape(tok);
  return shapeIndices(a.hi, a.lo, a.suit);
}

/** Compact text for a range. Hands with partial weight are listed with a :weight suffix. */
export function rangeToString(range: Range): string {
  const parts: string[] = [];
  const weights = [...new Set(Array.from(range).filter((w) => w > 0).map((w) => Math.round(w * 100) / 100))].sort(
    (x, y) => y - x,
  );
  for (const w of weights) {
    const has = (hi: number, lo: number, suited: boolean) =>
      Math.round(range[classIndex(hi, lo, suited)] * 100) / 100 === w;
    const sfx = w === 1 ? '' : `:${w}`;
    // Pairs, as runs from the top.
    let p = 12;
    while (p >= 0) {
      if (!has(p, p, false)) { p--; continue; }
      let q = p;
      while (q - 1 >= 0 && has(q - 1, q - 1, false)) q--;
      const name = (x: number) => RANK_CHARS[x] + RANK_CHARS[x];
      parts.push((p === q ? name(p) : p === 12 ? `${name(q)}+` : `${name(q)}-${name(p)}`) + sfx);
      p = q - 1;
    }
    for (const suited of [true, false]) {
      const s = suited ? 's' : 'o';
      for (let hi = 12; hi >= 1; hi--) {
        let k = hi - 1;
        while (k >= 0) {
          if (!has(hi, k, suited)) { k--; continue; }
          let j = k;
          while (j - 1 >= 0 && has(hi, j - 1, suited)) j--;
          const name = (x: number) => RANK_CHARS[hi] + RANK_CHARS[x] + s;
          parts.push((k === j ? name(k) : k === hi - 1 ? `${name(j)}+` : `${name(k)}-${name(j)}`) + sfx);
          k = j - 1;
        }
      }
    }
  }
  return parts.join(', ');
}

export interface WeightedCombo {
  c1: number;
  c2: number;
  w: number;
}

/** Expands a range into concrete combos, dropping any that use a dead card. */
export function expandRange(range: Range, dead: readonly number[] = []): WeightedCombo[] {
  const used = new Uint8Array(52);
  for (const c of dead) used[c] = 1;
  const out: WeightedCombo[] = [];
  for (let i = 0; i < NUM_CLASSES; i++) {
    const w = range[i];
    if (w <= 0) continue;
    for (const [c1, c2] of HAND_CLASSES[i].combos) {
      if (!used[c1] && !used[c2]) out.push({ c1, c2, w });
    }
  }
  return out;
}

/** Weighted number of combos in a range after removing combos blocked by dead cards. */
export function countCombos(range: Range, dead: readonly number[] = []): number {
  let n = 0;
  for (const c of expandRange(range, dead)) n += c.w;
  return n;
}

/** Combos of one class that remain given dead cards. */
export function classCombosRemaining(index: number, dead: readonly number[]): number {
  const used = new Uint8Array(52);
  for (const c of dead) used[c] = 1;
  let n = 0;
  for (const [c1, c2] of HAND_CLASSES[index].combos) if (!used[c1] && !used[c2]) n++;
  return n;
}

/** Fraction of all 1,326 starting combos that the range holds (no dead cards). */
export function rangeFraction(range: Range): number {
  let n = 0;
  for (let i = 0; i < NUM_CLASSES; i++) n += range[i] * HAND_CLASSES[i].combos.length;
  return n / 1326;
}

export function rangeFromNames(names: readonly string[], weight = 1): Range {
  const r = emptyRange();
  for (const n of names) {
    const c = classByName(n);
    if (!c) throw new RangeParseError(`Unknown hand "${n}"`);
    r[c.index] = weight;
  }
  return r;
}

/**
 * Builds a range holding the best `fraction` of hands according to `order`
 * (class indices, strongest first). The last class is added with partial weight
 * so the combo count matches the requested fraction exactly.
 */
export function topFraction(order: readonly number[], fraction: number): Range {
  const r = emptyRange();
  let need = Math.max(0, Math.min(1, fraction)) * 1326;
  for (const idx of order) {
    if (need <= 0) break;
    const n = HAND_CLASSES[idx].combos.length;
    r[idx] = Math.min(1, need / n);
    need -= n;
  }
  return r;
}
