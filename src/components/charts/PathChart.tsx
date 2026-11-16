import { int } from '../../lib/format';

interface Props {
  x: number[];
  paths: number[][];
  bands?: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] };
  /** Straight reference line from 0 to this final value (the expectation). */
  expected?: number;
  /** Horizontal line, e.g. minus the bankroll. */
  floor?: number;
  yLabel?: string;
  xLabel?: string;
  height?: number;
}

/** Fan chart: sample paths over percentile bands. Pure SVG, scales to its container. */
export function PathChart({ x, paths, bands, expected, floor, yLabel = 'bb', xLabel = 'hands', height = 300 }: Props) {
  const W = 800, H = height, L = 56, R = 12, T = 12, B = 28;
  const all = [...paths.flat(), ...(bands ? [...bands.p5, ...bands.p95] : []), 0, floor ?? 0];
  let lo = Math.min(...all), hi = Math.max(...all);
  const padY = (hi - lo) * 0.06 || 1;
  lo -= padY;
  hi += padY;
  const xMax = x[x.length - 1] || 1;
  const sx = (v: number) => L + (v / xMax) * (W - L - R);
  const sy = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const line = (ys: number[]) => ys.map((y, i) => `${i ? 'L' : 'M'}${sx(x[i]).toFixed(1)} ${sy(y).toFixed(1)}`).join('');
  const area = (top: number[], bot: number[]) =>
    `${line(top)}${bot.map((_, i) => `L${sx(x[bot.length - 1 - i]).toFixed(1)} ${sy(bot[bot.length - 1 - i]).toFixed(1)}`).join('')}Z`;

  const span = hi - lo;
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000].find((s) => span / s <= 6) ?? 100000;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Simulated ${yLabel} over ${int(xMax)} ${xLabel}`}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke="rgb(var(--bone))" strokeOpacity={v === 0 ? 0.45 : 0.1} strokeWidth="1" />
          <text x={L - 8} y={sy(v) + 3.5} textAnchor="end" fontSize="10" fill="rgb(var(--dim))" fontFamily="Martian Mono Variable, monospace">{int(v)}</text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <text key={f} x={sx(xMax * f)} y={H - 8} textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'} fontSize="10" fill="rgb(var(--dim))" fontFamily="Martian Mono Variable, monospace">
          {int(xMax * f)}{f === 1 ? ` ${xLabel}` : ''}
        </text>
      ))}
      {bands && (
        <>
          <path d={area(bands.p95, bands.p5)} fill="rgb(var(--bone))" fillOpacity="0.06" />
          <path d={area(bands.p75, bands.p25)} fill="rgb(var(--bone))" fillOpacity="0.09" />
        </>
      )}
      {paths.map((p, i) => (
        <path key={i} d={line(p)} fill="none" stroke="rgb(var(--bone))" strokeOpacity="0.28" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      ))}
      {floor !== undefined && (
        <>
          <line x1={L} x2={W - R} y1={sy(floor)} y2={sy(floor)} stroke="rgb(var(--madder))" strokeDasharray="5 4" strokeWidth="1" />
          <text x={W - R} y={sy(floor) - 5} textAnchor="end" fontSize="10" fill="rgb(var(--madder))" fontFamily="Martian Mono Variable, monospace">broke</text>
        </>
      )}
      {expected !== undefined && <line x1={sx(0)} y1={sy(0)} x2={sx(xMax)} y2={sy(expected)} stroke="rgb(var(--brass))" strokeDasharray="2 4" strokeWidth="1.2" />}
      {bands && <path d={line(bands.p50)} fill="none" stroke="rgb(var(--madder))" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
