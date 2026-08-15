import { useId } from "react";
import { cn } from "@/lib/utils";

/** High-contrast casino chip palette — dark ink on tinted faces for older-player readability. */
export const L9_CHIP_LOOK: Record<
  number,
  { rim: string; face: string; ink: string; dash: string }
> = {
  1: { rim: "#64748b", face: "#e2e8f0", ink: "#0f172a", dash: "#ffffff" },
  2: { rim: "#475569", face: "#cbd5e1", ink: "#0f172a", dash: "#ffffff" },
  5: { rim: "#be123c", face: "#fda4af", ink: "#4c0519", dash: "#ffffff" },
  10: { rim: "#0369a1", face: "#7dd3fc", ink: "#082f49", dash: "#ffffff" },
  20: { rim: "#0f766e", face: "#5eead4", ink: "#042f2e", dash: "#ffffff" },
  25: { rim: "#047857", face: "#6ee7b7", ink: "#022c22", dash: "#ffffff" },
  50: { rim: "#4d7c0f", face: "#bef264", ink: "#1a2e05", dash: "#ffffff" },
  100: { rim: "#6d28d9", face: "#c4b5fd", ink: "#2e1065", dash: "#ffffff" },
  200: { rim: "#c2410c", face: "#fdba74", ink: "#431407", dash: "#ffffff" },
  500: { rim: "#a16207", face: "#fde047", ink: "#1c1005", dash: "#fffbeb" },
};

function lookFor(value: number) {
  return L9_CHIP_LOOK[value] ?? L9_CHIP_LOOK[1]!;
}

type ChipFaceProps = {
  value: number;
  className?: string;
  size?: number;
};

/** Circular SVG chip — striped rim + bold center label. */
export function Lucky9ChipFace({ value, className, size = 56 }: ChipFaceProps) {
  const uid = useId().replace(/:/g, "");
  const look = lookFor(value);
  const gradId = `l9-chip-${uid}-${value}`;
  const label = value >= 1000 ? `${value / 1000}k` : String(value);
  const fontSize = label.length >= 3 ? size * 0.28 : size * 0.34;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)]", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="45%" stopColor={look.face} />
          <stop offset="100%" stopColor={look.rim} stopOpacity="0.9" />
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
        strokeWidth="1.8"
      />
      <circle cx="32" cy="32" r="16.5" fill="none" stroke={look.rim} strokeWidth="1.4" opacity="0.5" />
      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fill={look.ink}
        fontFamily="system-ui,Segoe UI,sans-serif"
        fontWeight="900"
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

/** Fat-finger chip button for Lucky 9 dock. */
export function Lucky9ChipButton({
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
        "relative grid size-[3.65rem] shrink-0 place-items-center rounded-full transition active:scale-90 disabled:opacity-40 short-h:size-[3.15rem]",
        selected && "scale-105",
        className,
      )}
    >
      <Lucky9ChipFace value={value} size={54} />
      {selected ? (
        <span className="pointer-events-none absolute inset-0 rounded-full ring-[3px] ring-[#e8c96a] ring-offset-2 ring-offset-[#041410]" />
      ) : null}
    </button>
  );
}
