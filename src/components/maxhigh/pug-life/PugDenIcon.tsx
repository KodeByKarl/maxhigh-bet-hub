import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PlSymKind } from "@/lib/pug-life-config";
import { CARD_FRAME_SRC, ICON_SRC, SYM_COLOR, SYM_LABEL } from "./animationConfig";

type PugDenIconProps = {
  kind: PlSymKind;
  className?: string;
  framed?: boolean;
  treatMult?: number | null;
};

/**
 * Pug Den symbol tile — dark underlay kills white mats; art fills the frame window.
 */
export const PugDenIcon = memo(function PugDenIcon({
  kind,
  className,
  framed = true,
  treatMult,
}: PugDenIconProps) {
  const [useGlyph, setUseGlyph] = useState(false);
  const [frameOk, setFrameOk] = useState(true);
  const isTreat = kind.startsWith("treat_");
  const isScatter = kind === "scatter";
  const isToaster = kind === "toaster";

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-hidden select-none",
        className,
      )}
    >
      {/* Solid dark underlay — circular for diamond board cells */}
      <div className="absolute inset-[8%] z-0 rounded-full bg-[#1a1208]" />

      {!useGlyph ? (
        <img
          src={`${ICON_SRC[kind]}?v=3`}
          alt=""
          draggable={false}
          decoding="async"
          className={cn(
            "pointer-events-none relative z-[1] size-[78%] object-contain object-center",
            isScatter && "drop-shadow-[0_0_14px_rgba(34,197,94,0.85)]",
            isTreat && "drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]",
            isToaster && "drop-shadow-[0_0_12px_rgba(249,115,22,0.75)]",
            !isScatter && !isTreat && !isToaster && "drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]",
          )}
          onError={() => setUseGlyph(true)}
        />
      ) : (
        <div
          className="relative z-[1] flex size-[72%] items-center justify-center rounded-full border border-white/25 bg-black/50 text-center text-[9px] font-black tracking-tight sm:text-[10px]"
          style={{ color: SYM_COLOR[kind] ?? "#fff" }}
        >
          {SYM_LABEL[kind] ?? kind}
        </div>
      )}

      {framed && frameOk && (
        <img
          src={`${CARD_FRAME_SRC}?v=3`}
          alt=""
          draggable={false}
          decoding="async"
          className="pointer-events-none absolute inset-0 z-[3] size-full rounded-full object-cover opacity-80"
          onError={() => setFrameOk(false)}
        />
      )}

      {treatMult != null && treatMult > 0 && (
        <span className="absolute bottom-1 right-1 z-[4] rounded bg-black/75 px-1 text-[8px] font-bold text-amber-300 sm:text-[9px]">
          ×{treatMult}
        </span>
      )}
    </div>
  );
});
