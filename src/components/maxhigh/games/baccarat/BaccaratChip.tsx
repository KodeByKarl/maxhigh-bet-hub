import { useId } from "react";
import { cn } from "@/lib/utils";

/** Per-denomination casino chip palette (Macau table — not Ace High amber). */
export const BC_CHIP_LOOK: Record<
  number,
  { rim: string; face: string; ink: string; dash: string }
> = {
  1: { rim: "#94a3b8", face: "#e2e8f0", ink: "#0f172a", dash: "#ffffff" },
  5: { rim: "#e11d48", face: "#fecdd3", ink: "#881337", dash: "#ffffff" },
  10: { rim: "#0284c7", face: "#bae6fd", ink: "#0c4a6e", dash: "#ffffff" },
  25: { rim: "#059669", face: "#a7f3d0", ink: "#064e3b", dash: "#ffffff" },
  100: { rim: "#7c3aed", face: "#ddd6fe", ink: "#4c1d95", dash: "#ffffff" },
  200: { rim: "#d97706", face: "#fde68a", ink: "#78350f", dash: "#fff7ed" },
  500: { rim: "#b45309", face: "#f5d78e", ink: "#1c1005", dash: "#fffbeb" },
};

function lookFor(value: number) {
  return BC_CHIP_LOOK[value] ?? BC_CHIP_LOOK[1]!;
}

type ChipFaceProps = {
  value: number;
  className?: string;
  size?: number;
};

/** SVG casino chip face — striped rim + inner disc. */
export function BaccaratChipFace({ value, className, size = 44 }: ChipFaceProps) {
  const uid = useId().replace(/:/g, "");
  const look = lookFor(value);
  const gradId = `bc-chip-${uid}-${value}`;
  const label = value >= 1000 ? `${value / 1000}k` : String(value);
  const fontSize = label.length >= 3 ? size * 0.26 : size * 0.32;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor={look.face} />
          <stop offset="100%" stopColor={look.rim} stopOpacity="0.85" />
        </radialGradient>
      </defs>

      <circle cx="32" cy="32" r="30" fill={look.rim} />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * 22.5 * Math.PI) / 180;
        const x1 = 32 + Math.cos(a) * 24.5;
        const y1 = 32 + Math.sin(a) * 24.5;
        const x2 = 32 + Math.cos(a) * 29.2;
        const y2 = 32 + Math.sin(a) * 29.2;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={look.dash}
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity={0.95}
          />
        );
      })}
      <circle
        cx="32"
        cy="32"
        r="21.5"
        fill={`url(#${gradId})`}
        stroke={look.dash}
        strokeWidth="1.6"
      />
      <circle cx="32" cy="32" r="16.5" fill="none" stroke={look.rim} strokeWidth="1.2" opacity="0.45" />
      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fill={look.ink}
        fontFamily="system-ui,Segoe UI,sans-serif"
        fontWeight="800"
        fontSize={fontSize}
      >
        {label}
      </text>
    </svg>
  );
}

type ChipButtonProps = {
  value: number;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

/** Interactive rail chip — fat-finger friendly for older players. */
export function BaccaratChipButton({
  value,
  disabled,
  selected,
  onClick,
  className,
}: ChipButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`Add ₱${value} chip`}
      aria-pressed={selected}
      className={cn(
        "relative grid size-14 shrink-0 place-items-center rounded-full transition active:scale-90 disabled:opacity-40 short-h:size-12 sm:size-[3.15rem]",
        selected && "scale-105",
        className,
      )}
    >
      <BaccaratChipFace value={value} size={52} />
      {selected ? (
        <span className="pointer-events-none absolute inset-0 rounded-full ring-[3px] ring-[#e8c96a] ring-offset-2 ring-offset-[#0a1524]" />
      ) : null}
    </button>
  );
}
