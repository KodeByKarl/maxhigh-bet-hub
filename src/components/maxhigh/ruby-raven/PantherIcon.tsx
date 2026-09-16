import { memo } from "react";
import { clampBombMult } from "@/lib/ruby-raven-config";
import { cn } from "@/lib/utils";
import type { SymKind } from "./types";
import { ICON_SRC } from "./paytable";

type PantherIconProps = {
  kind: SymKind;
  mult?: number;
  className?: string;
  showBombBadge?: boolean;
  winLit?: boolean;
  fit?: "cover" | "contain";
};

/** Full glyph visible — contain only, never cover-crop (gem cells clip edges). */
export const PantherIcon = memo(function PantherIcon({
  kind,
  mult,
  className,
  showBombBadge = true,
  winLit = false,
  fit = "contain",
}: PantherIconProps) {
  const isScatter = kind === "lollipop";
  const isBomb = kind === "bomb";
  const src = ICON_SRC[kind] || "/images/symbols/ruby-raven/10-cell.png?v=1";

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-hidden bg-transparent select-none",
        className,
      )}
    >
      {winLit && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[10%] z-0 rounded-xl"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, var(--p-win-ring) 0%, transparent 70%)",
          }}
        />
      )}
      <img
        src={src}
        alt={kind}
        decoding="async"
        loading="eager"
        draggable={false}
        className={cn(
          "pointer-events-none relative z-[1] object-center",
          fit === "cover"
            ? "size-full object-cover"
            : "h-full w-full object-contain p-[4%]",
          winLit && "brightness-125 saturate-125",
        )}
        style={
          winLit
            ? { filter: "drop-shadow(0 0 6px var(--p-accent))" }
            : isScatter
              ? { filter: "drop-shadow(0 0 8px var(--p-accent))" }
              : isBomb
                ? { filter: "drop-shadow(0 0 8px var(--p-bomb-from))" }
                : { filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45))" }
        }
      />
      {isScatter && (
        <span
          className="absolute bottom-[6%] left-1/2 z-[30] -translate-x-1/2 rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase shadow-sm whitespace-nowrap sm:text-[8px]"
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
        <div className="absolute inset-0 z-[30] grid place-items-center pointer-events-none">
          <span
            className="rounded-full border-2 px-1.5 py-0.5 font-black text-[clamp(10px,2vw,15px)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
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
