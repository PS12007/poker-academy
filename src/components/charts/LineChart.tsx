interface Series {
  label: string;
  points: { x: number; y: number }[];
  color?: string;
}

interface Props {
  series: Series[];
  /** Log scale on either axis. Values must be positive. */
  logX?: boolean;
  logY?: boolean;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  /** Horizontal reference line. */
  reference?: { y: number; label: string };
  format?: (v: number) => string;
}

const fmt = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : Math.abs(v) < 0.01 && v !== 0 ? v.toExponential(0) : String(Math.round(v * 1000) / 1000));

/** Small SVG line chart with optional log axes. */
export function LineChart({ series, logX, logY, height = 240, xLabel, yLabel, reference, format = fmt }: Props) {
  const W = 800, H = height, L = 60, R = 14, T = 12, B = 30;
  const tx = (v: number) => (logX ? Math.log10(Math.max(v, 1e-12)) : v);
  const ty = (v: number) => (logY ? Math.log10(Math.max(v, 1e-12)) : v);
  const all = series.flatMap((s) => s.points);
  if (!all.length) return null;
  const xs = all.map((p) => tx(p.x)), ys = [...all.map((p) => ty(p.y)), ...(reference ? [ty(reference.y)] : [])];
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y1 - y0 < 1e-9) { y0 -= 1; y1 += 1; }
  const padY = (y1 - y0) * 0.08;
  y0 -= padY; y1 += padY;
  const sx = (v: number) => L + ((tx(v) - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (v: number) => T + (1 - (ty(v) - y0) / (y1 - y0)) * (H - T - B);
  const inv = (t: number, log?: boolean) => (log ? Math.pow(10, t) : t);
  const ticksY = Array.from({ length: 5 }, (_, i) => inv(y0 + padY + ((y1 - y0 - 2 * padY) * i) / 4, logY));
  const ticksX = Array.from({ length: 5 }, (_, i) => inv(x0 + ((x1 - x0) * i) / 4, logX));
  const colors = ['rgb(var(--madder))', 'rgb(var(--bone))', 'rgb(var(--verd))', 'rgb(var(--brass))', 'rgb(var(--lapis))'];
  const mono = 'Martian Mono Variable, monospace';
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${yLabel ?? 'value'} against ${xLabel ?? 'x'}`}>
        {ticksY.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke="rgb(var(--bone))" strokeOpacity="0.1" />
            <text x={L - 8} y={sy(v) + 3.5} textAnchor="end" fontSize="10" fill="rgb(var(--dim))" fontFamily={mono}>{format(v)}</text>
          </g>
        ))}
        {ticksX.map((v, i) => (
          <text key={i} x={sx(v)} y={H - 10} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'} fontSize="10" fill="rgb(var(--dim))" fontFamily={mono}>
            {fmt(v)}{i === 4 && xLabel ? ` ${xLabel}` : ''}
          </text>
        ))}
        {reference && (
          <>
            <line x1={L} x2={W - R} y1={sy(reference.y)} y2={sy(reference.y)} stroke="rgb(var(--brass))" strokeDasharray="3 4" />
            <text x={W - R} y={sy(reference.y) - 5} textAnchor="end" fontSize="10" fill="rgb(var(--brass))" fontFamily={mono}>{reference.label}</text>
          </>
        )}
        {series.map((s, i) => (
          <path key={s.label} d={s.points.map((p, k) => `${k ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join('')} fill="none" stroke={s.color ?? colors[i % colors.length]} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {series.map((s, i) => (
            <span key={s.label} className="label flex items-center gap-2"><span className="h-[2px] w-4" style={{ background: s.color ?? colors[i % colors.length] }} />{s.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
