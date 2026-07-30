/**
 * AdminSparkline — Bitcoin-style mini smooth area + line chart.
 * Uses cubic Bézier interpolation for a premium crypto-chart feel.
 */
export function AdminSparkline({
  tone = "violet",
  points,
  positive,
}: {
  tone?: "violet" | "green" | "cyan" | "amber" | "rose";
  points?: number[];
  positive?: boolean;
}) {
  const data = points ?? [4, 8, 6, 12, 9, 14, 11, 16, 13, 18];
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const w = 96;
  const h = 40;
  const pad = 3;

  // Map data to SVG coords
  const coords: [number, number][] = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y];
  });

  // Smooth cubic Bézier path
  function smoothPath(pts: [number, number][]): string {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cpx = (x0 + x1) / 2;
      d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
    }
    return d;
  }

  const linePath = smoothPath(coords);
  const [lastX, lastY] = coords[coords.length - 1];
  const [firstX] = coords[0];
  const areaPath = `${linePath} L ${lastX},${h} L ${firstX},${h} Z`;

  // Resolved colors
  const resolvedPositive = positive ?? true;
  const colorMap = {
    violet: { stroke: "#A855F7", gradId: "sgV" },
    green:  { stroke: "#34D399", gradId: "sgG" },
    cyan:   { stroke: "#22D3EE", gradId: "sgC" },
    amber:  { stroke: "#FBBF24", gradId: "sgA" },
    rose:   { stroke: "#FB7185", gradId: "sgR" },
  } as const;

  const autoTone: typeof tone = resolvedPositive ? "green" : "rose";
  const activeTone = tone === "violet" ? autoTone : tone;
  const { stroke, gradId } = colorMap[activeTone];

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* Glow line */}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
        style={{ filter: `drop-shadow(0 0 4px ${stroke})` }}
      />
      {/* Main line */}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle cx={lastX} cy={lastY} r={3} fill={stroke} />
    </svg>
  );
}
