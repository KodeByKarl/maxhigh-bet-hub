import { memo } from "react";
import { clampBombMult } from "@/lib/golden-panther-config";
import { cn } from "@/lib/utils";
import type { SymKind } from "./types";
import { ICON_SRC } from "./paytable";

type PantherIconProps = {
  kind: SymKind;
  mult?: number;
  className?: string;
  showBombBadge?: boolean;
  /** Light win tint — keep cheap (no multi-layer drop-shadow stacks). */
  winLit?: boolean;
};

/**
 * Symbol glyph — memoized; `decoding="async"` avoids main-thread decode stalls
 * when many cells mount during a cascade.
 */
export const PantherIcon = memo(function PantherIcon({
  kind,
  mult,
  className,
  showBombBadge = true,
  winLit = false,
}: PantherIconProps) {
  const isScatter = kind === "lollipop";
  const isBomb = kind === "bomb";
  const src = ICON_SRC[kind] || "/images/symbols/gp/10.png?v=1";

  return (
    <div className={cn("relative grid place-items-center bg-transparent overflow-visible size-full select-none", className)}>
      {/* CSS-only win ring — GPU-friendly, no animated bloom / box-shadow layers */}
      {winLit && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[8%] z-0 rounded-full ring-2"
          style={{
            background: "var(--p-win-ring)",
            boxShadow: "0 0 0 2px color-mix(in srgb, var(--p-accent-soft) 80%, transparent)",
          }}
        />
      )}
      <img
        src={src}
        alt={kind}
        decoding="async"
        loading="eager"
        className={cn(
          "relative z-[1] size-full object-contain pointer-events-none",
          isScatter && !winLit && "scale-[1.06]",
          isBomb && !winLit && "scale-[1.06]",
          !winLit &&
            (kind === "heart" || kind === "purple" || kind === "green") &&
            "scale-[1.04]",
          winLit && "scale-[1.05] brightness-125 saturate-125",
        )}
        style={
          winLit
            ? { filter: "drop-shadow(0 0 8px var(--p-accent))" }
            : isScatter
              ? { filter: "drop-shadow(0 0 10px var(--p-accent))" }
              : isBomb
                ? { filter: "drop-shadow(0 0 10px var(--p-bomb-from))" }
                : kind === "heart" || kind === "purple" || kind === "green"
                  ? { filter: "drop-shadow(0 0 8px var(--p-accent))" }
                  : undefined
        }
      />
      {isScatter && (
        <span
          className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase shadow-sm whitespace-nowrap"
          style={{
            borderColor: "var(--p-accent-soft)",
            background:
              "linear-gradient(90deg, var(--p-scatter-from), var(--p-scatter-to), var(--p-scatter-from))",
            color: "var(--p-accent-deep)",
          }}
        >
          SCATTER
        </span>
      )}
      {isBomb && showBombBadge && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none z-[30]">
          <span
            className="rounded-full border-2 px-2 py-0.5 font-black text-[clamp(12px,2.4vw,18px)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
            style={{
              borderColor: "var(--p-bomb-border)",
              background:
                "linear-gradient(135deg, var(--p-bomb-from), var(--p-bomb-to))",
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
