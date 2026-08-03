import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PwSymKind } from "@/lib/pinata-wins-config";
import { CARD_FRAME_SRC, ICON_SRC, SYM_COLOR, SYM_LABEL } from "./animationConfig";

type PinataIconProps = {
  kind: PwSymKind;
  className?: string;
  /** Gold Frame mult badge (2–100). */
  frameMult?: number;
  /**
   * Extra overlay frame (usually off — gold border is baked into each PNG
   * like Super Ace). Kept for optional double-rim accents.
   */
  framed?: boolean;
};

/**
 * 3D symbol tiles with baked gold card borders + emoji fallback.
 */
export const PinataIcon = memo(function PinataIcon({
  kind,
  className,
  frameMult = 0,
  framed = false,
}: PinataIconProps) {
  const [useGlyph, setUseGlyph] = useState(false);
  const [frameOk, setFrameOk] = useState(true);

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-visible bg-transparent select-none",
        className,
      )}
    >
      {!useGlyph ? (
        <img
          src={ICON_SRC[kind]}
          alt=""
          draggable={false}
          decoding="async"
          loading="lazy"
          className="pointer-events-none relative z-[1] size-[86%] object-contain object-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
          onError={() => setUseGlyph(true)}
        />
      ) : (
        <div
          className={cn(
            "relative z-[1] flex size-[80%] items-center justify-center rounded-xl border-2 border-amber-300/90 bg-gradient-to-br text-[clamp(1.5rem,5.5vw,3.5rem)] shadow-lg",
            SYM_COLOR[kind],
          )}
        >
          {SYM_LABEL[kind]}
        </div>
      )}

      {framed && frameOk && (
        <img
          src={CARD_FRAME_SRC}
          alt=""
          draggable={false}
          decoding="async"
          className="pointer-events-none absolute inset-0 z-[3] size-full object-fill opacity-95"
          onError={() => setFrameOk(false)}
        />
      )}

      {frameMult > 0 && (
        <span className="absolute bottom-1 right-1 z-[4] rounded-md border border-yellow-300/80 bg-black/80 px-2 py-1 text-xs font-black tabular-nums text-yellow-300 shadow sm:text-sm">
          {frameMult}x
        </span>
      )}
    </div>
  );
});
