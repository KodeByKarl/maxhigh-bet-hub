import { memo } from "react";
import { cn } from "@/lib/utils";
import type { SymKind } from "./types";
import { ICON_SRC } from "./paytable";

type ChineseIconProps = {
  kind: SymKind;
  mult?: number;
  className?: string;
};

const SYMBOL_EMOJI: Record<SymKind, { emoji: string; bg: string; border: string }> = {
  tiger: { emoji: "🐯", bg: "from-amber-600 to-red-800", border: "border-yellow-300" },
  monkey: { emoji: "🐵", bg: "from-red-600 to-amber-700", border: "border-red-400" },
  dragon: { emoji: "🐉", bg: "from-yellow-500 to-red-700", border: "border-yellow-200" },
  rooster: { emoji: "🐓", bg: "from-red-700 to-amber-900", border: "border-amber-400" },
  dog: { emoji: "🐕", bg: "from-amber-700 to-orange-950", border: "border-amber-300" },
  pig: { emoji: "🐖", bg: "from-rose-600 to-amber-800", border: "border-rose-300" },
  goat: { emoji: "🐐", bg: "from-emerald-700 to-amber-950", border: "border-emerald-400" },
  horse: { emoji: "🐎", bg: "from-orange-800 to-red-950", border: "border-orange-400" },
  snake: { emoji: "🐍", bg: "from-green-700 to-amber-950", border: "border-green-300" },
  rat: { emoji: "🐀", bg: "from-purple-800 to-slate-950", border: "border-purple-300" },
};

export const ChineseIcon = memo(function ChineseIcon({
  kind,
  mult,
  className,
}: ChineseIconProps) {
  const isScatter = kind === "monkey";
  const isBomb = kind === "tiger";
  const src = ICON_SRC[kind];
  const info = SYMBOL_EMOJI[kind] ?? SYMBOL_EMOJI.rat;

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-visible size-full select-none rounded-xl p-1 shadow-md transition-all duration-300",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex size-full items-center justify-center rounded-xl border-2 bg-gradient-to-b shadow-inner overflow-hidden",
          info.bg,
          info.border,
          isScatter && "shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-pulse border-yellow-300",
          isBomb && "shadow-[0_0_20px_rgba(245,158,11,0.95)] border-amber-300",
        )}
      >
        <img
          src={src}
          alt={kind}
          decoding="async"
          loading="eager"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
          className="size-full object-contain pointer-events-none z-[1]"
        />

        {/* Fallback Emoji Visual Symbol */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-3xl sm:text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] pointer-events-none">
          <span>{info.emoji}</span>
        </div>

        {/* Gold Chinese Dragon Frame Border Accent */}
        <div className="pointer-events-none absolute inset-0 rounded-lg border border-yellow-400/30" />
      </div>

      {isScatter && (
        <span className="absolute -bottom-2 left-1/2 z-[30] -translate-x-1/2 rounded-full border border-yellow-200 bg-gradient-to-r from-red-700 via-yellow-500 to-red-700 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-[0_0_12px_rgba(239,68,68,0.9)] whitespace-nowrap">
          SCATTER 🧧
        </span>
      )}

      {isBomb && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none z-[30]">
          <span className="rounded-full border-2 border-yellow-300 bg-gradient-to-br from-red-700 via-amber-700 to-black px-2 py-0.5 font-black text-[clamp(12px,2.4vw,18px)] text-yellow-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] shadow-[0_0_15px_rgba(245,158,11,0.9)]">
            ×{mult ?? 2}
          </span>
        </div>
      )}
    </div>
  );
});
