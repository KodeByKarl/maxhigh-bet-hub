import { cn } from "@/lib/utils";

/** Casino chip colourways by denomination (standard house colours). */
const CHIP_SKIN: Record<
  number,
  { body: string; dark: string; edge: string; ink: string }
> = {
  1: { body: "#f4f1ea", dark: "#b9b2a4", edge: "#8e8578", ink: "#2a2620" },
  5: { body: "#c8102e", dark: "#7d0a1d", edge: "#ffffff", ink: "#fff5f5" },
  10: { body: "#1d4ed8", dark: "#132f80", edge: "#ffffff", ink: "#eef4ff" },
  20: { body: "#0f766e", dark: "#09453f", edge: "#ffffff", ink: "#eafffb" },
  25: { body: "#0f8a3c", dark: "#075223", edge: "#ffffff", ink: "#f0fff5" },
  50: { body: "#ea580c", dark: "#8a3208", edge: "#ffffff", ink: "#fff6ef" },
  100: { body: "#17181c", dark: "#000000", edge: "#e8c96a", ink: "#f7ecd0" },
  200: { body: "#be185d", dark: "#6e0d36", edge: "#ffffff", ink: "#fff0f7" },
  500: { body: "#6d28d9", dark: "#3d1580", edge: "#e8c96a", ink: "#f5efff" },
  1000: { body: "#a16207", dark: "#5c3804", edge: "#fff3c4", ink: "#fffaf0" },
};

const FALLBACK_SKIN = { body: "#334155", dark: "#1e293b", edge: "#e2e8f0", ink: "#f8fafc" };

function skinFor(value: number) {
  if (CHIP_SKIN[value]) return CHIP_SKIN[value]!;
  const keys = Object.keys(CHIP_SKIN)
    .map(Number)
    .sort((a, b) => a - b);
  let best = keys[0]!;
  for (const k of keys) if (k <= value) best = k;
  return CHIP_SKIN[best] ?? FALLBACK_SKIN;
}

function chipLabel(value: number): string {
  if (value >= 1000) return `${value / 1000}K`;
  return String(value);
}

type ChipProps = {
  value: number;
  /** Pixel diameter. */
  size?: number;
  selected?: boolean;
  className?: string;
};

/**
 * Single casino chip: clay body, edge spots, inlay ring, denomination.
 */
export function Chip({ value, size = 40, selected, className }: ChipProps) {
  const skin = skinFor(value);
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center rounded-full", className)}
      style={{ width: size, height: size }}
    >
      {/* clay body */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 26%, ${skin.body} 0%, ${skin.body} 45%, ${skin.dark} 100%)`,
          boxShadow: `inset 0 -${Math.max(1, size * 0.05)}px ${size * 0.12}px rgba(0,0,0,0.55), 0 ${size * 0.05}px ${size * 0.14}px rgba(0,0,0,0.45)`,
        }}
      />
      {/* edge spots */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `repeating-conic-gradient(${skin.edge} 0deg 13deg, transparent 13deg 45deg)`,
          WebkitMaskImage:
            "radial-gradient(circle, transparent 0 62%, #000 63% 92%, transparent 93%)",
          maskImage: "radial-gradient(circle, transparent 0 62%, #000 63% 92%, transparent 93%)",
          opacity: 0.92,
        }}
      />
      {/* inlay */}
      <span
        className="absolute rounded-full"
        style={{
          inset: size * 0.16,
          background: `radial-gradient(circle at 36% 28%, rgba(255,255,255,0.28), rgba(0,0,0,0.18) 70%), ${skin.dark}`,
          boxShadow: `inset 0 0 0 ${Math.max(1, size * 0.03)}px rgba(255,255,255,0.32)`,
        }}
      />
      <span
        className="relative z-[1] font-black tabular-nums leading-none"
        style={{
          color: skin.ink,
          fontSize: Math.max(8, size * 0.3),
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }}
      >
        {chipLabel(value)}
      </span>
      {selected ? (
        <span
          className="absolute rounded-full ring-2 ring-[#ffe9a8]"
          style={{ inset: -3, boxShadow: "0 0 14px rgba(255,214,110,0.65)" }}
        />
      ) : null}
    </span>
  );
}

const DENOMS = [1000, 500, 200, 100, 50, 25, 10, 5, 1];

/** Break an amount into chip denominations, largest first. */
export function decomposeChips(amount: number, maxChips = 6): number[] {
  let left = Math.max(0, Math.round(amount));
  const out: number[] = [];
  for (const d of DENOMS) {
    while (left >= d && out.length < maxChips) {
      out.push(d);
      left -= d;
    }
  }
  return out;
}

type StackProps = {
  amount: number;
  size?: number;
  maxChips?: number;
  className?: string;
};

/**
 * Physical stack of chips sitting on a felt betting spot.
 */
export function ChipStack({ amount, size = 34, maxChips = 5, className }: StackProps) {
  if (amount <= 0) return null;
  const chips = decomposeChips(amount, maxChips);
  const lift = Math.max(3, size * 0.16);

  return (
    <span
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size + lift * (chips.length - 1) }}
      aria-label={`₱${amount}`}
    >
      {chips.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className="absolute left-0"
          style={{ bottom: i * lift, zIndex: i }}
        >
          <Chip value={v} size={size} />
        </span>
      ))}
    </span>
  );
}
