import React, { useEffect, useRef, useState } from 'react';

/*
 * Lightweight SVG charts for the admin panel (no chart library).
 * Rules: thin marks, 4px rounded data-ends on a single baseline, hairline grid,
 * legend for 2+ series, hover tooltip on every mark, table view for every chart.
 * Categorical colours: validated reference slots 1–3 (blue, orange, aqua).
 */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'] as const;
export const BRAND = '#c64873';
const GRID = '#ece7e4';
const MUTED = '#7a6a63';

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => n <= x) || 10;
  return step * p;
}

export const compact = (n: number) =>
  n >= 1_000_000
    ? `${+(n / 1_000_000).toFixed(1)}M`
    : n >= 10_000
    ? `${Math.round(n / 1000)}K`
    : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Rounded-top rectangle path (square at the baseline). */
function colPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

interface TooltipState {
  x: number;
  y: number;
  title: string;
  rows: Array<{ color?: string; label: string; value: string }>;
}

const Tooltip: React.FC<{ tip: TooltipState | null; width: number }> = ({ tip, width }) => {
  if (!tip) return null;
  const left = Math.min(Math.max(tip.x, 70), Math.max(70, width - 70));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-white px-3 py-2 text-xs shadow-lg border border-black/10 whitespace-nowrap"
      style={{ left, top: tip.y - 8 }}
    >
      <div className="text-[11px] text-[#7a6a63] mb-1">{tip.title}</div>
      {tip.rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          {r.color && <span className="inline-block w-3 h-[2px] rounded" style={{ background: r.color }} />}
          <span className="font-bold text-[#1e1418] tabular-nums">{r.value}</span>
          <span className="text-[#52514e]">{r.label}</span>
        </div>
      ))}
    </div>
  );
};

/** Card wrapper with title, optional legend and a table-view toggle (values never gated behind hover). */
export const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  legend?: Array<{ label: string; color: string; shape?: 'line' | 'rect' }>;
  table: { head: string[]; rows: Array<Array<string | number>> };
  children: React.ReactNode;
}> = ({ title, subtitle, legend, table, children }) => {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="bg-white rounded-2xl border border-black/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-bold text-[#1e1418]">{title}</h3>
          {subtitle && <p className="text-xs text-[#7a6a63]">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs font-semibold text-[#9e3e60] min-h-[32px] px-2.5 rounded-lg hover:bg-[#fceef4]"
        >
          {showTable ? 'Diagramma' : 'Jadval'}
        </button>
      </div>
      {legend && legend.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs text-[#52514e]">
          {legend.map((l) => (
            <li key={l.label} className="inline-flex items-center gap-1.5">
              {l.shape === 'line' ? (
                <span className="inline-block w-3.5 h-[2px] rounded" style={{ background: l.color }} />
              ) : (
                <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: l.color }} />
              )}
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {showTable ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-left text-[#7a6a63]">
                {table.head.map((h) => (
                  <th key={h} className="py-1.5 pr-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-black/5">
                  {r.map((c, j) => (
                    <td key={j} className="py-1.5 pr-3 text-[#1e1418]">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ columns */
export const ColumnChart: React.FC<{
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
  format?: (n: number) => string;
  valueLabel: string;
}> = ({ data, color = BRAND, height = 200, format = compact, valueLabel }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [hover, setHover] = useState(-1);
  const padL = 44;
  const padB = 22;
  const padT = 16;
  const innerW = Math.max(0, width - padL - 4);
  const innerH = height - padB - padT;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.max(2, Math.min(24, band - 2));
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 44))));
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);

  return (
    <div ref={ref} className="relative w-full" onPointerLeave={() => { setTip(null); setHover(-1); }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={valueLabel}>
          {ticks.map((t) => {
            const y = padT + innerH - (t / max) * innerH;
            return (
              <g key={t}>
                <line x1={padL} x2={width} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
                <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={10} fill={MUTED}>
                  {compact(t)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const h = (d.value / max) * innerH;
            const x = padL + i * band + (band - barW) / 2;
            const y = padT + innerH - h;
            return (
              <g key={d.label + i}>
                <path
                  d={colPath(x, y, barW, h)}
                  fill={color}
                  opacity={hover === -1 || hover === i ? 1 : 0.55}
                  className="admin-bar-grow"
                  style={{ animationDelay: `${Math.min(i, 40) * 12}ms`, transition: 'opacity 0.15s ease' }}
                />
                {i === peak && d.value > 0 && (
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#1e1418">
                    {compact(d.value)}
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text x={padL + i * band + band / 2} y={height - 6} textAnchor="middle" fontSize={10} fill={MUTED}>
                    {d.label}
                  </text>
                )}
                <rect
                  x={padL + i * band}
                  y={padT}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  onPointerMove={() => {
                    setHover(i);
                    setTip({ x: x + barW / 2, y: Math.min(y, padT + innerH - 10), title: d.label, rows: [{ label: valueLabel, value: format(d.value) }] });
                  }}
                  onFocus={() => {
                    setHover(i);
                    setTip({ x: x + barW / 2, y: Math.min(y, padT + innerH - 10), title: d.label, rows: [{ label: valueLabel, value: format(d.value) }] });
                  }}
                  onBlur={() => { setTip(null); setHover(-1); }}
                />
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip tip={tip} width={width} />
    </div>
  );
};

/* --------------------------------------------------------------------- lines */
export const LineChart: React.FC<{
  labels: string[];
  series: Array<{ name: string; color: string; values: number[] }>;
  height?: number;
}> = ({ labels, series, height = 200 }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [idx, setIdx] = useState<number | null>(null);
  const padL = 36;
  const padR = 14;
  const padB = 22;
  const padT = 14;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padB - padT;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const n = labels.length;
  const xAt = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - (v / max) * innerH;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 44))));

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left - padL;
    const i = n <= 1 ? 0 : Math.round((px / innerW) * (n - 1));
    setIdx(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div ref={ref} className="relative w-full" onPointerLeave={() => setIdx(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map((s) => s.name).join(', ')}>
          {[0, 0.5, 1].map((f) => {
            const y = padT + innerH - f * innerH;
            return (
              <g key={f}>
                <line x1={padL} x2={width - padR} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
                <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={10} fill={MUTED}>
                  {compact(f * max)}
                </text>
              </g>
            );
          })}
          {labels.map((l, i) =>
            i % labelEvery === 0 ? (
              <text key={l + i} x={xAt(i)} y={height - 6} textAnchor="middle" fontSize={10} fill={MUTED}>
                {l}
              </text>
            ) : null
          )}
          {idx !== null && <line x1={xAt(idx)} x2={xAt(idx)} y1={padT} y2={padT + innerH} stroke="#c3c2b7" strokeWidth={1} />}
          {series.map((s) => (
            <g key={s.name}>
              <polyline
                pathLength={1}
                className="admin-line-draw"
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')}
              />
              {n > 0 && (
                <circle cx={xAt(n - 1)} cy={yAt(s.values[n - 1] || 0)} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
              )}
              {idx !== null && (
                <circle cx={xAt(idx)} cy={yAt(s.values[idx] || 0)} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
              )}
            </g>
          ))}
          <rect
            x={padL}
            y={padT}
            width={innerW}
            height={innerH}
            fill="transparent"
            tabIndex={0}
            onPointerMove={onMove}
            onFocus={() => setIdx(n - 1)}
            onBlur={() => setIdx(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setIdx((v) => Math.max(0, (v ?? n - 1) - 1));
              if (e.key === 'ArrowRight') setIdx((v) => Math.min(n - 1, (v ?? 0) + 1));
            }}
          />
        </svg>
      )}
      <Tooltip
        width={width}
        tip={
          idx === null
            ? null
            : {
                x: xAt(idx),
                y: padT + 8,
                title: labels[idx],
                rows: series.map((s) => ({ color: s.color, label: s.name, value: String(s.values[idx] || 0) })),
              }
        }
      />
    </div>
  );
};

/* ----------------------------------------------------------- horizontal bars */
export const HBarList: React.FC<{
  items: Array<{ label: string; value: number }>;
  color?: string;
  format?: (n: number) => string;
}> = ({ items, color = SERIES[0], format = (n) => String(n) }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-sm text-[#7a6a63] py-6 text-center">Ma’lumot yo‘q.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.label} title={`${it.label}: ${format(it.value)}`}>
          <div className="flex justify-between text-xs mb-1 gap-2">
            <span className="text-[#1e1418] truncate">{it.label}</span>
            <span className="font-bold tabular-nums text-[#1e1418] shrink-0">{format(it.value)}</span>
          </div>
          <div className="h-3 rounded-r bg-[#f3eeea]">
            <div
              className="h-3 rounded-r admin-hbar-grow"
              style={{ width: `${(it.value / max) * 100}%`, background: color, minWidth: it.value ? 3 : 0 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

/* ------------------------------------------------------------ segmented bar */
export const SegmentBar: React.FC<{
  segments: Array<{ label: string; value: number; color: string }>;
}> = ({ segments }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex h-7 w-full gap-[2px] rounded-md overflow-hidden bg-[#f3eeea]" role="img" aria-label="Buyurtmalar holati">
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.label}
                tabIndex={0}
                title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
                onPointerEnter={() => setHover(s.label)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(s.label)}
                onBlur={() => setHover(null)}
                className="admin-hbar-grow"
                style={{ width: `${(s.value / total) * 100}%`, background: s.color, opacity: hover && hover !== s.label ? 0.55 : 1 }}
              />
            ))}
      </div>
      <ul className="space-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: s.color }} />
            <span className="text-[#52514e]">{s.label}</span>
            <span className="ml-auto font-bold tabular-nums text-[#1e1418]">
              {s.value} {total ? `· ${Math.round((s.value / total) * 100)}%` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Number that counts smoothly to its new value (also on live updates). Respects reduced motion. */
export const AnimatedValue: React.FC<{ value: number; format: (n: number) => string }> = ({ value, format }) => {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(0);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = shownRef.current;
    if (reduce || from === value) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const v = from + (value - from) * (1 - Math.pow(1 - t, 3));
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
};
