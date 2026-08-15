/** Rice Field Riches symbol tiles — wood-framed card art. */
import { memo } from "react";
import { cn } from "@/lib/utils";
import type { BuffaloSymKind } from "@/lib/rice-field-riches-config";

export const CARABAO_TILE_IMAGE_MAP: Record<BuffaloSymKind, string> = {
  sym_10: "/images/symbols/rice-field-riches/sym_10.png",
  sym_j: "/images/symbols/rice-field-riches/sym_j.png",
  sym_q: "/images/symbols/rice-field-riches/sym_q.png",
  sym_k: "/images/symbols/rice-field-riches/sym_k.png",
  sym_a: "/images/symbols/rice-field-riches/sym_a.png",
  lantern: "/images/symbols/rice-field-riches/lantern.png",
  wagon_wheel: "/images/symbols/rice-field-riches/wagon_wheel.png",
  campfire: "/images/symbols/rice-field-riches/campfire.png",
  elk: "/images/symbols/rice-field-riches/elk.png",
  mountain_lion: "/images/symbols/rice-field-riches/mountain_lion.png",
  eagle: "/images/symbols/rice-field-riches/eagle.png",
  grizzly: "/images/symbols/rice-field-riches/grizzly.png",
  bison: "/images/symbols/rice-field-riches/bison.png",
  wild: "/images/symbols/rice-field-riches/wild.png",
  scatter: "/images/symbols/rice-field-riches/scatter.png",
  bonus: "/images/symbols/rice-field-riches/bonus.png",
};

type Props = {
  kind: BuffaloSymKind;
  className?: string;
  winning?: boolean;
};

export const RiceFieldRichesIcon = memo(function RiceFieldRichesIcon({ kind, className, winning }: Props) {
  const isWild = kind === "wild";
  const isScatter = kind === "scatter";
  const isBonus = kind === "bonus";
  const src = CARABAO_TILE_IMAGE_MAP[kind] ?? CARABAO_TILE_IMAGE_MAP.sym_10;

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-visible bg-transparent select-none",
        winning && "drop-shadow-[0_0_14px_rgba(251,191,36,0.85)]",
        className,
      )}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        className={cn(
          "pointer-events-none size-[96%] object-contain transition-all duration-300",
          isScatter
            ? "scale-105 drop-shadow-[0_0_18px_rgba(251,191,36,0.95)]"
            : isWild
              ? "drop-shadow-[0_0_16px_rgba(45,212,191,0.9)]"
              : isBonus
                ? "drop-shadow-[0_0_14px_rgba(250,204,21,0.85)]"
                : "drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]",
        )}
      />
      {isWild && (
        <span className="absolute -bottom-1.5 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-teal-200 bg-gradient-to-r from-teal-700 via-emerald-400 to-teal-700 px-1.5 py-0.5 text-[8px] font-black uppercase text-teal-950 shadow sm:text-[9px]">
          WILD
        </span>
      )}
      {isScatter && (
        <span className="absolute -bottom-1.5 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-200 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-950 shadow sm:text-[9px]">
          SCATTER
        </span>
      )}
      {isBonus && (
        <span className="absolute -bottom-1.5 left-1/2 z-[30] -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 px-1.5 py-0.5 text-[8px] font-black uppercase text-white shadow sm:text-[9px]">
          CHEST
        </span>
      )}
    </div>
  );
});
