import { useEffect, useRef, useState } from "react";
import { getPlatformEarningsGraphFn } from "@/functions/superadmin";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type EarningsPoint = {
  label: string;
  earnings: number;
  volume: number;
};

type Period = "day" | "week" | "month";

const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "24h" },
  { id: "week", label: "7d" },
  { id: "month", label: "30d" },
];

function buildSmoothPath(coords: [number, number][]): string {
  if (coords.length < 2) return "";
  let d = `M ${coords[0][0]},${coords[0][1]}`;
  for (let i = 1; i < coords.length; i++) {
    const [x0, y0] = coords[i - 1];
    const [x1, y1] = coords[i];
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
  }
  return d;
}

function buildAreaPath(coords: [number, number][], bottomY: number): string {
  if (coords.length < 2) return "";
  const line = buildSmoothPath(coords);
  const [lastX] = coords[coords.length - 1];
  const [firstX] = coords[0];
  return `${line} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
}

function formatCurrency(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `₱${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `₱${(val / 1_000).toFixed(1)}k`;
  return `₱${val.toFixed(0)}`;
}

export function AdminEarningsChart() {
  const [period, setPeriod] = useState<Period>("week");
  const [points, setPoints] = useState<EarningsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    idx: number;
    x: number;
    y: number;
    pt: EarningsPoint;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTooltip(null);
    (async () => {
      try {
        const res = await getPlatformEarningsGraphFn();
        if (!cancelled) setPoints(res as EarningsPoint[]);
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period]);

  // Chart layout constants
  const SVG_W = 900;
  const SVG_H = 200;
  const PAD_LEFT = 62;
  const PAD_RIGHT = 16;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 28;
  const chartW = SVG_W - PAD_LEFT - PAD_RIGHT;
  const chartH = SVG_H - PAD_TOP - PAD_BOTTOM;
  const bottomY = PAD_TOP + chartH;

  // Compute axes
  const vals = points.map((p) => p.earnings);
  const rawMin = vals.length ? Math.min(...vals) : 0;
  const rawMax = vals.length ? Math.max(...vals) : 1000;
  const spread = rawMax - rawMin || 1;
  const yMin = rawMin - spread * 0.1;
  const yMax = rawMax + spread * 0.1;
  const yRange = yMax - yMin || 1;

  const toX = (i: number) =>
    PAD_LEFT + (i / Math.max(points.length - 1, 1)) * chartW;
  const toY = (v: number) =>
    PAD_TOP + chartH - ((v - yMin) / yRange) * chartH;

  const coords: [number, number][] = points.map((p, i) => [toX(i), toY(p.earnings)]);
  const linePath = buildSmoothPath(coords);
  const areaPath = buildAreaPath(coords, bottomY);

  const totalEarnings = points.reduce((s, p) => s + p.earnings, 0);
  const totalVolume = points.reduce((s, p) => s + p.volume, 0);
  const avgEarnings = points.length ? totalEarnings / points.length : 0;
  const isPositive = totalEarnings >= 0;

  // Y-axis ticks
  const TICKS = 5;
  const yTicks = Array.from({ length: TICKS }, (_, i) => {
    const v = yMin + (yRange / (TICKS - 1)) * i;
    return { v, y: toY(v) };
  });

  // X-axis labels (≤8)
  const xStep = Math.max(1, Math.ceil(points.length / 8));
  const xLabels = points
    .map((p, i) => ({ label: p.label, x: toX(i) }))
    .filter((_, i) => i % xStep === 0);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !coords.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * SVG_W;
    let closest = 0;
    let minD = Infinity;
    coords.forEach(([cx], i) => {
      const d = Math.abs(cx - mx);
      if (d < minD) { minD = d; closest = i; }
    });
    const [cx, cy] = coords[closest];
    setTooltip({ idx: closest, x: cx, y: cy, pt: points[closest] });
  };

  function DeltaIcon({ val }: { val: number }) {
    if (val > 0) return <TrendingUp size={12} className="text-emerald-400" />;
    if (val < 0) return <TrendingDown size={12} className="text-rose-400" />;
    return <Minus size={12} className="text-white/30" />;
  }
  function deltaClass(val: number) {
    return val > 0 ? "text-emerald-400" : val < 0 ? "text-rose-400" : "text-white/40";
  }

  return (
    <div
      className="rounded-2xl border border-white/[0.07] bg-[rgba(12,10,22,0.90)] shadow-[0_8px_40px_rgba(0,0,0,0.45)] overflow-hidden"
    >
      {/* ── Header ─────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15 border border-violet-400/20">
            <TrendingUp size={17} className="text-violet-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-none">Revenue Chart</h2>
            <p className="text-[10px] text-white/35 mt-0.5">
              Net earnings over time — hover to inspect
            </p>
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                period === p.id
                  ? "bg-violet-600 text-white"
                  : "text-white/35 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Strip ──────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-white/[0.05] divide-x divide-white/[0.05]">
        {[
          { label: "Total Earnings", val: totalEarnings },
          { label: "Total Volume", val: totalVolume },
          { label: "Avg. Per Period", val: avgEarnings },
          { label: "Period", val: null, extra: period.toUpperCase(), accent: true },
        ].map(({ label, val, extra, accent }) => (
          <div
            key={label}
            className={`px-5 py-3.5 ${accent ? "bg-violet-500/[0.06]" : ""}`}
          >
            <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider">
              {label}
            </div>
            <div
              className={`mt-1 text-base font-black tabular-nums flex items-center gap-1.5 ${
                val !== null ? deltaClass(val) : "text-violet-300"
              }`}
            >
              {val !== null ? (
                <>
                  <DeltaIcon val={val} />
                  {formatCurrency(val)}
                </>
              ) : (
                <span>{extra}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart Area ─────────────────── */}
      <div className="px-2 pt-4 pb-2">
        {loading ? (
          <div className="h-52 flex flex-col items-center justify-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            <span className="text-xs text-white/25">Loading chart…</span>
          </div>
        ) : !points.length ? (
          <div className="h-52 flex items-center justify-center text-sm text-white/30">
            No earnings data recorded yet.
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full overflow-visible cursor-crosshair select-none"
            style={{ height: "220px" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
            aria-label="Revenue trend chart"
          >
            <defs>
              <linearGradient id="acGradPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="acGradNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="acLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="45%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
              <filter id="acGlow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Y-axis ticks & grid */}
            {yTicks.map(({ v, y }, i) => (
              <g key={i}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={SVG_W - PAD_RIGHT}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
                <text
                  x={PAD_LEFT - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="rgba(255,255,255,0.28)"
                  fontFamily="Inter,sans-serif"
                >
                  {formatCurrency(v)}
                </text>
              </g>
            ))}

            {/* Area */}
            {areaPath && (
              <path
                d={areaPath}
                fill={isPositive ? "url(#acGradPos)" : "url(#acGradNeg)"}
              />
            )}

            {/* Glow line (blurred) */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="url(#acLineGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#acGlow)"
                opacity="0.55"
              />
            )}

            {/* Main crisp line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="url(#acLineGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* X-axis labels */}
            {xLabels.map(({ label, x }) => (
              <text
                key={label}
                x={x}
                y={SVG_H - 4}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(255,255,255,0.25)"
                fontFamily="Inter,sans-serif"
              >
                {label}
              </text>
            ))}

            {/* Data dots */}
            {coords.map(([cx, cy], i) =>
              tooltip?.idx === i ? null : (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={2.5}
                  fill={points[i].earnings >= 0 ? "#A855F7" : "#F43F5E"}
                  opacity="0.5"
                />
              )
            )}

            {/* Crosshair & tooltip */}
            {tooltip && (() => {
              const isLeft = tooltip.x > SVG_W * 0.65;
              const bx = isLeft ? tooltip.x - 132 : tooltip.x + 14;
              const by = Math.max(PAD_TOP, Math.min(tooltip.y - 40, bottomY - 80));
              const ptPos = tooltip.pt.earnings >= 0;
              return (
                <g>
                  <line
                    x1={tooltip.x}
                    y1={PAD_TOP}
                    x2={tooltip.x}
                    y2={bottomY}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <circle cx={tooltip.x} cy={tooltip.y} r={9} fill="rgba(168,85,247,0.22)" />
                  <circle cx={tooltip.x} cy={tooltip.y} r={5} fill="#A855F7" />

                  <rect x={bx} y={by} width={122} height={68} rx={8}
                    fill="rgba(8,6,18,0.97)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                  <text x={bx + 10} y={by + 16} fontSize="10" fontWeight="700" fill="white" fontFamily="Inter,sans-serif">
                    {tooltip.pt.label}
                  </text>
                  <text x={bx + 10} y={by + 30} fontSize="9.5" fill="rgba(255,255,255,0.38)" fontFamily="Inter,sans-serif">Earnings:</text>
                  <text x={bx + 68} y={by + 30} fontSize="9.5" fontWeight="700"
                    fill={ptPos ? "#34D399" : "#F87171"} fontFamily="Inter,sans-serif">
                    {formatCurrency(tooltip.pt.earnings)}
                  </text>
                  <text x={bx + 10} y={by + 46} fontSize="9" fill="rgba(255,255,255,0.28)" fontFamily="Inter,sans-serif">
                    Vol: {formatCurrency(tooltip.pt.volume)}
                  </text>
                  <text x={bx + 10} y={by + 60} fontSize="9" fill="rgba(255,255,255,0.2)" fontFamily="Inter,sans-serif">
                    Margin: {tooltip.pt.volume > 0 ? ((tooltip.pt.earnings / tooltip.pt.volume) * 100).toFixed(1) : "—"}%
                  </text>
                </g>
              );
            })()}
          </svg>
        )}
      </div>
    </div>
  );
}
