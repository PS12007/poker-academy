import { memo, useId, useMemo } from 'react';

interface Band {
  /** Mean radius, 0..1 of the half-size. */
  r: number;
  /** Wave amplitude. */
  a: number;
  /** Lobes around the circle. */
  k: number;
  /** Number of interlaced strands. */
  n: number;
  /** Second harmonic amount and frequency, for the engraved ripple. */
  b?: number;
  m?: number;
}

const PRESETS: Record<string, Band[]> = {
  rosette: [
    { r: 0.9, a: 0.07, k: 24, n: 6, b: 0.012, m: 72 },
    { r: 0.72, a: 0.1, k: 16, n: 8, b: 0.02, m: 48 },
    { r: 0.5, a: 0.11, k: 12, n: 8 },
    { r: 0.29, a: 0.09, k: 9, n: 6, b: 0.015, m: 27 },
    { r: 0.12, a: 0.05, k: 6, n: 4 },
  ],
  seal: [
    { r: 0.86, a: 0.1, k: 18, n: 6 },
    { r: 0.6, a: 0.12, k: 10, n: 6, b: 0.02, m: 30 },
    { r: 0.32, a: 0.1, k: 7, n: 4 },
  ],
  ring: [
    { r: 0.88, a: 0.085, k: 30, n: 5, b: 0.015, m: 90 },
    { r: 0.7, a: 0.06, k: 20, n: 4 },
  ],
};

function bandPaths(band: Band, size: number): string[] {
  const c = size / 2;
  const steps = Math.max(360, band.k * 40);
  const out: string[] = [];
  for (let j = 0; j < band.n; j++) {
    const phase = (j / band.n) * Math.PI * 2;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r =
        (band.r + band.a * Math.sin(band.k * t + phase) + (band.b ?? 0) * Math.sin((band.m ?? 0) * t - phase * 2)) * c;
      d += `${i ? 'L' : 'M'}${(c + r * Math.cos(t)).toFixed(1)} ${(c + r * Math.sin(t)).toFixed(1)}`;
    }
    out.push(d + 'Z');
  }
  return out;
}

interface Props {
  variant?: keyof typeof PRESETS;
  /** Rendered pixel size is controlled by className. This is the drawing resolution. */
  size?: number;
  className?: string;
  /** Slowly counter-rotate the bands. */
  spin?: boolean;
  /** One flat colour instead of the three-ink gradient. */
  mono?: boolean;
  strokeWidth?: number;
  opacity?: number;
}

/**
 * Guilloche: the interlaced line engraving used on banknotes and card backs.
 * Each band is a family of sine-modulated circles offset in phase.
 */
export const Guilloche = memo(function Guilloche({
  variant = 'rosette', size = 600, className, spin = false, mono = false, strokeWidth = 0.55, opacity = 1,
}: Props) {
  const id = useId().replace(/:/g, '');
  const bands = useMemo(() => PRESETS[variant].map((b) => bandPaths(b, size)), [variant, size]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden="true" style={{ opacity }} fill="none">
      {!mono && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgb(var(--verd))" />
            <stop offset="0.5" stopColor="rgb(var(--brass))" />
            <stop offset="1" stopColor="rgb(var(--madder))" />
          </linearGradient>
        </defs>
      )}
      {bands.map((paths, i) => (
        <g
          key={i}
          className={spin ? (i % 2 ? 'guilloche-spin-rev' : 'guilloche-spin') : undefined}
          stroke={mono ? 'currentColor' : `url(#${id})`}
          strokeWidth={strokeWidth}
        >
          {paths.map((d, j) => (
            <path key={j} d={d} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      ))}
    </svg>
  );
});
