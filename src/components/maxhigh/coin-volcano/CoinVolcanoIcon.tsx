import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import type { McSymKind } from "@/lib/coin-volcano-config";
import { CARD_FRAME_SRC, ICON_SRC, SYM_COLOR, SYM_LABEL } from "./animationConfig";

type CoinVolcanoIconProps = {
  kind: McSymKind;
  className?: string;
  /** Ornate border overlay only. Default true. */
  framed?: boolean;
};

/**
 * Full symbol fills the tile; ornate frame is border-only (transparent center).
 */
export const CoinVolcanoIcon = memo(function CoinVolcanoIcon({
  kind,
  className,
  framed = true,
}: CoinVolcanoIconProps) {
  const [useGlyph, setUseGlyph] = useState(false);
  const [frameOk, setFrameOk] = useState(true);

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-hidden select-none",
        className,
      )}
    >
      {!useGlyph ? (
        <img
          src={ICON_SRC[kind]}
          alt=""
          draggable={false}
          decoding="async"
          className="pointer-events-none relative z-[1] size-[92%] object-contain object-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
          onError={() => setUseGlyph(true)}
        />
      ) : (
        <div
          className={cn(
            "relative z-[1] flex size-[86%] items-center justify-center rounded-lg bg-gradient-to-br shadow-lg",
            "border border-white/25 text-center font-black tracking-tight text-white",
            SYM_COLOR[kind],
            kind === "lucky7" && "text-3xl sm:text-4xl",
            kind === "wild" && "animate-pulse text-sm uppercase sm:text-base",
            kind === "scatter" && "text-sm uppercase sm:text-base",
            kind !== "lucky7" && kind !== "wild" && kind !== "scatter" && "text-xs sm:text-sm",
          )}
        >
          {SYM_LABEL[kind]}
        </div>
      )}

      {framed && frameOk && (
        <img
          src={`${CARD_FRAME_SRC}?v=2`}
          alt=""
          draggable={false}
          decoding="async"
          className="pointer-events-none absolute inset-0 z-[3] size-full object-fill"
          onError={() => setFrameOk(false)}
        />
      )}
    </div>
  );
});
