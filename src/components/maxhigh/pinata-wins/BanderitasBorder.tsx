import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const FLAG_COLORS = [
  "#E11D48", // rosa
  "#F59E0B", // amber
  "#22C55E", // green
  "#3B82F6", // blue
  "#A855F7", // purple
  "#EC4899", // pink
  "#FBBF24", // gold
  "#06B6D4", // cyan
];

type Edge = "top" | "bottom" | "left" | "right";

function Flag({ color, index }: { color: string; index: number }) {
  // Papel picado–style pennant with tiny cutout dots
  return (
    <svg
      viewBox="0 0 24 28"
      className="pw-banderita block h-full w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
      style={{ animationDelay: `${(index % 8) * 0.12}s` }}
      aria-hidden
    >
      <path
        d="M2 2 H22 L12 26 Z"
        fill={color}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.8"
      />
      {/* cutout holes */}
      <circle cx="12" cy="8" r="1.4" fill="rgba(0,0,0,0.28)" />
      <circle cx="8.5" cy="12" r="1.1" fill="rgba(0,0,0,0.28)" />
      <circle cx="15.5" cy="12" r="1.1" fill="rgba(0,0,0,0.28)" />
      <circle cx="12" cy="16.5" r="1.2" fill="rgba(0,0,0,0.28)" />
      <path
        d="M7 6.5 Q12 4.5 17 6.5"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.7"
      />
    </svg>
  );
}

function FlagStrip({ edge, count }: { edge: Edge; count: number }) {
  const vertical = edge === "left" || edge === "right";
  const flags = Array.from({ length: count }, (_, i) => FLAG_COLORS[i % FLAG_COLORS.length]!);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-[6] flex",
        edge === "top" && "left-2 right-2 top-0 h-[14px] sm:h-[18px]",
        edge === "bottom" && "bottom-0 left-2 right-2 h-[14px] sm:h-[18px] scale-y-[-1]",
        edge === "left" && "left-0 top-3 bottom-3 w-[14px] sm:w-[18px] flex-col",
        edge === "right" && "right-0 top-3 bottom-3 w-[14px] sm:w-[18px] flex-col scale-x-[-1]",
      )}
    >
      {/* twine */}
      <div
        className={cn(
          "absolute bg-gradient-to-r from-amber-200/80 via-yellow-100 to-amber-200/80 shadow-[0_0_4px_rgba(251,191,36,0.5)]",
          vertical
            ? "left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-gradient-to-b from-amber-200/80 via-yellow-100 to-amber-200/80"
            : "left-0 right-0 top-[2px] h-[2px]",
        )}
      />
      <div
        className={cn(
          "relative flex h-full w-full",
          vertical ? "flex-col justify-between py-0.5" : "justify-between px-0.5",
        )}
      >
        {flags.map((color, i) => (
          <div
            key={`${edge}-${i}`}
            className={cn(
              "shrink-0",
              vertical ? "h-[18px] w-full sm:h-[22px]" : "h-full w-[18px] sm:w-[22px]",
              vertical && "origin-top",
              !vertical && "origin-top",
            )}
          >
            <Flag color={color} index={i} />
          </div>
        ))}
      </div>
    </div>
  );
}

type BanderitasBorderProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /** How many flags along the long edges */
  flagCount?: number;
  /** Slimmer flag rim so the reel grid can grow (accessibility / large symbols). */
  tight?: boolean;
};

/**
 * Piñata / papel picado banderitas frame around the reel grid.
 */
export function BanderitasBorder({
  children,
  className,
  innerClassName,
  flagCount = 14,
  tight = false,
}: BanderitasBorderProps) {
  const sideCount = Math.max(6, Math.round(flagCount * 0.55));
  const inset = tight
    ? "m-[4px] h-[calc(100%-8px)] sm:m-[8px] sm:h-[calc(100%-16px)]"
    : "m-[10px] h-[calc(100%-20px)] sm:m-[14px] sm:h-[calc(100%-28px)]";

  return (
    <div
      className={cn(
        "pw-banderitas relative flex min-h-0 w-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl",
        className,
      )}
    >
      {/* Warm gold under-rim */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-amber-400 via-rose-500 to-fuchsia-600 opacity-90"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[2px] rounded-[inherit] bg-gradient-to-b from-[#3a1810] to-[#120806]"
      />

      <FlagStrip edge="top" count={flagCount} />
      <FlagStrip edge="bottom" count={flagCount} />
      <FlagStrip edge="left" count={sideCount} />
      <FlagStrip edge="right" count={sideCount} />

      {/* Corner rosettes */}
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <div
          key={c}
          aria-hidden
          className={cn(
            "pointer-events-none absolute z-[7] size-2.5 rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.8)] ring-1 ring-white/40 sm:size-3",
            c === "tl" && "left-0.5 top-0.5",
            c === "tr" && "right-0.5 top-0.5",
            c === "bl" && "bottom-0.5 left-0.5",
            c === "br" && "bottom-0.5 right-0.5",
          )}
        />
      ))}

      <div
        className={cn(
          "relative z-[1] flex min-h-0 flex-col overflow-hidden rounded-xl bg-black/40 sm:rounded-2xl",
          "shadow-[inset_0_0_24px_rgba(0,0,0,0.45)]",
          inset,
          innerClassName,
        )}
      >
        {children}
      </div>

      <style>{`
        @keyframes pw-banderita-sway {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        .pw-banderita {
          transform-origin: top center;
          animation: pw-banderita-sway 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
