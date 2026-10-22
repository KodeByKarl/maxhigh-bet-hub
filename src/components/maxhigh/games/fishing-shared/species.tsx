/**
 * Cartoon-realistic top-down fauna for every MaxHigh fishing game.
 * viewBox 220×100, head to the RIGHT, tail to the LEFT (same box the old generic fish used,
 * so hit-boxes / sizes in the spawners are unchanged).
 */
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TierKey = "common" | "uncommon" | "rare" | "elite" | "super" | "boss" | "crate";

export type Pal = {
  body: string;
  mid: string;
  dark: string;
  fin: string;
  accent: string;
  belly?: string;
  glow: string;
};

export type Kind =
  "fish" | "shark" | "ray" | "turtle" | "crab" | "octopus" | "squid" | "jelly" | "whale" | "dragon";

export type Spec = {
  kind: Kind;
  pal: Pal;
  treasure?: "lure" | "pearl" | "coral" | "anchor" | "shell" | "ice";
  /** Free-form per-kind options. */
  o?: {
    pattern?: "none" | "stripes" | "spots" | "bands" | "blotches" | "scales" | "koi" | "tiger";
    slim?: number;
    wide?: number;
    barbels?: boolean;
    hammer?: boolean;
    orca?: boolean;
    tusk?: boolean;
    beluga?: boolean;
    spiky?: boolean;
    rings?: boolean;
    scars?: boolean;
    glowEyes?: boolean;
    arms?: number;
    longLegs?: boolean;
    claws?: boolean;
    lobster?: boolean;
    horns?: boolean;
    barnacles?: boolean;
    forkTail?: boolean;
    puffer?: boolean;
    manta?: boolean;
  };
  /** Width multiplier for the render box (long fish > 1). */
  aspect?: number;
};

type Ctx = {
  pal: Pal;
  uid: string;
  o: NonNullable<Spec["o"]>;
  frozen: boolean;
  dur: string;
  delay: string;
};

const anim = (c: Ctx, name: string, origin: string, extra = "") =>
  c.frozen
    ? { transformOrigin: origin }
    : {
        transformOrigin: origin,
        animation: `${name} ${c.dur} ease-in-out ${c.delay} infinite ${extra}`,
      };

/** Cylinder-style top-down shading gradient (dark rim → light spine → dark rim). */
function Shade({ c, id }: { c: Ctx; id: string }) {
  return (
    <linearGradient id={`${c.uid}-${id}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={c.pal.dark} />
      <stop offset="28%" stopColor={c.pal.mid} />
      <stop offset="50%" stopColor={c.pal.body} />
      <stop offset="72%" stopColor={c.pal.mid} />
      <stop offset="100%" stopColor={c.pal.dark} />
    </linearGradient>
  );
}

function Eye({ x, y, r = 4, glow }: { x: number; y: number; r?: number; glow?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r + 1.4} fill="rgba(0,0,0,.35)" />
      <circle cx={x} cy={y} r={r} fill={glow ?? "#0b1220"} />
      <circle cx={x + r * 0.3} cy={y - r * 0.35} r={r * 0.34} fill="#fff" />
    </g>
  );
}

/** Soft ground shadow so every creature sits "above" the seabed. */
function Shadow({ rx = 78 }: { rx?: number }) {
  return <ellipse cx="118" cy="86" rx={rx} ry="9" fill="rgba(0,0,0,.28)" />;
}

/* ------------------------------------------------------------------ FISH */
const FISH_BODY =
  "M40 50 C58 30 108 20 150 24 C186 27 206 40 212 50 C206 60 186 73 150 76 C108 80 58 70 40 50 Z";

function Fish({ c }: { c: Ctx }) {
  const { pal, o, uid } = c;
  const sy = o.slim ?? 1;
  const wide = o.wide ?? 1;
  const pattern = o.pattern ?? "none";
  const spots = [
    [90, 38],
    [112, 60],
    [132, 40],
    [152, 58],
    [172, 44],
    [72, 54],
    [100, 50],
    [140, 50],
    [160, 36],
  ];
  return (
    <g transform={`translate(0 50) scale(1 ${sy}) translate(0 -50)`}>
      <defs>
        <Shade c={c} id="s" />
        <clipPath id={`${uid}-clip`}>
          <path d={FISH_BODY} />
        </clipPath>
      </defs>
      <Shadow />
      {/* tail */}
      <g style={anim(c, "db-tail-wag", "46px 50px")}>
        {o.forkTail === false ? (
          <path
            d="M48 50 C30 28 10 30 4 50 C10 70 30 72 48 50 Z"
            fill={pal.fin}
            stroke={pal.dark}
            strokeWidth="1.5"
          />
        ) : (
          <>
            <path
              d="M50 50 L2 20 C12 36 14 44 12 50 C14 56 12 64 2 80 Z"
              fill={pal.fin}
              stroke={pal.dark}
              strokeWidth="1.5"
            />
            <path
              d="M46 50 L16 34 M46 50 L12 50 M46 50 L16 66"
              stroke={pal.dark}
              strokeWidth="1"
              opacity=".5"
            />
          </>
        )}
      </g>
      {/* pectoral fins */}
      <g style={anim(c, "db-fin-flutter", "140px 50px")}>
        <path
          d="M148 30 C132 8 112 4 100 10 C108 20 122 30 140 36 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.2"
          opacity=".95"
        />
        <path
          d="M148 70 C132 92 112 96 100 90 C108 80 122 70 140 64 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.2"
          opacity=".95"
        />
      </g>
      {/* body */}
      <g transform={`translate(0 50) scale(${wide} 1) translate(0 -50)`}>
        <path d={FISH_BODY} fill={`url(#${uid}-s)`} stroke={pal.dark} strokeWidth="2" />
        <g clipPath={`url(#${uid}-clip)`}>
          {pattern === "scales" &&
            Array.from({ length: 6 }).flatMap((_, r) =>
              Array.from({ length: 12 }).map((__, k) => (
                <path
                  key={`${r}-${k}`}
                  d={`M${50 + k * 14 + (r % 2) * 7} ${26 + r * 9} q5 6 0 12`}
                  stroke={pal.dark}
                  strokeWidth="1"
                  fill="none"
                  opacity=".35"
                />
              )),
            )}
          {pattern === "stripes" &&
            [80, 104, 128, 152].map((x) => (
              <path
                key={x}
                d={`M${x} 22 Q${x + 14} 50 ${x} 78`}
                stroke={pal.accent}
                strokeWidth="7"
                fill="none"
                opacity=".85"
              />
            ))}
          {pattern === "tiger" &&
            [70, 92, 114, 136, 158, 178].map((x, i) => (
              <path
                key={x}
                d={`M${x} ${i % 2 ? 22 : 30} Q${x + 8} 50 ${x} ${i % 2 ? 78 : 70}`}
                stroke={pal.accent}
                strokeWidth="5"
                fill="none"
                opacity=".8"
              />
            ))}
          {pattern === "bands" &&
            [100, 150].map((x) => (
              <g key={x}>
                <path
                  d={`M${x - 8} 20 Q${x + 4} 50 ${x - 8} 80 L${x + 10} 80 Q${x + 22} 50 ${x + 10} 20 Z`}
                  fill={pal.accent}
                />
                <path
                  d={`M${x - 8} 20 Q${x + 4} 50 ${x - 8} 80 M${x + 10} 20 Q${x + 22} 50 ${x + 10} 80`}
                  stroke="#111827"
                  strokeWidth="2.4"
                  fill="none"
                />
              </g>
            ))}
          {pattern === "spots" &&
            spots.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={3 + (i % 3)} fill={pal.accent} opacity=".85" />
            ))}
          {pattern === "blotches" &&
            [78, 104, 130, 156].map((x, i) => (
              <ellipse
                key={x}
                cx={x}
                cy={i % 2 ? 36 : 64}
                rx="11"
                ry="7"
                fill={pal.dark}
                opacity=".5"
              />
            ))}
          {pattern === "koi" && (
            <>
              <path d="M64 26 C84 20 100 40 90 54 C80 66 56 56 64 26 Z" fill={pal.accent} />
              <path
                d="M110 30 C136 22 150 40 140 60 C128 74 100 64 110 30 Z"
                fill={pal.accent}
                opacity=".95"
              />
              <path
                d="M160 34 C176 32 186 44 180 56 C172 66 154 58 160 34 Z"
                fill="#1f2937"
                opacity=".85"
              />
            </>
          )}
          <ellipse cx="124" cy="38" rx="56" ry="6" fill="rgba(255,255,255,.28)" />
        </g>
        {o.barbels && (
          <g stroke={pal.dark} strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path d="M206 42 C220 30 236 30 246 22" />
            <path d="M206 58 C220 70 236 70 246 78" />
            <path d="M210 46 C224 42 238 46 248 44" />
            <path d="M210 54 C224 58 238 54 248 56" />
          </g>
        )}
        {/* dorsal ridge */}
        <path
          d="M60 50 Q130 44 200 50"
          stroke={pal.dark}
          strokeWidth="2"
          fill="none"
          opacity=".35"
        />
        <path
          d="M86 50 L118 40 L150 50 L118 46 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1"
        />
        <Eye x={192} y={37} />
        <Eye x={192} y={63} />
      </g>
    </g>
  );
}

/* ----------------------------------------------------------------- SHARK */
function Shark({ c }: { c: Ctx }) {
  const { pal, o, uid } = c;
  const body =
    "M16 50 C48 43 90 35 140 33 C182 32 206 43 216 50 C206 57 182 68 140 67 C90 65 48 57 16 50 Z";
  return (
    <g>
      <defs>
        <Shade c={c} id="s" />
        <clipPath id={`${uid}-clip`}>
          <path d={body} />
        </clipPath>
      </defs>
      <Shadow rx={90} />
      <g style={anim(c, "db-tail-wag", "30px 50px")}>
        <path
          d="M34 50 L-6 6 C4 24 8 38 8 48 C14 52 12 56 8 60 C10 70 6 80 -2 90 L34 54 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.6"
        />
      </g>
      <g style={anim(c, "db-fin-flutter", "126px 50px")}>
        <path
          d="M132 36 L100 0 C98 14 104 26 112 38 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.4"
        />
        <path
          d="M132 64 L100 100 C98 86 104 74 112 62 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.4"
        />
        <path
          d="M66 42 L52 30 L72 40 Z M66 58 L52 70 L72 60 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1"
        />
      </g>
      {o.hammer && (
        <path
          d="M178 50 C180 28 196 14 206 12 C214 14 214 24 208 32 C212 40 212 60 208 68 C214 76 214 86 206 88 C196 86 180 72 178 50 Z"
          fill={`url(#${uid}-s)`}
          stroke={pal.dark}
          strokeWidth="2"
        />
      )}
      <path d={body} fill={`url(#${uid}-s)`} stroke={pal.dark} strokeWidth="2" />
      <g clipPath={`url(#${uid}-clip)`}>
        {o.pattern === "tiger" &&
          [60, 82, 104, 126, 148].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${i % 2 ? 30 : 36} Q${x + 8} 50 ${x} ${i % 2 ? 70 : 64}`}
              stroke={pal.accent}
              strokeWidth="5"
              fill="none"
              opacity=".7"
            />
          ))}
        <path
          d="M30 50 Q120 47 214 50"
          stroke="rgba(255,255,255,.18)"
          strokeWidth="9"
          fill="none"
        />
        {o.scars && (
          <g stroke="#e2e8f0" strokeWidth="1.8" opacity=".6" fill="none">
            <path d="M96 38 l14 10 M100 36 l16 12 M150 62 l-12 -8" />
          </g>
        )}
      </g>
      <path d="M96 50 L126 45 L96 44 Z" fill={pal.dark} opacity=".7" />
      <g stroke={pal.dark} strokeWidth="1.4" opacity=".5">
        <path d="M150 38 q2 4 0 8 M156 38 q2 4 0 8 M162 38 q2 4 0 8" fill="none" />
        <path d="M150 62 q2 -4 0 -8 M156 62 q2 -4 0 -8 M162 62 q2 -4 0 -8" fill="none" />
      </g>
      {o.hammer ? (
        <>
          <Eye x={206} y={18} r={3.6} />
          <Eye x={206} y={82} r={3.6} />
        </>
      ) : (
        <>
          <Eye x={192} y={38} r={3.6} glow={o.glowEyes ? "#ef4444" : undefined} />
          <Eye x={192} y={62} r={3.6} glow={o.glowEyes ? "#ef4444" : undefined} />
        </>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------- RAY */
function Ray({ c }: { c: Ctx }) {
  const { pal, uid } = c;
  const wings =
    "M214 50 C186 42 152 10 98 2 C108 22 102 36 84 50 C102 64 108 78 98 98 C152 90 186 58 214 50 Z";
  return (
    <g>
      <defs>
        <Shade c={c} id="s" />
        <clipPath id={`${uid}-clip`}>
          <path d={wings} />
        </clipPath>
      </defs>
      <Shadow rx={84} />
      <g style={anim(c, "db-tail-wag", "84px 50px")}>
        <path d="M84 50 L-4 50" stroke={pal.dark} strokeWidth="3.4" strokeLinecap="round" />
        <path
          d="M84 50 L-4 50"
          stroke={pal.body}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity=".6"
        />
      </g>
      <g style={anim(c, "db-fin-flutter", "150px 50px")}>
        <path d={wings} fill={`url(#${uid}-s)`} stroke={pal.dark} strokeWidth="2" />
        <g clipPath={`url(#${uid}-clip)`}>
          {[
            [120, 22],
            [132, 36],
            [120, 78],
            [132, 64],
            [150, 50],
            [108, 50],
            [170, 44],
            [170, 56],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={2.4 + (i % 3)}
              fill={pal.belly ?? "#f8fafc"}
              opacity=".8"
            />
          ))}
          <path
            d="M96 50 Q160 40 214 50"
            stroke="rgba(255,255,255,.22)"
            strokeWidth="10"
            fill="none"
          />
        </g>
      </g>
      <path
        d="M208 42 C218 36 224 34 230 30 M208 58 C218 64 224 66 230 70"
        stroke={pal.dark}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <Eye x={198} y={38} r={3.2} />
      <Eye x={198} y={62} r={3.2} />
    </g>
  );
}

/* ---------------------------------------------------------------- TURTLE */
function Turtle({ c }: { c: Ctx }) {
  const { pal, o, uid } = c;
  const hexes = [
    [118, 50],
    [96, 38],
    [96, 62],
    [140, 38],
    [140, 62],
    [74, 50],
    [162, 50],
    [118, 22],
    [118, 78],
  ];
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-sh`} cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor={pal.body} />
          <stop offset="60%" stopColor={pal.mid} />
          <stop offset="100%" stopColor={pal.dark} />
        </radialGradient>
      </defs>
      <Shadow rx={74} />
      <g style={anim(c, "db-fin-flutter", "150px 50px")}>
        <path
          d="M150 30 C132 6 100 -2 84 6 C98 18 120 34 140 42 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.6"
        />
        <path
          d="M150 70 C132 94 100 102 84 94 C98 82 120 66 140 58 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.6"
        />
      </g>
      <g style={anim(c, "db-fin-flutter", "70px 50px", "reverse")}>
        <path
          d="M66 36 C50 22 32 20 24 28 C36 38 50 44 62 46 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.4"
        />
        <path
          d="M66 64 C50 78 32 80 24 72 C36 62 50 56 62 54 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.4"
        />
      </g>
      <path d="M62 50 L36 50 L46 46 Z" fill={pal.fin} stroke={pal.dark} strokeWidth="1.2" />
      {/* head */}
      <g style={anim(c, "db-body-undulate", "170px 50px")}>
        <ellipse
          cx="184"
          cy="50"
          rx="24"
          ry="17"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.8"
        />
        <Eye x={194} y={42} r={3.6} />
        <Eye x={194} y={58} r={3.6} />
      </g>
      {/* shell */}
      <ellipse
        cx="118"
        cy="50"
        rx="58"
        ry="40"
        fill={`url(#${uid}-sh)`}
        stroke={pal.dark}
        strokeWidth="2.6"
      />
      <ellipse
        cx="118"
        cy="50"
        rx="50"
        ry="33"
        fill="none"
        stroke={pal.dark}
        strokeWidth="1.6"
        opacity=".55"
      />
      {hexes.map(([x, y], i) => (
        <polygon
          key={i}
          points={`${x - 13},${y} ${x - 6.5},${y - 11} ${x + 6.5},${y - 11} ${x + 13},${y} ${x + 6.5},${y + 11} ${x - 6.5},${y + 11}`}
          fill="rgba(255,255,255,.1)"
          stroke={pal.dark}
          strokeWidth="1.5"
          opacity=".85"
        />
      ))}
      <ellipse cx="108" cy="30" rx="30" ry="6" fill="rgba(255,255,255,.22)" />
      {o.barnacles && (
        <g fill="#e5e7eb" stroke={pal.dark} strokeWidth="1">
          {[
            [84, 40],
            [150, 66],
            [128, 28],
            [100, 70],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3.6} />
          ))}
          <path d="M130 78 q4 -12 8 0 q4 -12 8 0" stroke="#34d399" strokeWidth="3" fill="none" />
        </g>
      )}
      {o.glowEyes && <circle cx="118" cy="50" r="10" fill={pal.glow} opacity=".55" />}
    </g>
  );
}

/* ------------------------------------------------------------------ CRAB */
function Crab({ c }: { c: Ctx }) {
  const { pal, o, uid } = c;
  const lobster = !!o.lobster;
  const shell = lobster
    ? "M60 50 C70 36 110 32 150 36 C176 38 190 44 194 50 C190 56 176 62 150 64 C110 68 70 64 60 50 Z"
    : "M62 50 C66 22 108 14 140 20 C168 26 178 38 178 50 C178 62 168 74 140 80 C108 86 66 78 62 50 Z";
  const legY = lobster ? [38, 46, 54, 62] : [26, 40, 60, 74];
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-sh`} cx="45%" cy="40%" r="75%">
          <stop offset="0%" stopColor={pal.body} />
          <stop offset="60%" stopColor={pal.mid} />
          <stop offset="100%" stopColor={pal.dark} />
        </radialGradient>
      </defs>
      <Shadow rx={80} />
      {lobster && (
        <g style={anim(c, "db-tail-wag", "70px 50px")}>
          <path
            d="M70 50 L30 40 L6 28 C12 40 12 60 6 72 L30 60 Z"
            fill={pal.mid}
            stroke={pal.dark}
            strokeWidth="1.6"
          />
          {[56, 44, 32].map((x) => (
            <path
              key={x}
              d={`M${x} 40 Q${x - 4} 50 ${x} 60`}
              stroke={pal.dark}
              strokeWidth="1.4"
              fill="none"
            />
          ))}
        </g>
      )}
      {/* walking legs */}
      <g
        style={anim(c, "db-fin-flutter", "116px 50px")}
        stroke={pal.dark}
        strokeWidth="1.2"
        fill={pal.fin}
      >
        {legY.map((y, i) => {
          const up = y < 50;
          const reach = o.longLegs ? 44 : 26;
          const x0 = 90 + i * 9;
          return (
            <path
              key={i}
              d={`M${x0} ${up ? 34 : 66} L${x0 - 6} ${up ? 34 - reach * 0.6 : 66 + reach * 0.6} L${x0 + 14} ${up ? 34 - reach : 66 + reach}`}
              fill="none"
              stroke={pal.fin}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </g>
      {/* claws */}
      <g style={anim(c, "db-tail-wag", "150px 50px")}>
        {[-1, 1].map((s) => {
          const y = 50 + s * 26;
          return (
            <g key={s}>
              <path
                d={`M150 ${50 + s * 20} Q176 ${y + s * 4} 188 ${y}`}
                stroke={pal.fin}
                strokeWidth="9"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d={`M184 ${y} C196 ${y - 12 * s} 220 ${y - 8 * s} 226 ${y} C214 ${y + 2 * s} 206 ${y + 6 * s} 196 ${y + 8 * s} C190 ${y + 6 * s} 184 ${y + 4 * s} 184 ${y} Z`}
                fill={pal.mid}
                stroke={pal.dark}
                strokeWidth="1.8"
              />
              <path
                d={`M188 ${y + 1 * s} Q206 ${y - 2 * s} 224 ${y}`}
                stroke={pal.dark}
                strokeWidth="1.4"
                fill="none"
              />
            </g>
          );
        })}
      </g>
      {lobster && (
        <g stroke={pal.fin} strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M194 46 C210 40 230 20 250 8" />
          <path d="M194 54 C210 60 230 80 250 92" />
        </g>
      )}
      {/* carapace */}
      <path d={shell} fill={`url(#${uid}-sh)`} stroke={pal.dark} strokeWidth="2.4" />
      <path
        d="M92 36 Q118 28 150 36 M92 64 Q118 72 150 64 M116 28 Q112 50 116 72"
        stroke={pal.dark}
        strokeWidth="1.4"
        fill="none"
        opacity=".5"
      />
      {o.spiky &&
        [78, 96, 114, 132, 150].flatMap((x) => [
          <path
            key={`u${x}`}
            d={`M${x} 24 l4 -10 l4 10 Z`}
            fill={pal.accent}
            stroke={pal.dark}
            strokeWidth="1"
          />,
          <path
            key={`d${x}`}
            d={`M${x} 76 l4 10 l4 -10 Z`}
            fill={pal.accent}
            stroke={pal.dark}
            strokeWidth="1"
          />,
        ])}
      {o.barnacles && (
        <g fill="#e2e8f0" stroke={pal.dark} strokeWidth="1">
          {[
            [100, 40],
            [128, 60],
            [140, 36],
            [112, 62],
            [90, 56],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.4" />
          ))}
        </g>
      )}
      <ellipse cx="116" cy="34" rx="30" ry="5" fill="rgba(255,255,255,.25)" />
      {/* stalk eyes */}
      <path
        d="M160 40 L168 34 M160 60 L168 66"
        stroke={pal.dark}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Eye x={170} y={33} r={4.4} glow={o.glowEyes ? "#f97316" : undefined} />
      <Eye x={170} y={67} r={4.4} glow={o.glowEyes ? "#f97316" : undefined} />
    </g>
  );
}

/* --------------------------------------------------------------- OCTOPUS */
function Octopus({ c }: { c: Ctx }) {
  const { pal, o, uid } = c;
  const n = o.arms ?? 8;
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-sh`} cx="55%" cy="40%" r="75%">
          <stop offset="0%" stopColor={pal.body} />
          <stop offset="55%" stopColor={pal.mid} />
          <stop offset="100%" stopColor={pal.dark} />
        </radialGradient>
      </defs>
      <Shadow rx={84} />
      {Array.from({ length: n }).map((_, i) => {
        const f = (i / (n - 1)) * 2 - 1; // -1..1
        const y0 = 50 + f * 22;
        const yEnd = 50 + f * 46;
        const sway = (i % 2 ? 1 : -1) * 16;
        return (
          <g key={i} style={anim(c, "db-tail-wag", "130px 50px", i % 2 ? "reverse" : "")}>
            <path
              d={`M138 ${y0} C108 ${y0 + sway} 80 ${yEnd - sway} 40 ${yEnd} C28 ${yEnd + sway * 0.4} 14 ${yEnd - sway * 0.4} 4 ${yEnd + f * 4}`}
              stroke={pal.mid}
              strokeWidth={o.spiky ? 11 : 9}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={`M138 ${y0} C108 ${y0 + sway} 80 ${yEnd - sway} 40 ${yEnd} C28 ${yEnd + sway * 0.4} 14 ${yEnd - sway * 0.4} 4 ${yEnd + f * 4}`}
              stroke={pal.accent}
              strokeWidth="2.4"
              strokeDasharray="1 7"
              strokeLinecap="round"
              fill="none"
              opacity=".85"
            />
          </g>
        );
      })}
      <ellipse
        cx="156"
        cy="50"
        rx="44"
        ry="34"
        fill={`url(#${uid}-sh)`}
        stroke={pal.dark}
        strokeWidth="2.4"
      />
      {o.rings &&
        [
          [140, 38],
          [160, 30],
          [172, 50],
          [160, 70],
          [140, 62],
          [150, 50],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="6" fill="none" stroke="#22d3ee" strokeWidth="2.4" />
            <circle cx={x} cy={y} r="2.6" fill="#0ea5e9" />
          </g>
        ))}
      {o.spiky && (
        <g fill={pal.accent} stroke={pal.dark} strokeWidth="1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M${130 + i * 10} ${20 + (i % 2) * 4} l4 -12 l4 12 Z`} />
          ))}
        </g>
      )}
      <ellipse cx="148" cy="32" rx="28" ry="6" fill="rgba(255,255,255,.28)" />
      <Eye x={180} y={38} r={5.4} glow={o.glowEyes ? "#fb7185" : undefined} />
      <Eye x={180} y={62} r={5.4} glow={o.glowEyes ? "#fb7185" : undefined} />
      {o.glowEyes && <circle cx="156" cy="50" r="30" fill={pal.glow} opacity=".25" />}
    </g>
  );
}

/* ----------------------------------------------------------------- SQUID */
function Squid({ c }: { c: Ctx }) {
  const { pal, uid } = c;
  return (
    <g>
      <defs>
        <Shade c={c} id="s" />
      </defs>
      <Shadow />
      <g style={anim(c, "db-fin-flutter", "70px 50px")}>
        <path
          d="M110 50 L58 14 C46 32 46 68 58 86 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.6"
          opacity=".95"
        />
      </g>
      <path
        d="M40 50 C60 36 110 30 150 36 C168 38 176 44 178 50 C176 56 168 62 150 64 C110 70 60 64 40 50 Z"
        fill={`url(#${uid}-s)`}
        stroke={pal.dark}
        strokeWidth="2.2"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} style={anim(c, "db-tail-wag", "178px 50px", i % 2 ? "reverse" : "")}>
          <path
            d={`M176 ${40 + i * 5} C196 ${34 + i * 8} 214 ${36 + i * 7} 232 ${44 + i * 3}`}
            stroke={pal.mid}
            strokeWidth={i === 2 ? 4 : 5.4}
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ))}
      <path d="M60 50 Q120 46 176 50" stroke="rgba(255,255,255,.22)" strokeWidth="8" fill="none" />
      <Eye x={166} y={39} r={4.4} />
      <Eye x={166} y={61} r={4.4} />
    </g>
  );
}

/* ----------------------------------------------------------------- JELLY */
function Jelly({ c }: { c: Ctx }) {
  const { pal, uid } = c;
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-sh`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".7" />
          <stop offset="55%" stopColor={pal.body} stopOpacity=".6" />
          <stop offset="100%" stopColor={pal.mid} stopOpacity=".8" />
        </radialGradient>
      </defs>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i} style={anim(c, "db-tail-wag", "120px 50px", i % 2 ? "reverse" : "")}>
          <path
            d={`M116 ${34 + i * 5.4} C92 ${30 + i * 6.6} 64 ${40 + i * 3.6} 8 ${22 + i * 9.4}`}
            stroke={pal.fin}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
            opacity=".85"
          />
        </g>
      ))}
      <g style={anim(c, "db-fin-flutter", "130px 50px")}>
        <circle cx="130" cy="50" r="42" fill={`url(#${uid}-sh)`} stroke={pal.mid} strokeWidth="2" />
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <line
              key={i}
              x1="130"
              y1="50"
              x2={130 + Math.cos(a) * 40}
              y2={50 + Math.sin(a) * 40}
              stroke={pal.dark}
              strokeWidth="1"
              opacity=".3"
            />
          );
        })}
        <circle cx="130" cy="50" r="14" fill={pal.accent} opacity=".55" />
        <circle cx="130" cy="50" r="7" fill="#fff" opacity=".6" />
        <ellipse cx="118" cy="32" rx="18" ry="6" fill="#fff" opacity=".5" />
      </g>
      <circle cx="130" cy="50" r="52" fill={pal.glow} opacity=".16" />
    </g>
  );
}

/* ----------------------------------------------------------------- WHALE */
function Whale({ c }: { c: Ctx }) {
  const { pal, o, uid } = c;
  const body =
    "M20 50 C50 38 86 30 132 28 C176 26 208 38 214 50 C208 62 176 74 132 72 C86 70 50 62 20 50 Z";
  return (
    <g>
      <defs>
        <Shade c={c} id="s" />
        <clipPath id={`${uid}-clip`}>
          <path d={body} />
        </clipPath>
      </defs>
      <Shadow rx={92} />
      <g style={anim(c, "db-tail-wag", "30px 50px")}>
        <path
          d="M34 50 C26 46 10 40 -4 22 C6 22 14 28 20 32 C16 36 14 44 14 50 C14 56 16 64 20 68 C14 72 6 78 -4 78 C10 60 26 54 34 50 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.8"
        />
      </g>
      <g style={anim(c, "db-fin-flutter", "132px 50px")}>
        <path
          d="M140 30 C124 10 104 8 92 14 C104 24 124 32 136 38 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.6"
        />
        <path
          d="M140 70 C124 90 104 92 92 86 C104 76 124 68 136 62 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.6"
        />
      </g>
      <path d={body} fill={`url(#${uid}-s)`} stroke={pal.dark} strokeWidth="2.2" />
      <g clipPath={`url(#${uid}-clip)`}>
        {o.orca && (
          <>
            <path
              d="M90 50 C110 42 140 46 150 50 C140 54 110 58 90 50 Z"
              fill="#f8fafc"
              opacity=".92"
            />
            <ellipse
              cx="180"
              cy="38"
              rx="10"
              ry="4.5"
              fill="#f8fafc"
              transform="rotate(20 180 38)"
            />
            <ellipse
              cx="180"
              cy="62"
              rx="10"
              ry="4.5"
              fill="#f8fafc"
              transform="rotate(-20 180 62)"
            />
          </>
        )}
        {o.pattern === "spots" &&
          [
            [70, 42],
            [96, 58],
            [122, 40],
            [150, 56],
            [176, 44],
            [60, 56],
            [110, 50],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="6" ry="3.4" fill={pal.accent} opacity=".5" />
          ))}
        <path
          d="M30 50 Q120 46 214 50"
          stroke="rgba(255,255,255,.2)"
          strokeWidth="10"
          fill="none"
        />
        <path d="M40 50 L190 50" stroke={pal.dark} strokeWidth="1.6" opacity=".3" />
      </g>
      <circle cx="158" cy="50" r="2.6" fill={pal.dark} opacity=".8" />
      {o.tusk && (
        <path d="M212 50 L262 50" stroke="#f1f5f9" strokeWidth="4.4" strokeLinecap="round" />
      )}
      {o.glowEyes && (
        <ellipse
          cx="124"
          cy="50"
          rx="70"
          ry="22"
          fill="none"
          stroke={pal.glow}
          strokeWidth="3"
          opacity=".6"
        />
      )}
      <Eye x={188} y={38} r={3.4} />
      <Eye x={188} y={62} r={3.4} />
    </g>
  );
}

/* ---------------------------------------------------------------- DRAGON */
function Dragon({ c }: { c: Ctx }) {
  const { pal, uid } = c;
  const path = "M8 66 C44 20 86 92 126 54 C156 26 180 56 198 50";
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={pal.dark} />
          <stop offset="60%" stopColor={pal.mid} />
          <stop offset="100%" stopColor={pal.body} />
        </linearGradient>
      </defs>
      <Shadow rx={86} />
      <g style={anim(c, "db-body-undulate", "100px 50px")}>
        <path d={path} stroke={pal.dark} strokeWidth="38" strokeLinecap="round" fill="none" />
        <path
          d={path}
          stroke={`url(#${uid}-g)`}
          strokeWidth="32"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={path}
          stroke={pal.belly ?? "#fde68a"}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          opacity=".55"
        />
        <path
          d={path}
          stroke={pal.dark}
          strokeWidth="32"
          strokeDasharray="2 10"
          strokeLinecap="butt"
          fill="none"
          opacity=".3"
        />
        <path
          d={path}
          stroke={pal.accent}
          strokeWidth="3"
          strokeDasharray="10 8"
          fill="none"
          opacity=".9"
          transform="translate(0 -14)"
        />
      </g>
      <g style={anim(c, "db-fin-flutter", "110px 50px")}>
        <path
          d="M120 40 C110 14 92 6 80 12 C90 22 100 32 112 44 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.4"
          opacity=".95"
        />
        <path
          d="M120 66 C110 92 92 98 80 90 C90 80 100 72 112 64 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.4"
          opacity=".95"
        />
      </g>
      <g style={anim(c, "db-tail-wag", "10px 66px")}>
        <path
          d="M14 64 C-6 56 -10 76 -4 90 C8 84 18 76 20 68 Z"
          fill={pal.fin}
          stroke={pal.dark}
          strokeWidth="1.4"
        />
      </g>
      {/* head */}
      <path
        d="M180 40 C196 34 218 40 226 50 C218 60 196 66 180 60 Z"
        fill={pal.mid}
        stroke={pal.dark}
        strokeWidth="2"
      />
      <path
        d="M190 38 L180 14 L200 34 M198 40 L196 12 L208 38"
        fill={pal.accent}
        stroke={pal.dark}
        strokeWidth="1.4"
      />
      <path
        d="M190 62 L180 86 L200 66 M198 60 L196 88 L208 62"
        fill={pal.accent}
        stroke={pal.dark}
        strokeWidth="1.4"
      />
      <g stroke={pal.accent} strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M222 44 C236 34 250 36 260 28" />
        <path d="M222 56 C236 66 250 64 260 72" />
      </g>
      <Eye x={206} y={43} r={3.6} glow="#fde047" />
      <Eye x={206} y={57} r={3.6} glow="#fde047" />
    </g>
  );
}

/* ----------------------------------------------------------------- CRATE */
function Crate({
  pal,
  uid,
  frozen,
  delay,
  treasure,
}: {
  pal: Pal;
  uid: string;
  frozen: boolean;
  delay: string;
  treasure?: Spec["treasure"];
}) {
  if (treasure) {
    return (
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full"
        aria-hidden
        style={
          frozen ? undefined : { animation: `db-crate-bob 1.8s ease-in-out ${delay} infinite` }
        }
      >
        <defs>
          <radialGradient id={`${uid}-treasure`}>
            <stop stopColor={pal.belly ?? pal.accent} />
            <stop offset="1" stopColor={pal.dark} />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="101" rx="36" ry="8" fill="#0006" />
        <g
          fill={`url(#${uid}-treasure)`}
          stroke={pal.accent}
          strokeWidth="3"
          strokeLinejoin="round"
        >
          {treasure === "lure" && (
            <>
              <path d="M28 28 Q60 10 92 28 L86 86 Q60 102 34 86 Z" />
              <path
                d="M60 35 C90 50 80 76 60 70 L46 80 L50 64 C32 54 40 36 60 35Z"
                fill={pal.fin}
              />
              <circle cx="64" cy="46" r="3" fill={pal.dark} />
            </>
          )}
          {treasure === "pearl" && (
            <>
              <path d="M20 86 L30 64 L90 64 L100 86 L88 98 H32 Z" />
              <circle cx="60" cy="49" r="29" />
              <path d="M40 43 Q47 27 63 28" fill="none" stroke="#fff9" strokeWidth="5" />
              <path d="M25 83 Q60 66 95 83" fill="none" />
            </>
          )}
          {treasure === "coral" && (
            <>
              <path d="M26 96 V54 L14 36 L22 23 L36 46 L45 28 L51 34 L43 62 L51 87 H70 L76 58 L64 39 L70 27 L85 44 L97 22 L105 29 L92 61 L91 96 Z" />
              <path d="M43 91 L54 57 L74 72 L70 94Z" fill={pal.fin} />
            </>
          )}
          {treasure === "anchor" && (
            <>
              <path d="M54 35 H66 V77 Q85 76 89 61 L78 65 L91 45 L106 64 L98 62 Q91 98 60 101 Q29 98 22 62 L14 64 L29 45 L42 65 L31 61 Q35 76 54 77 Z" />
              <circle cx="60" cy="25" r="13" fill="none" />
              <path d="M39 47 H81" fill="none" strokeWidth="8" />
            </>
          )}
          {treasure === "shell" && (
            <>
              <path d="M60 98 C33 78 10 56 20 35 Q31 20 43 31 Q60 10 77 31 Q95 20 103 39 C110 60 87 84 60 98Z" />
              <path d="M60 92 L30 39 M60 92 L47 33 M60 92 L65 29 M60 92 L87 39" fill="none" />
              <circle cx="60" cy="78" r="14" fill={pal.belly ?? "#fff2cc"} />
            </>
          )}
          {treasure === "ice" && (
            <>
              <path d="M27 80 L22 35 L47 17 L82 22 L102 47 L89 88 L59 103Z" />
              <path
                d="M22 35 L60 51 L82 22 M60 51 L59 103 M60 51 L102 47 M27 80 L60 51"
                fill="none"
              />
              <path d="M48 44 L66 35 L76 57 L59 76 L45 63Z" fill={pal.fin} />
            </>
          )}
        </g>
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-full w-full"
      aria-hidden
      style={frozen ? undefined : { animation: `db-crate-bob 1.8s ease-in-out ${delay} infinite` }}
    >
      <defs>
        <linearGradient id={`${uid}-w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="55%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <radialGradient id={`${uid}-gl`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={pal.glow} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="58" r="56" fill={`url(#${uid}-gl)`} opacity=".7" />
      <ellipse cx="60" cy="102" rx="38" ry="9" fill="rgba(0,0,0,.4)" />
      <rect
        x="24"
        y="44"
        width="72"
        height="50"
        rx="8"
        fill={`url(#${uid}-w)`}
        stroke="#1c0a02"
        strokeWidth="2.4"
      />
      <path d="M24 56 H96 M24 76 H96" stroke="#451a03" strokeWidth="1.6" opacity=".6" />
      <path d="M24 44 C24 22 96 22 96 44 Z" fill="#b45309" stroke="#1c0a02" strokeWidth="2.4" />
      <path
        d="M32 40 C40 28 80 28 88 40"
        stroke="#fde68a"
        strokeWidth="2"
        fill="none"
        opacity=".55"
      />
      {[36, 84].map((x) => (
        <rect
          key={x}
          x={x - 4}
          y="26"
          width="8"
          height="68"
          rx="2"
          fill={pal.accent}
          stroke="#1c0a02"
          strokeWidth="1.4"
          opacity=".92"
        />
      ))}
      <rect
        x="50"
        y="52"
        width="20"
        height="22"
        rx="5"
        fill="#fde047"
        stroke="#854d0e"
        strokeWidth="2"
      />
      <circle cx="60" cy="60" r="3.4" fill="#854d0e" />
      <rect x="58.4" y="62" width="3.2" height="7" rx="1" fill="#854d0e" />
      <g fill="#fde047" opacity=".95">
        <path d="M18 30 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 Z" />
        <path d="M94 24 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 Z" />
      </g>
    </svg>
  );
}

const RENDER: Record<Kind, (c: Ctx) => ReactNode> = {
  fish: (c) => <Fish c={c} />,
  shark: (c) => <Shark c={c} />,
  ray: (c) => <Ray c={c} />,
  turtle: (c) => <Turtle c={c} />,
  crab: (c) => <Crab c={c} />,
  octopus: (c) => <Octopus c={c} />,
  squid: (c) => <Squid c={c} />,
  jelly: (c) => <Jelly c={c} />,
  whale: (c) => <Whale c={c} />,
  dragon: (c) => <Dragon c={c} />,
};

type Props = {
  tierId: TierKey;
  spec: Spec;
  crate: Pal;
  size?: number;
  flipped?: boolean;
  hitFlash?: boolean;
  frozen?: boolean;
  className?: string;
  animSeed?: number;
};

export function FaunaFish({
  tierId,
  spec,
  crate,
  size = 110,
  flipped = false,
  hitFlash = false,
  frozen = false,
  className,
  animSeed = 0,
}: Props) {
  const rid = useId().replace(/:/g, "");
  const uid = `fa-${rid}`;
  const isCrate = tierId === "crate";
  const pal = isCrate ? crate : spec.pal;
  const w = Math.round(size * (isCrate ? 1.05 : 1.7 * (spec.aspect ?? 1)));
  const h = Math.round(size * (isCrate ? 1.05 : 0.78));
  const delay = `${(animSeed % 17) * 0.09}s`;
  const dur = frozen
    ? "0s"
    : tierId === "boss"
      ? "1.25s"
      : tierId === "elite" || tierId === "super"
        ? "0.95s"
        : "0.75s";

  if (isCrate) {
    return (
      <div
        className={cn("relative select-none will-change-transform", className)}
        style={{
          width: w,
          height: h,
          filter: hitFlash
            ? `drop-shadow(0 0 16px ${pal.glow})`
            : "drop-shadow(0 8px 14px rgba(0,0,0,0.55))",
        }}
      >
        <Crate pal={pal} uid={uid} frozen={frozen} delay={delay} treasure={spec.treasure} />
      </div>
    );
  }

  const ctx: Ctx = { pal, uid, o: spec.o ?? {}, frozen, dur, delay };
  return (
    <div
      className={cn(
        "relative select-none will-change-transform",
        hitFlash && "brightness-125 contrast-110",
        frozen && "opacity-85 saturate-50",
        className,
      )}
      style={{
        width: w,
        height: h,
        transform: flipped ? "scaleX(-1)" : undefined,
        filter: hitFlash
          ? `drop-shadow(0 0 18px ${pal.glow})`
          : frozen
            ? "drop-shadow(0 0 10px #7DD3FC)"
            : tierId === "boss"
              ? `drop-shadow(0 0 14px ${pal.glow}) drop-shadow(0 12px 18px rgba(0,0,0,0.55))`
              : "drop-shadow(0 10px 14px rgba(0,0,0,0.55))",
      }}
    >
      <div
        className="h-full w-full"
        style={
          frozen
            ? undefined
            : {
                animation: `db-body-undulate ${dur} ease-in-out ${delay} infinite`,
                transformOrigin: "42% 50%",
              }
        }
      >
        <svg viewBox="0 0 220 100" className="h-full w-full overflow-visible" aria-hidden>
          {RENDER[spec.kind](ctx)}
          {tierId === "boss" && (
            <ellipse
              cx="118"
              cy="50"
              rx="104"
              ry="46"
              fill="none"
              stroke={pal.glow}
              strokeWidth="2.4"
              opacity=".5"
            >
              <animate
                attributeName="opacity"
                values=".6;.15;.6"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </ellipse>
          )}
        </svg>
      </div>
      {frozen ? (
        <span className="pointer-events-none absolute inset-0 rounded-full bg-sky-300/15" />
      ) : null}
    </div>
  );
}
