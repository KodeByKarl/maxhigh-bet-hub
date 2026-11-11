import { memo } from "react";
import { clampBombMult } from "@/lib/midnight-owl-config";
import { cn } from "@/lib/utils";
import { ICON_SRC } from "./paytable";
import type { SymKind } from "./types";

/**
 * Width of the symbol PNG as a share of its board cell. The source art carries a lot of transparent padding (a rank card is only ~41% of its
 * image width), so each width is derived from the artwork's measured visible bounds and chosen so every symbol reaches a similar visual weight
 * inside the diamond. Aspect ratio is always preserved (width only; height is auto); nothing is stretched or cropped.
 */
const SYMBOL_WIDTH: Record<SymKind, number> = {
  grape: 1.26, // 10
  plum: 1.26, // J
  melon: 1.26, // Q
  apple: 1.26, // K
  blue: 1.26, // A
  green: 1.0, // premium a
  purple: 0.88, // premium b
  heart: 1.7, // premium c
  lollipop: 0.88, // scatter
  bomb: 1.12, // wild / multiplier
};

type OwlSymbolProps = {
  kind: SymKind;
  mult?: number;
  winLit?: boolean;
};

/** Board-cell symbol: large, optically centred on the diamond, with the existing scatter and multiplier badges. */
export const OwlSymbol = memo(function OwlSymbol({ kind, mult, winLit = false }: OwlSymbolProps) {
  const isScatter = kind === "lollipop";
  const isBomb = kind === "bomb";
  const src = ICON_SRC[kind] || "/images/symbols/midnight-owl/10-cell.png?v=2";

  return (
    <div className="owl-sym" data-kind={kind} data-lit={winLit || undefined}>
      <img
        src={src}
        alt={kind}
        decoding="async"
        loading="eager"
        draggable={false}
        className="owl-sym__img"
        style={{ width: `${SYMBOL_WIDTH[kind] * 100}%` }}
      />
      {isScatter && (
        <span
          className="absolute bottom-[8%] left-1/2 z-[30] -translate-x-1/2 rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase whitespace-nowrap shadow-sm sm:text-[8px]"
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
      {isBomb && (
        <div className="pointer-events-none absolute inset-0 z-[30] grid place-items-center">
          <span
            className={cn(
              "rounded-full border-2 px-1.5 py-0.5 font-black text-[clamp(10px,2vw,15px)]",
              "drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]",
            )}
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
