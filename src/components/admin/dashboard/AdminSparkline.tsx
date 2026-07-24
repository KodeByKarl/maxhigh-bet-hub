/** Tiny decorative sparkline for metric cards. */
export function AdminSparkline({
  tone = "violet",
  points,
}: {
  tone?: "violet" | "green" | "cyan" | "amber";
  points?: number[];
}) {
  const data = points ?? [4, 8, 6, 12, 9, 14, 11, 16, 13, 18];
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const w = 88;
  const h = 36;
  const coords = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const line = coords.join(" ");
  const area = `0,${h} ${line} ${w},${h}`;

  const stroke =
    tone === "green"
      ? "#34D399"
      : tone === "cyan"
        ? "#22D3EE"
        : tone === "amber"
          ? "#FBBF24"
          : "#A78BFA";
  const fill =
    tone === "green"
      ? "url(#sparkGreen)"
      : tone === "cyan"
        ? "url(#sparkCyan)"
        : tone === "amber"
          ? "url(#sparkAmber)"
          : "url(#sparkViolet)";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="sparkViolet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkCyan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkAmber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={fill} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
