/** 0.8236 -> "82.36%" */
export function pct(x: number, digits = 1): string {
  if (!Number.isFinite(x)) return 'n/a';
  return `${(x * 100).toFixed(digits)}%`;
}

export function int(x: number): string {
  return Math.round(x).toLocaleString('en-US');
}

export function num(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return 'n/a';
  return x.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Signed number, e.g. "+12.50" or "-3.00". Uses a real minus sign. */
export function signed(x: number, digits = 2): string {
  const s = num(Math.abs(x), digits);
  return x < 0 ? `−${s}` : `+${s}`;
}

/** Odds against as "3.2 to 1". */
export function oddsText(p: number): string {
  if (p <= 0) return 'never';
  if (p >= 1) return 'always';
  const o = (1 - p) / p;
  return o >= 1 ? `${num(o, o >= 10 ? 0 : 1)} to 1` : `1 to ${num(1 / o, 1)}`;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
