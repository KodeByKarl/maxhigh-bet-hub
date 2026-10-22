import { memo } from "react";
import { clampBombMult, type RealmsSymKind } from "@/lib/realms/schema";
import { cn } from "@/lib/utils";

type SymbolIconProps = {
  kind: RealmsSymKind;
  src: string;
  label: string;
  mult?: number;
  className?: string;
  showBombBadge?: boolean;
  winLit?: boolean;
};

/** One symbol: generated art + scatter tag / multiplier badge. */
export const SymbolIcon = memo(function SymbolIcon({
  kind,
  src,
  label,
  mult,
  className,
  showBombBadge = true,
  winLit = false,
}: SymbolIconProps) {
  const isScatter = kind === "scatter";
  const isBomb = kind === "bomb";

  return (
    <div className={cn("relative grid size-full place-items-center select-none", className)}>
      {winLit && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[10%] z-0 rounded-xl"
          style={{
            background: "radial-gradient(circle at 50% 50%, var(--p-win-ring) 0%, transparent 70%)",
          }}
        />
      )}
      <img
        src={src}
        alt={label}
        decoding="async"
        loading="eager"
        draggable={false}
        className={cn(
          "pointer-events-none relative z-[1] h-full w-full object-contain p-[4%]",
          winLit && "brightness-125 saturate-125",
        )}
        style={{
          filter: winLit
            ? "drop-shadow(0 0 6px var(--p-accent))"
            : isScatter
              ? "drop-shadow(0 0 8px var(--p-accent))"
              : isBomb
                ? "drop-shadow(0 0 8px var(--p-bomb-from))"
                : "drop-shadow(0 2px 6px rgba(0,0,0,0.45))",
        }}
      />
      {isScatter && (
        <span
          className="absolute bottom-[4%] left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase shadow-sm sm:text-[8px]"
          style={{
            borderColor: "var(--p-accent-soft)",
            background:
              "linear-gradient(90deg, var(--p-scatter-from), var(--p-scatter-to), var(--p-scatter-from))",
            color: "var(--p-accent-deep)",
          }}
        >
          Scatter
        </span>
      )}
      {isBomb && showBombBadge && (
        <div className="pointer-events-none absolute inset-0 z-[30] grid place-items-center">
          <span
            className="rounded-full border-2 px-1.5 py-0.5 text-[clamp(10px,2vw,15px)] font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
            style={{
              borderColor: "var(--p-bomb-border)",
              background: "linear-gradient(135deg, var(--p-bomb-from), var(--p-bomb-to))",
              color: "var(--p-bomb-text)",
            }}
          >
            ×{clampBombMult(mult ?? 2)}
          </span>
        </div>
      )}
    </div>
  );
});
