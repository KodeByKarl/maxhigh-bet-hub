import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { CARD_FRAME_SRC, ICON_SRC, SYM_LABEL } from "./animationConfig";

type NeonFruitsIconProps = {
  kind: string;
  className?: string;
  /** 3D candy border overlay. Default true. */
  framed?: boolean;
  /** Hide name pill under symbol. */
  showLabel?: boolean;
  label?: string;
};

/**
 * Glossy 3D fruit tile. Pass framed=true only when not already framed by parent.
 */
export const NeonFruitsIcon = memo(function NeonFruitsIcon({
  kind,
  className,
  framed = true,
  showLabel = false,
  label,
}: NeonFruitsIconProps) {
  const [useGlyph, setUseGlyph] = useState(false);
  const [frameOk, setFrameOk] = useState(true);
  const src = ICON_SRC[kind];

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-hidden select-none",
        className,
      )}
    >
      {!useGlyph && src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          className={cn(
            "pointer-events-none relative z-[1] object-contain object-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.55)]",
            framed ? "size-[72%]" : "size-[88%]",
          )}
          onError={() => setUseGlyph(true)}
        />
      ) : (
        <span className="relative z-[1] text-5xl drop-shadow sm:text-6xl md:text-7xl">
          {SYM_LABEL[kind] ?? "?"}
        </span>
      )}

      {framed && frameOk && (
        <img
          src={`${CARD_FRAME_SRC}?v=4`}
          alt=""
          draggable={false}
          decoding="async"
          className="pointer-events-none absolute inset-0 z-[2] size-full object-fill object-center"
          onError={() => setFrameOk(false)}
        />
      )}

      {showLabel && label && (
        <span className="absolute bottom-[7%] z-[3] rounded-full bg-fuchsia-600/85 px-2.5 py-0.5 text-[9px] font-black tracking-[0.14em] text-white shadow-sm ring-1 ring-white/40 sm:text-[10px]">
          {label}
        </span>
      )}
    </div>
  );
});
