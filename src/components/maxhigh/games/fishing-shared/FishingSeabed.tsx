/**
 * Themed top-down seabed for the fishing arenas — each game gets its own
 * environment (lake, koi temple pond, rocky reef, trench, sunken armada,
 * tropical lagoon, arctic floes). Pure SVG + CSS, no image assets.
 */
import { memo, useMemo, type ReactNode } from "react";

export type SeabedTheme = "lake" | "koi" | "reef" | "trench" | "armada" | "lagoon" | "arctic";

type Rng = () => number;

function mulberry(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Draw = (x: number, y: number, s: number, r: number, rot: number, k: string) => ReactNode;

/* ---------------- primitives ---------------- */
const pebble =
  (a: string, b: string): Draw =>
  (x, y, s, _r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx="2" cy="3" rx="10" ry="6" fill="rgba(0,0,0,.28)" />
      <ellipse cx="0" cy="0" rx="10" ry="7" fill={a} />
      <ellipse cx="-2" cy="-2" rx="6" ry="3.4" fill={b} opacity=".7" />
    </g>
  );

const rock =
  (a: string, b: string): Draw =>
  (x, y, s, r, rot, k) => {
    const pts = Array.from({ length: 8 }, (_, i) => {
      const ang = (i / 8) * Math.PI * 2;
      const rad = 22 + ((r * 1000 + i * 37) % 11);
      return `${Math.cos(ang) * rad},${Math.sin(ang) * rad * 0.78}`;
    }).join(" ");
    return (
      <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
        <polygon points={pts} transform="translate(5 8)" fill="rgba(0,0,0,.32)" />
        <polygon points={pts} fill={a} stroke="rgba(0,0,0,.25)" strokeWidth="1.4" />
        <polygon points={pts} transform="scale(.62) translate(-6 -6)" fill={b} opacity=".55" />
        <path d="M-14 -4 L-2 4 L8 -2" stroke="rgba(0,0,0,.3)" strokeWidth="1.4" fill="none" />
      </g>
    );
  };

const starfish =
  (a: string, b: string): Draw =>
  (x, y, s, _r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <polygon
        points="0,-20 5,-6 19,-6 8,3 12,17 0,9 -12,17 -8,3 -19,-6 -5,-6"
        transform="translate(3 4)"
        fill="rgba(0,0,0,.3)"
      />
      <polygon
        points="0,-20 5,-6 19,-6 8,3 12,17 0,9 -12,17 -8,3 -19,-6 -5,-6"
        fill={a}
        stroke="rgba(0,0,0,.25)"
        strokeWidth="1"
      />
      {[0, 72, 144, 216, 288].map((d) => (
        <circle
          key={d}
          cx={Math.sin((d * Math.PI) / 180) * 9}
          cy={-Math.cos((d * Math.PI) / 180) * 9}
          r="1.8"
          fill={b}
        />
      ))}
    </g>
  );

const shell =
  (a: string, b: string): Draw =>
  (x, y, s, _r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M-14 8 Q0 -22 14 8 Z" transform="translate(2 3)" fill="rgba(0,0,0,.3)" />
      <path d="M-14 8 Q0 -22 14 8 Z" fill={a} stroke="rgba(0,0,0,.25)" strokeWidth="1" />
      {[-8, -3, 2, 7].map((o) => (
        <path key={o} d={`M0 6 L${o} -6`} stroke={b} strokeWidth="1.2" opacity=".8" />
      ))}
    </g>
  );

const coralBranch =
  (a: string, b: string): Draw =>
  (x, y, s, r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx="0" cy="6" rx="20" ry="8" fill="rgba(0,0,0,.28)" />
      {Array.from({ length: 7 }).map((_, i) => {
        const ang = (i / 7) * Math.PI * 2 + r;
        const x2 = Math.cos(ang) * 22;
        const y2 = Math.sin(ang) * 18;
        return (
          <g key={i}>
            <path d={`M0 0 L${x2} ${y2}`} stroke={a} strokeWidth="6" strokeLinecap="round" />
            <circle cx={x2} cy={y2} r="4.2" fill={b} />
            <path
              d={`M${x2 * 0.5} ${y2 * 0.5} l${-y2 * 0.3} ${x2 * 0.3}`}
              stroke={a}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <circle cx="0" cy="0" r="6" fill={b} />
    </g>
  );

const brainCoral =
  (a: string, b: string): Draw =>
  (x, y, s, _r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle cx="3" cy="5" r="24" fill="rgba(0,0,0,.3)" />
      <circle cx="0" cy="0" r="24" fill={a} stroke="rgba(0,0,0,.25)" strokeWidth="1.4" />
      <path
        d="M-16 -6 q6 -8 12 0 t12 0 t10 4 M-18 6 q6 -8 12 0 t12 0 M-10 -14 q6 -6 12 0 t10 2 M-8 14 q6 -6 12 0 t10 -2"
        stroke={b}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        opacity=".85"
      />
    </g>
  );

/** Overhead view of a kelp / seagrass clump: radiating blades. */
const grass =
  (a: string, b: string): Draw =>
  (x, y, s, r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <g
        style={{
          transformOrigin: "0 0",
          animation: `fs-sway ${5 + r * 4}s ease-in-out ${r * 3}s infinite`,
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => {
          const ang = (i / 9) * Math.PI * 2;
          const len = 24 + ((i * 7) % 9);
          const cx = Math.cos(ang + 0.5) * len * 0.6;
          const cy = Math.sin(ang + 0.5) * len * 0.6;
          return (
            <path
              key={i}
              d={`M0 0 Q${cx} ${cy} ${Math.cos(ang) * len} ${Math.sin(ang) * len}`}
              stroke={i % 2 ? a : b}
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              opacity=".9"
            />
          );
        })}
      </g>
    </g>
  );

const lilypad =
  (a: string, flower: string | null): Draw =>
  (x, y, s, _r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle cx="4" cy="6" r="24" fill="rgba(0,0,0,.25)" />
      <path
        d="M0 0 L22 -9 A24 24 0 1 1 22 9 Z"
        fill={a}
        stroke="rgba(0,0,0,.3)"
        strokeWidth="1.4"
      />
      <path
        d="M0 0 L-18 -8 M0 0 L-18 8 M0 0 L-4 -22 M0 0 L-4 22"
        stroke="rgba(0,0,0,.25)"
        strokeWidth="1"
      />
      {flower && (
        <g>
          {[0, 60, 120, 180, 240, 300].map((d) => (
            <ellipse
              key={d}
              cx="0"
              cy="-8"
              rx="4"
              ry="9"
              fill={flower}
              transform={`rotate(${d})`}
              opacity=".95"
            />
          ))}
          <circle r="4" fill="#fde047" />
        </g>
      )}
    </g>
  );

const log =
  (a: string, b: string): Draw =>
  (x, y, s, _r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <rect x="-60" y="-9" width="124" height="22" rx="10" fill="rgba(0,0,0,.3)" />
      <rect
        x="-60"
        y="-12"
        width="120"
        height="22"
        rx="10"
        fill={a}
        stroke="rgba(0,0,0,.35)"
        strokeWidth="1.6"
      />
      <path d="M-50 -6 H50 M-52 2 H46" stroke={b} strokeWidth="1.6" opacity=".6" />
      <ellipse cx="58" cy="-1" rx="6" ry="10" fill={b} stroke="rgba(0,0,0,.35)" strokeWidth="1.2" />
      <circle cx="58" cy="-1" r="3" fill="none" stroke="rgba(0,0,0,.3)" />
    </g>
  );

const coin: Draw = (x, y, s, _r, rot, k) => (
  <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <circle cx="2" cy="3" r="9" fill="rgba(0,0,0,.3)" />
    <circle r="9" fill="#fbbf24" stroke="#92400e" strokeWidth="1.4" />
    <rect x="-3" y="-3" width="6" height="6" fill="none" stroke="#92400e" strokeWidth="1.2" />
    <ellipse cx="-3" cy="-4" rx="4" ry="2" fill="#fef3c7" opacity=".7" />
  </g>
);

const stoneTile =
  (a: string, b: string): Draw =>
  (x, y, s, _r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <rect x="-26" y="-18" width="56" height="40" rx="5" fill="rgba(0,0,0,.3)" />
      <rect
        x="-28"
        y="-20"
        width="56"
        height="40"
        rx="5"
        fill={a}
        stroke="rgba(0,0,0,.3)"
        strokeWidth="1.4"
      />
      <rect
        x="-22"
        y="-14"
        width="44"
        height="28"
        rx="3"
        fill="none"
        stroke={b}
        strokeWidth="1.4"
        opacity=".6"
      />
      <path d="M-8 -4 q4 -6 8 0 t8 0" stroke={b} strokeWidth="1.6" fill="none" opacity=".7" />
    </g>
  );

const lotus =
  (a: string, b: string): Draw =>
  (x, y, s, _r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle cx="3" cy="5" r="20" fill="rgba(0,0,0,.2)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
        <ellipse
          key={d}
          cx="0"
          cy="-12"
          rx="6"
          ry="13"
          fill={a}
          stroke="rgba(0,0,0,.2)"
          strokeWidth="1"
          transform={`rotate(${d})`}
        />
      ))}
      {[22, 67, 112, 157, 202, 247, 292, 337].map((d) => (
        <ellipse
          key={d}
          cx="0"
          cy="-8"
          rx="4.4"
          ry="9"
          fill={b}
          transform={`rotate(${d})`}
          opacity=".9"
        />
      ))}
      <circle r="5" fill="#fde047" stroke="#a16207" strokeWidth="1" />
    </g>
  );

const plank =
  (a: string, b: string): Draw =>
  (x, y, s, r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <rect x="-48" y="-10" width="100" height="22" rx="2" fill="rgba(0,0,0,.35)" />
      <rect
        x="-50"
        y="-12"
        width="100"
        height="22"
        rx="2"
        fill={a}
        stroke="rgba(0,0,0,.4)"
        strokeWidth="1.4"
      />
      <path
        d={`M-46 -4 H${40 + r * 6} M-44 3 H${30 + r * 10}`}
        stroke={b}
        strokeWidth="1.2"
        opacity=".6"
      />
      <circle cx="-42" cy="-1" r="2" fill="#475569" />
      <circle cx="42" cy="-1" r="2" fill="#475569" />
    </g>
  );

const cannon: Draw = (x, y, s, _r, rot, k) => (
  <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x="-34" y="-10" width="72" height="26" rx="12" fill="rgba(0,0,0,.35)" />
    <rect
      x="-36"
      y="-13"
      width="72"
      height="26"
      rx="12"
      fill="#3f4752"
      stroke="#14181f"
      strokeWidth="1.8"
    />
    <rect x="-36" y="-13" width="72" height="9" rx="6" fill="rgba(255,255,255,.12)" />
    <circle cx="36" cy="0" r="9" fill="#14181f" />
    <circle cx="-38" cy="0" r="6" fill="#2a3038" stroke="#14181f" />
    <circle cx="-8" cy="0" r="11" fill="#6b3f1d" stroke="#2b1708" strokeWidth="1.6" />
    <circle cx="-8" cy="0" r="3" fill="#2b1708" />
  </g>
);

const anchor: Draw = (x, y, s, _r, rot, k) => (
  <g
    key={k}
    transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
    fill="none"
    stroke="#4b5563"
    strokeWidth="6"
    strokeLinecap="round"
  >
    <g stroke="rgba(0,0,0,.35)" transform="translate(4 5)">
      <path d="M0 -30 V28 M-22 -14 H22 M-30 14 Q0 40 30 14" />
    </g>
    <path d="M0 -30 V28 M-22 -14 H22 M-30 14 Q0 40 30 14" />
    <circle cx="0" cy="-34" r="6" />
  </g>
);

const barrel =
  (a: string): Draw =>
  (x, y, s, _r, rot, k) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle cx="3" cy="5" r="20" fill="rgba(0,0,0,.35)" />
      <circle r="20" fill={a} stroke="#1c0a02" strokeWidth="2" />
      <circle r="14" fill="none" stroke="#1c0a02" strokeWidth="1.6" opacity=".6" />
      <circle r="8" fill="none" stroke="#1c0a02" strokeWidth="1.4" opacity=".5" />
      <path d="M-20 0 H20" stroke="rgba(255,255,255,.18)" strokeWidth="3" />
    </g>
  );

const bones: Draw = (x, y, s, _r, rot, k) => (
  <g
    key={k}
    transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
    stroke="#e5e7eb"
    strokeWidth="7"
    strokeLinecap="round"
    fill="none"
  >
    <path d="M-60 0 H60" stroke="rgba(0,0,0,.3)" transform="translate(3 4)" />
    <path d="M-60 0 H60" />
    {[-44, -26, -8, 10, 28, 46].map((o, i) => (
      <g key={o}>
        <path d={`M${o} 0 Q${o + 6} -${22 - i * 2} ${o + 14} -${28 - i * 3}`} />
        <path d={`M${o} 0 Q${o + 6} ${22 - i * 2} ${o + 14} ${28 - i * 3}`} />
      </g>
    ))}
  </g>
);

const iceFloe =
  (a: string): Draw =>
  (x, y, s, r, rot, k) => {
    const pts = Array.from({ length: 9 }, (_, i) => {
      const ang = (i / 9) * Math.PI * 2;
      const rad = 34 + ((r * 977 + i * 41) % 22);
      return `${Math.cos(ang) * rad * 1.3},${Math.sin(ang) * rad * 0.8}`;
    }).join(" ");
    return (
      <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
        <polygon points={pts} fill="rgba(2,12,28,.55)" transform="translate(10 14) scale(1.08)" />
        <polygon points={pts} fill={a} stroke="#e0f2fe" strokeWidth="2" opacity=".92" />
        <polygon points={pts} transform="scale(.7)" fill="#ffffff" opacity=".35" />
        <path
          d="M-30 -6 L-6 6 L16 -4 L30 8"
          stroke="#7dd3fc"
          strokeWidth="1.6"
          fill="none"
          opacity=".7"
        />
      </g>
    );
  };

const treasure: Draw = (x, y, s, _r, rot, k) => (
  <g key={k} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <ellipse cx="4" cy="6" rx="24" ry="14" fill="rgba(0,0,0,.35)" />
    <rect
      x="-22"
      y="-12"
      width="44"
      height="26"
      rx="4"
      fill="#7c3f12"
      stroke="#2b1708"
      strokeWidth="1.8"
    />
    <path d="M-22 -12 C-22 -26 22 -26 22 -12 Z" fill="#92501a" stroke="#2b1708" strokeWidth="1.8" />
    <rect x="-3" y="-4" width="6" height="9" rx="2" fill="#fde047" stroke="#854d0e" />
    <g fill="#fbbf24">
      <circle cx="-30" cy="10" r="3" />
      <circle cx="-34" cy="16" r="3" />
      <circle cx="30" cy="16" r="3" />
    </g>
  </g>
);

/* ---------------- theme definitions ---------------- */
type Layer = { draw: Draw; count: number; size: [number, number]; z?: number };

type Theme = {
  water: [string, string, string];
  floor: string;
  ripple: string;
  glow: string;
  rays: string;
  vignette: string;
  motes: string;
  layers: Layer[];
  seed: number;
};

const THEMES: Record<SeabedTheme, Theme> = {
  lake: {
    water: ["#0d3b3a", "#0b5247", "#143f2f"],
    floor: "#6b5b3a",
    ripple: "rgba(255,240,190,.10)",
    glow: "rgba(190,242,100,.14)",
    rays: "rgba(190,242,100,.14)",
    vignette: "rgba(1,14,10,.65)",
    motes: "rgba(220,255,200,.7)",
    seed: 11,
    layers: [
      { draw: pebble("#7c6f55", "#a8987a"), count: 26, size: [0.7, 1.5] },
      { draw: rock("#5d6759", "#7f8b78"), count: 7, size: [0.9, 1.7] },
      { draw: log("#5b3b1f", "#7a5230"), count: 2, size: [1.1, 1.5] },
      { draw: grass("#3f8f3a", "#6bbf4f"), count: 14, size: [0.9, 1.6] },
      { draw: lilypad("#3e9a3a", null), count: 9, size: [0.8, 1.4] },
      { draw: lilypad("#4aa845", "#f9a8d4"), count: 3, size: [0.9, 1.2] },
    ],
  },
  koi: {
    water: ["#0f4c5c", "#0e6b72", "#134e4a"],
    floor: "#2f5d5a",
    ripple: "rgba(255,255,255,.08)",
    glow: "rgba(253,224,71,.16)",
    rays: "rgba(253,224,71,.16)",
    vignette: "rgba(2,20,24,.6)",
    motes: "rgba(254,243,199,.75)",
    seed: 23,
    layers: [
      { draw: stoneTile("#4b6f6c", "#9cc4be"), count: 12, size: [1, 1.5] },
      { draw: pebble("#6f8f8a", "#b3d4cd"), count: 22, size: [0.7, 1.4] },
      { draw: coin, count: 16, size: [0.7, 1.2] },
      { draw: rock("#3d5a58", "#64908b"), count: 6, size: [0.9, 1.6] },
      { draw: lotus("#fbcfe8", "#f9a8d4"), count: 4, size: [1, 1.4] },
      { draw: lilypad("#2f8f5b", null), count: 8, size: [0.9, 1.4] },
    ],
  },
  reef: {
    water: ["#0891b2", "#0e7490", "#155e75"],
    floor: "#d9c08a",
    ripple: "rgba(255,255,255,.18)",
    glow: "rgba(254,240,138,.22)",
    rays: "rgba(255,255,255,.2)",
    vignette: "rgba(3,40,56,.55)",
    motes: "rgba(255,255,255,.8)",
    seed: 37,
    layers: [
      { draw: pebble("#c9b17a", "#eadcb0"), count: 24, size: [0.7, 1.5] },
      { draw: rock("#8a7a62", "#b6a487"), count: 8, size: [0.9, 1.8] },
      { draw: shell("#fde7d3", "#f0a07a"), count: 10, size: [0.8, 1.4] },
      { draw: starfish("#fb923c", "#fed7aa"), count: 6, size: [0.9, 1.4] },
      { draw: coralBranch("#f472b6", "#fbcfe8"), count: 7, size: [1, 1.7] },
      { draw: coralBranch("#fb7185", "#fecdd3"), count: 4, size: [1, 1.5] },
      { draw: brainCoral("#fbbf24", "#b45309"), count: 4, size: [0.55, 0.95] },
      { draw: grass("#16a34a", "#4ade80"), count: 6, size: [0.8, 1.3] },
    ],
  },
  trench: {
    water: ["#04152e", "#072a55", "#020b1c"],
    floor: "#1b2b3e",
    ripple: "rgba(147,197,253,.07)",
    glow: "rgba(96,165,250,.16)",
    rays: "rgba(125,211,252,.22)",
    vignette: "rgba(0,4,12,.8)",
    motes: "rgba(186,230,253,.55)",
    seed: 53,
    layers: [
      { draw: pebble("#35495f", "#5a7691"), count: 22, size: [0.7, 1.6] },
      { draw: rock("#26384d", "#3d5873"), count: 12, size: [1, 2.2] },
      { draw: bones, count: 2, size: [1.2, 1.9] },
      { draw: grass("#1d4ed8", "#38bdf8"), count: 5, size: [1, 1.7] },
      { draw: starfish("#818cf8", "#c7d2fe"), count: 3, size: [0.9, 1.3] },
    ],
  },
  armada: {
    water: ["#1a1040", "#1d1b4b", "#0a1a2e"],
    floor: "#2b2542",
    ripple: "rgba(196,181,253,.07)",
    glow: "rgba(167,139,250,.18)",
    rays: "rgba(196,181,253,.16)",
    vignette: "rgba(4,2,18,.78)",
    motes: "rgba(221,214,254,.6)",
    seed: 71,
    layers: [
      { draw: plank("#4a3320", "#6e4c2e"), count: 14, size: [0.9, 1.5] },
      { draw: pebble("#3d3560", "#675c96"), count: 12, size: [0.7, 1.4] },
      { draw: cannon, count: 4, size: [1, 1.5] },
      { draw: barrel("#6b3f1d"), count: 6, size: [0.9, 1.3] },
      { draw: anchor, count: 2, size: [1.1, 1.6] },
      { draw: treasure, count: 3, size: [0.9, 1.3] },
      { draw: coin, count: 14, size: [0.7, 1.2] },
      { draw: grass("#7c3aed", "#2dd4bf"), count: 6, size: [0.9, 1.5] },
    ],
  },
  lagoon: {
    water: ["#22d3ee", "#06b6d4", "#0e7490"],
    floor: "#f0dba8",
    ripple: "rgba(255,255,255,.28)",
    glow: "rgba(254,249,195,.3)",
    rays: "rgba(255,255,255,.26)",
    vignette: "rgba(3,60,80,.45)",
    motes: "rgba(255,255,255,.85)",
    seed: 89,
    layers: [
      { draw: pebble("#dcc690", "#f5e9c3"), count: 20, size: [0.7, 1.4] },
      { draw: grass("#15803d", "#4ade80"), count: 22, size: [1, 1.9] },
      { draw: shell("#fff1e0", "#f9a8a0"), count: 9, size: [0.8, 1.4] },
      { draw: starfish("#fb7185", "#fecdd3"), count: 5, size: [0.9, 1.3] },
      { draw: brainCoral("#34d399", "#047857"), count: 4, size: [0.55, 0.95] },
      { draw: coralBranch("#a78bfa", "#ddd6fe"), count: 4, size: [1, 1.5] },
      { draw: rock("#a8a08a", "#d1c9b0"), count: 4, size: [0.9, 1.5] },
    ],
  },
  arctic: {
    water: ["#0b3a63", "#0a2a4d", "#06182f"],
    floor: "#1a3c5e",
    ripple: "rgba(224,242,254,.08)",
    glow: "rgba(186,230,253,.2)",
    rays: "rgba(224,242,254,.24)",
    vignette: "rgba(1,8,20,.78)",
    motes: "rgba(240,249,255,.7)",
    seed: 97,
    layers: [
      { draw: pebble("#3d5f82", "#6d93b8"), count: 14, size: [0.7, 1.5] },
      { draw: rock("#24476b", "#3f6c98"), count: 8, size: [1, 2] },
      { draw: iceFloe("#bfe3f7"), count: 7, size: [1.1, 2.1] },
      { draw: iceFloe("#d7eefb"), count: 4, size: [0.8, 1.4] },
      { draw: starfish("#f0abfc", "#fae8ff"), count: 3, size: [0.9, 1.2] },
    ],
  },
};

const CSS = `
@keyframes fs-sway{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
@keyframes fs-rays{0%,100%{opacity:.55;transform:translateX(-3%) skewX(-14deg)}50%{opacity:1;transform:translateX(3%) skewX(-14deg)}}
@keyframes fs-caustic{0%{background-position:0 0,40px 30px}100%{background-position:120px 90px,-80px 110px}}
@keyframes fs-bubble{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:.85}100%{transform:translateY(-110vh) scale(1.1);opacity:0}}
@keyframes fs-mote{0%{transform:translate(0,0)}50%{transform:translate(18px,-26px)}100%{transform:translate(0,0)}}
`;

export const FishingSeabed = memo(function FishingSeabed({ theme }: { theme: SeabedTheme }) {
  const t = THEMES[theme];
  const scene = useMemo(() => {
    const rng = mulberry(t.seed);
    const out: ReactNode[] = [];
    // sand ripple lines
    const ripples: ReactNode[] = [];
    for (let i = 0; i < 16; i++) {
      const y = 20 + i * 31 + rng() * 10;
      const amp = 6 + rng() * 8;
      ripples.push(
        <path
          key={`r${i}`}
          d={`M-20 ${y} Q100 ${y - amp} 220 ${y} T460 ${y} T700 ${y} T920 ${y}`}
          stroke={t.ripple}
          strokeWidth={3 + rng() * 3}
          fill="none"
        />,
      );
    }
    let n = 0;
    for (const layer of t.layers) {
      for (let i = 0; i < layer.count; i++) {
        const [a, b] = layer.size;
        out.push(
          layer.draw(
            30 + rng() * 740,
            20 + rng() * 460,
            a + rng() * (b - a),
            rng(),
            rng() * 360,
            `e${n++}`,
          ),
        );
      }
    }
    return { ripples, out };
  }, [t]);

  const bubbles = useMemo(() => {
    const r = mulberry(t.seed + 5);
    return Array.from({ length: 14 }, (_, i) => ({
      left: `${r() * 100}%`,
      size: 4 + r() * 9,
      dur: 6 + r() * 8,
      delay: -r() * 12,
      k: i,
    }));
  }, [t]);
  const motes = useMemo(() => {
    const r = mulberry(t.seed + 9);
    return Array.from({ length: 26 }, (_, i) => ({
      left: `${r() * 100}%`,
      top: `${r() * 100}%`,
      size: 1.5 + r() * 2.4,
      dur: 5 + r() * 6,
      delay: -r() * 8,
      k: i,
    }));
  }, [t]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <style>{CSS}</style>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 50% 40%, ${t.water[1]} 0%, ${t.water[0]} 55%, ${t.water[2]} 100%)`,
        }}
      />
      {/* seabed floor tint so scene reads as ground under water */}
      <div
        className="absolute inset-0 opacity-35 mix-blend-multiply"
        style={{ background: t.floor }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
      >
        {scene.ripples}
        {scene.out}
      </svg>
      {/* caustics */}
      <div
        className="absolute inset-0 opacity-50 mix-blend-soft-light"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 30% 40%, rgba(255,255,255,.55) 0 2px, transparent 3px 46px), repeating-radial-gradient(circle at 70% 60%, rgba(255,255,255,.4) 0 2px, transparent 3px 62px)",
          backgroundSize: "260px 200px, 340px 260px",
          animation: "fs-caustic 14s linear infinite",
        }}
      />
      {/* god rays */}
      {[12, 38, 62, 84].map((left, i) => (
        <div
          key={left}
          className="absolute -top-10 h-[120%] w-16 blur-md"
          style={{
            left: `${left}%`,
            background: `linear-gradient(180deg, ${t.rays}, transparent 75%)`,
            animation: `fs-rays ${7 + i * 1.5}s ease-in-out ${i * -2}s infinite`,
            transformOrigin: "top",
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 45%, ${t.glow}, transparent 70%)`,
        }}
      />
      {/* drifting particles */}
      {motes.map((m) => (
        <span
          key={m.k}
          className="absolute rounded-full"
          style={{
            left: m.left,
            top: m.top,
            width: m.size,
            height: m.size,
            background: t.motes,
            animation: `fs-mote ${m.dur}s ease-in-out ${m.delay}s infinite`,
          }}
        />
      ))}
      {bubbles.map((b) => (
        <span
          key={b.k}
          className="absolute bottom-0 rounded-full border border-white/50 bg-white/10"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            animation: `fs-bubble ${b.dur}s linear ${b.delay}s infinite`,
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 75% 62% at 50% 46%, transparent 35%, ${t.vignette} 100%)`,
        }}
      />
    </div>
  );
});
