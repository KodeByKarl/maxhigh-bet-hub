import { cn } from "@/lib/utils";
import type { SymKind } from "./types";
import { ICON_SRC, SYM_COLORS } from "./paytable";

/** Egyptian stone-tile symbol art. Fallback tile only if the PNG truly fails. */
export function SymbolIcon({
  kind,
  className,
}: {
  kind: SymKind;
  className?: string;
}) {
  const colors = SYM_COLORS[kind];
  // Cache-bust so browsers pick up newly compressed assets
  const src = `${ICON_SRC[kind]}?v=3`;

  return (
    <div
      className={cn(
        "relative grid size-full place-items-center select-none pointer-events-none",
        className,
      )}
    >
      {/* Fallback sits behind; real art covers it when loaded */}
      <div
        aria-hidden
        className="absolute inset-[4%] grid place-items-center rounded-lg border-2 font-black uppercase shadow-inner"
        style={{
          background: `linear-gradient(145deg, ${colors.primary}, ${colors.secondary})`,
          borderColor: colors.glow,
          color: "#fff",
          textShadow: "0 1px 2px rgba(0,0,0,0.55)",
          fontSize: kind.length <= 1 ? "1.35rem" : "0.55rem",
          letterSpacing: "0.04em",
          zIndex: 0,
        }}
      >
        {colors.label}
      </div>
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        className="relative z-[1] size-[94%] object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]"
        onError={(e) => {
          const el = e.currentTarget;
          if (!el.dataset.retry) {
            el.dataset.retry = "1";
            el.src = `${ICON_SRC[kind]}?v=${Date.now()}`;
            return;
          }
          el.style.opacity = "0";
        }}
      />
    </div>
  );
}
