import { cn } from "@/lib/utils";
import { ChipStack } from "./ChipStack";

type Props = {
  label: string;
  sublabel?: string;
  amount: number;
  shape?: "circle" | "box";
  active?: boolean;
  armed?: boolean;
  disabled?: boolean;
  /** Settled credit returned on this spot. */
  win?: number;
  lost?: boolean;
  pushed?: boolean;
  tone?: "ante" | "play" | "pairplus";
  onClick?: () => void;
  onClear?: () => void;
};

const TONE = {
  ante: { ring: "#e8c96a", glow: "rgba(232,201,106,0.55)", text: "#f6e7bd" },
  play: { ring: "#f5f0e1", glow: "rgba(245,240,225,0.45)", text: "#f7f3e8" },
  pairplus: { ring: "#7dd3fc", glow: "rgba(125,211,252,0.5)", text: "#d9f1ff" },
} as const;

/**
 * Felt betting position — oversized labels/amounts for older-player readability.
 */
export function BetSpot({
  label,
  sublabel,
  amount,
  shape = "circle",
  active,
  armed,
  disabled,
  win = 0,
  lost,
  pushed,
  tone = "ante",
  onClick,
  onClear,
}: Props) {
  const t = TONE[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onContextMenu={(e) => {
        if (!onClear) return;
        e.preventDefault();
        onClear();
      }}
      aria-label={`${label} bet ₱${amount}`}
      aria-pressed={armed}
      className={cn(
        "group relative flex touch-manipulation flex-col items-center justify-center transition disabled:cursor-default",
        shape === "circle"
          ? "size-[clamp(4.5rem,20vw,6rem)] rounded-full short-h:size-[clamp(3.6rem,17vw,5rem)]"
          : "h-[clamp(3.25rem,13vw,4rem)] w-[clamp(5.75rem,28vw,8.5rem)] rounded-2xl short-h:h-[clamp(2.6rem,11vw,3.2rem)] short-h:w-[clamp(5rem,25vw,7.5rem)] short-h:rounded-xl",
        !disabled && "active:scale-[0.97]",
      )}
      style={{
        boxShadow: armed
          ? `0 0 0 3px ${t.ring}, 0 0 24px ${t.glow}`
          : `0 0 0 2px rgba(255,255,255,0.2)`,
        background:
          "radial-gradient(circle at 50% 35%, rgba(255,255,255,0.1), rgba(0,0,0,0.28) 78%)",
      }}
    >
      {/* printed inner ring */}
      <span
        className={cn(
          "pointer-events-none absolute",
          shape === "circle" ? "inset-[7%] rounded-full" : "inset-[8%] rounded-xl",
        )}
        style={{ border: `1.5px dashed ${t.ring}`, opacity: 0.6 }}
      />

      {win > 0 ? (
        <span
          className="pointer-events-none absolute -top-2.5 z-20 rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-black text-emerald-950 shadow-[0_2px_8px_rgba(16,185,129,0.6)] short-h:-top-2 short-h:px-1.5 short-h:py-[1px] short-h:text-[9px]"
          style={{ letterSpacing: "0.02em" }}
        >
          +₱{win.toFixed(0)}
        </span>
      ) : pushed ? (
        <span className="pointer-events-none absolute -top-2.5 z-20 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-black text-amber-950 short-h:-top-2 short-h:px-1.5 short-h:py-[1px] short-h:text-[9px]">
          PUSH
        </span>
      ) : lost && amount > 0 ? (
        <span className="pointer-events-none absolute -top-2.5 z-20 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white short-h:-top-2 short-h:px-1.5 short-h:py-[1px] short-h:text-[9px]">
          LOST
        </span>
      ) : null}

      <span
        className="pointer-events-none z-[1] text-center font-black uppercase leading-none"
        style={{
          color: t.text,
          fontSize: shape === "circle" ? "0.7rem" : "0.75rem",
          letterSpacing: "0.14em",
          fontFamily: "Georgia, 'Times New Roman', serif",
          textShadow: "0 1px 2px rgba(0,0,0,0.65)",
          opacity: amount > 0 ? 0.7 : 0.95,
        }}
      >
        {label}
      </span>
      {sublabel ? (
        <span
          className="pointer-events-none z-[1] mt-1 text-center text-[10px] font-semibold uppercase leading-none short-h:mt-[2px] short-h:text-[7px]"
          style={{ color: t.text, opacity: 0.55, letterSpacing: "0.08em" }}
        >
          {sublabel}
        </span>
      ) : null}

      {amount > 0 ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-1.5 z-[2] flex flex-col items-center short-h:bottom-1">
          <ChipStack amount={amount} size={shape === "circle" ? 30 : 26} maxChips={4} />
          <span className="mt-0.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-black tabular-nums text-[#f7e7bd] short-h:px-1.5 short-h:text-[9px]">
            ₱{amount.toFixed(0)}
          </span>
        </span>
      ) : null}

      {active ? (
        <span
          className={cn(
            "pointer-events-none absolute animate-pulse",
            shape === "circle" ? "inset-[-5px] rounded-full" : "inset-[-5px] rounded-2xl",
          )}
          style={{ boxShadow: `0 0 20px ${t.glow}` }}
        />
      ) : null}
    </button>
  );
}
