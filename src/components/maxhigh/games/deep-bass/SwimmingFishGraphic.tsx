/**
 * Top-down animated fish graphic — boat camera looking DOWN at their BACKS.
 * Dorsal view only (not side profile).
 */
import { cn } from "@/lib/utils";

export type SwimFishTierId =
  | "common"
  | "uncommon"
  | "rare"
  | "elite"
  | "super"
  | "boss"
  | "crate";

const PALETTE: Record<
  SwimFishTierId,
  { body: string; mid: string; dark: string; fin: string; stripe?: string; glow: string }
> = {
  common: {
    body: "#C5CED8",
    mid: "#8B97A8",
    dark: "#5B6572",
    fin: "#6B7280",
    glow: "rgba(148,163,184,0.55)",
  },
  uncommon: {
    body: "#6EE7B7",
    mid: "#34D399",
    dark: "#047857",
    fin: "#065F46",
    glow: "rgba(52,211,153,0.5)",
  },
  rare: {
    body: "#7DD3FC",
    mid: "#0EA5E9",
    dark: "#0369A1",
    fin: "#0C4A6E",
    glow: "rgba(56,189,248,0.55)",
  },
  elite: {
    body: "#FCD34D",
    mid: "#F59E0B",
    dark: "#B45309",
    fin: "#78350F",
    stripe: "#1C1917",
    glow: "rgba(245,158,11,0.6)",
  },
  super: {
    body: "#E9D5FF",
    mid: "#A855F7",
    dark: "#6B21A8",
    fin: "#F0ABFC",
    stripe: "#FBBF24",
    glow: "rgba(192,132,252,0.85)",
  },
  boss: {
    body: "#334155",
    mid: "#0F766E",
    dark: "#0F172A",
    fin: "#F43F5E",
    stripe: "#2DD4BF",
    glow: "rgba(244,63,94,0.65)",
  },
  crate: {
    body: "#B45309",
    mid: "#F59E0B",
    dark: "#78350F",
    fin: "#FDE68A",
    glow: "rgba(253,230,138,0.7)",
  },
};

type Props = {
  tierId: SwimFishTierId;
  size?: number;
  /** true = swimming right→left */
  flipped?: boolean;
  hitFlash?: boolean;
  frozen?: boolean;
  className?: string;
  animSeed?: number;
};

export function SwimmingFishGraphic({
  tierId,
  size = 110,
  flipped = false,
  hitFlash = false,
  frozen = false,
  className,
  animSeed = 0,
}: Props) {
  const pal = PALETTE[tierId];
  // Top-down silhouette: longer than wide (head→tail along X)
  const w = Math.round(size * (tierId === "crate" ? 1.05 : 1.7));
  const h = Math.round(size * (tierId === "crate" ? 1.05 : 0.78));
  const delay = `${(animSeed % 17) * 0.09}s`;
  const dur = frozen
    ? "0s"
    : tierId === "boss"
      ? "1.05s"
      : tierId === "super"
        ? "0.95s"
        : tierId === "elite"
          ? "0.85s"
          : "0.7s";
  const uid = `db-${tierId}-${animSeed}`;

  if (tierId === "crate") {
    return (
      <div
        className={cn("relative select-none will-change-transform", className)}
        style={{
          width: w,
          height: h,
          filter: hitFlash
            ? `drop-shadow(0 0 14px ${pal.glow})`
            : `drop-shadow(0 8px 14px rgba(0,0,0,0.55))`,
          animation: frozen ? undefined : `db-crate-bob 1.8s ease-in-out ${delay} infinite`,
        }}
      >
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={`${uid}-wood`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="50%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="100" rx="36" ry="10" fill="rgba(0,0,0,0.35)" />
          <rect x="30" y="36" width="60" height="50" rx="8" fill={`url(#${uid}-wood)`} stroke="#FDE68A" strokeWidth="2" />
          <rect x="36" y="28" width="48" height="14" rx="4" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.5" />
          <circle cx="60" cy="58" r="9" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2" />
        </svg>
      </div>
    );
  }

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
          ? `drop-shadow(0 0 16px ${pal.glow})`
          : frozen
            ? "drop-shadow(0 0 10px #7DD3FC)"
            : `drop-shadow(0 12px 18px rgba(0,0,0,0.6))`,
      }}
    >
      <div
        className="h-full w-full"
        style={{
          animation: frozen
            ? undefined
            : `db-body-undulate ${dur} ease-in-out ${delay} infinite`,
          transformOrigin: "42% 50%",
        }}
      >
          {/* viewBox: head RIGHT, tail LEFT — true dorsal / back view from boat */}
          <svg viewBox="0 0 220 100" className="h-full w-full overflow-visible" aria-hidden>
            <defs>
              <radialGradient id={`${uid}-back`} cx="45%" cy="45%" r="65%">
                <stop offset="0%" stopColor={pal.body} />
                <stop offset="55%" stopColor={pal.mid} />
                <stop offset="100%" stopColor={pal.dark} />
              </radialGradient>
              <linearGradient id={`${uid}-ridge`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="40%" stopColor="rgba(255,255,255,0.45)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
              </linearGradient>
              <filter id={`${uid}-soft`} x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur stdDeviation="1.4" />
              </filter>
            </defs>

            {/* Shadow on seabed */}
            <ellipse
              cx="115"
              cy="78"
              rx="78"
              ry="12"
              fill="rgba(0,0,0,0.32)"
              filter={`url(#${uid}-soft)`}
            />

            {/* Tail lobes (seen from above) — wag left/right */}
            <g
              style={{
                transformOrigin: "42px 50px",
                animation: frozen
                  ? undefined
                  : `db-tail-wag ${dur} ease-in-out ${delay} infinite`,
              }}
            >
              <path
                d="M48 50 L6 28 L22 50 L6 72 Z"
                fill={pal.fin}
                stroke={pal.dark}
                strokeWidth="1.5"
              />
              <path d="M46 50 L18 38 L26 50 L18 62 Z" fill={pal.body} opacity="0.55" />
            </g>

            {/* Pectoral fins — stick out both sides (top-down signature) */}
            <g
              style={{
                transformOrigin: "100px 50px",
                animation: frozen
                  ? undefined
                  : `db-fin-flutter ${dur} ease-in-out ${delay} infinite`,
              }}
            >
              <ellipse
                cx="98"
                cy="22"
                rx="22"
                ry="9"
                fill={pal.fin}
                opacity="0.9"
                transform="rotate(-8 98 22)"
              />
              <ellipse
                cx="98"
                cy="78"
                rx="22"
                ry="9"
                fill={pal.fin}
                opacity="0.9"
                transform="rotate(8 98 78)"
              />
            </g>

            {/* Main body — BACK facing camera */}
            <ellipse
              cx="120"
              cy="50"
              rx="72"
              ry="28"
              fill={`url(#${uid}-back)`}
              stroke={pal.dark}
              strokeWidth="2"
            />

            {/* Spine / dorsal ridge highlight down the back */}
            <ellipse cx="118" cy="50" rx="58" ry="7" fill={`url(#${uid}-ridge)`} opacity="0.85" />
            <path
              d="M55 50 Q120 42 185 50"
              fill="none"
              stroke={pal.dark}
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.35"
            />

            {/* Dorsal fin — thin plate along the spine (seen as center strip from above) */}
            <path
              d="M85 50 L120 36 L155 50 L120 44 Z"
              fill={pal.fin}
              stroke={pal.dark}
              strokeWidth="1"
              opacity="0.95"
            />

            {/* Lateral stripes along the back */}
            {pal.stripe ? (
              <g opacity="0.9" stroke={pal.stripe} strokeLinecap="round" fill="none">
                <path d="M78 38 Q95 50 78 62" strokeWidth="5" />
                <path d="M102 34 Q118 50 102 66" strokeWidth="5" />
                <path d="M126 34 Q142 50 126 66" strokeWidth="5" />
                <path d="M150 38 Q162 50 150 62" strokeWidth="4" />
              </g>
            ) : null}

            {/* Head (still looking at top of head) */}
            <ellipse cx="178" cy="50" rx="26" ry="22" fill={pal.mid} stroke={pal.dark} strokeWidth="1.5" />
            <ellipse cx="186" cy="50" rx="12" ry="10" fill={pal.body} opacity="0.5" />

            {/* Eyes — only tips visible from above, on sides of head */}
            <ellipse cx="188" cy="38" rx="4" ry="3.2" fill="#0F172A" />
            <ellipse cx="188" cy="62" rx="4" ry="3.2" fill="#0F172A" />
            <circle cx="189" cy="37" r="1.2" fill="#F8FAFC" />
            <circle cx="189" cy="61" r="1.2" fill="#F8FAFC" />

            {tierId === "boss" || tierId === "super" ? (
              <ellipse
                cx="120"
                cy="50"
                rx="70"
                ry="26"
                fill="none"
                stroke={tierId === "super" ? "#E879F9" : "#2DD4BF"}
                strokeWidth="2"
                opacity="0.55"
              >
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.2s" repeatCount="indefinite" />
              </ellipse>
            ) : null}
          </svg>
      </div>

      {frozen ? (
        <span className="pointer-events-none absolute inset-0 rounded-full bg-sky-300/15" />
      ) : null}
    </div>
  );
}
