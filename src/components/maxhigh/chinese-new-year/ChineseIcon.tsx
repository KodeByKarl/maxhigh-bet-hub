import { memo } from "react";
import { cn } from "@/lib/utils";
import type { CnySymKind } from "@/lib/chinese-new-year-config";
import { ICON_SRC } from "./paytable";

type ChineseIconProps = {
  kind: CnySymKind;
  className?: string;
  /** Highlight Extra Scatter when it substitutes for a chosen symbol. */
  extraLabel?: string | null;
};

/**
 * 3D symbol glyph — PNG assets under /images/symbols/chinese/.
 */
export const ChineseIcon = memo(function ChineseIcon({
  kind,
  className,
  extraLabel,
}: ChineseIconProps) {
  const isFeature = kind === "dragon" || kind === "monkey" || kind === "extra_scatter";
  const src = ICON_SRC[kind];

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-hidden bg-transparent select-none",
        className,
      )}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        className={cn(
          // Zoom past PNG dark margins; cell overflow clips the rest
          "pointer-events-none size-full scale-[1.55] object-contain object-center transition-all duration-300",
          kind === "dragon" &&
            "drop-shadow-[0_0_18px_rgba(220,38,38,0.85)] drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]",
          kind === "monkey" && "drop-shadow-[0_0_16px_rgba(234,88,12,0.9)]",
          kind === "extra_scatter" && "scale-[1.6] drop-shadow-[0_0_20px_rgba(250,204,21,0.95)]",
          !isFeature && "drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]",
        )}
      />
      {kind === "monkey" && (
        <span className="absolute bottom-0.5 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-200 bg-gradient-to-r from-red-600 via-amber-400 to-red-600 px-1.5 py-px text-[7px] font-black uppercase text-white shadow">
          MONKEY
        </span>
      )}
      {kind === "dragon" && (
        <span className="absolute bottom-0.5 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-200 bg-gradient-to-r from-red-800 via-yellow-500 to-red-800 px-1.5 py-px text-[7px] font-black uppercase text-yellow-50 shadow">
          DRAGON
        </span>
      )}
      {kind === "extra_scatter" && (
        <span className="absolute bottom-0.5 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-100 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 px-1.5 py-px text-[7px] font-black uppercase text-amber-950 shadow animate-pulse">
          {extraLabel ? `EXTRA · ${extraLabel}` : "EXTRA"}
        </span>
      )}
    </div>
  );
});
