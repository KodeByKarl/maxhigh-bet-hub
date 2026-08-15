import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import type { FoSymKind } from "@/lib/sari-sari-spin-config";
import { CARD_FRAME_SRC, ICON_SRC, SYM_COLOR, SYM_LABEL } from "./animationConfig";

type SariSariSpinIconProps = {
  kind: FoSymKind;
  className?: string;
  /** Show ornate gold card frame. Default true. */
  framed?: boolean;
};

/**
 * 3D gem on a velvet plate with ornate gold card border.
 */
export const SariSariSpinIcon = memo(function SariSariSpinIcon({
  kind,
  className,
  framed = true,
}: SariSariSpinIconProps) {
  const [useGlyph, setUseGlyph] = useState(false);
  const [frameOk, setFrameOk] = useState(true);

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-hidden select-none p-[4%]",
        className,
      )}
    >
      {/* Card plate — soft temple velvet, not flat black */}
      <div
        className="pointer-events-none absolute inset-[5%] z-0 rounded-[12%] shadow-[inset_0_0_18px_rgba(0,0,0,0.55)]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, #3a1a12 0%, #1a0c0a 55%, #0a0608 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,200,120,0.12), inset 0 -8px 20px rgba(0,0,0,0.45)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-[8%] z-0 rounded-[10%] opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(251,191,36,0.18) 0%, transparent 62%)",
        }}
      />

      {!useGlyph ? (
        <img
          src={`${ICON_SRC[kind]}?v=gem5`}
          alt=""
          draggable={false}
          decoding="async"
          className="pointer-events-none relative z-[1] size-[68%] object-contain object-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
          onError={() => setUseGlyph(true)}
        />
      ) : (
        <div
          className={cn(
            "relative z-[1] flex size-[62%] items-center justify-center rounded-lg bg-gradient-to-br shadow-lg",
            "border border-white/25 text-center font-black tracking-tight text-white",
            SYM_COLOR[kind],
            kind === "wild" && "animate-pulse text-sm uppercase sm:text-base",
            kind !== "wild" && "text-[10px] sm:text-xs",
          )}
        >
          {SYM_LABEL[kind]}
        </div>
      )}

      {framed && frameOk && (
        <img
          src={`${CARD_FRAME_SRC}?v=frame3`}
          alt=""
          draggable={false}
          decoding="async"
          className="pointer-events-none absolute inset-0 z-[3] size-full object-fill drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
          onError={() => setFrameOk(false)}
        />
      )}
    </div>
  );
});
