import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BoxingBorderProps = {
  children: ReactNode;
  className?: string;
  /** Inner content class */
  innerClassName?: string;
  /** Border thickness in px */
  thickness?: number;
  /** Corner radius for rounded boxes */
  rounded?: "md" | "xl" | "2xl" | "full" | "trap";
  style?: CSSProperties;
};

const ROUND: Record<NonNullable<BoxingBorderProps["rounded"]>, string> = {
  md: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
  trap: "",
};

/**
 * Animated fire border wrapper — scrolling flame strip + glowing rim.
 * Uses CSS animation (crisper than GIF for UI frames at any size).
 */
export function BoxingBorder({
  children,
  className,
  innerClassName,
  thickness = 3,
  rounded = "xl",
  style,
}: BoxingBorderProps) {
  const radius = ROUND[rounded];
  const trap = rounded === "trap";

  return (
    <div
      className={cn("fs-fire-border relative", radius, className)}
      style={{
        ...style,
        ...(trap
          ? { clipPath: "polygon(4% 0, 96% 0, 100% 100%, 0 100%)" }
          : undefined),
        padding: thickness,
      }}
    >
      {/* Animated flame texture ring */}
      <div
        aria-hidden
        className={cn("fs-fire-border__flame pointer-events-none absolute inset-0", radius)}
        style={trap ? { clipPath: "polygon(4% 0, 96% 0, 100% 100%, 0 100%)" } : undefined}
      />
      {/* Ember glow pulse */}
      <div
        aria-hidden
        className={cn("fs-fire-border__glow pointer-events-none absolute inset-0", radius)}
        style={trap ? { clipPath: "polygon(4% 0, 96% 0, 100% 100%, 0 100%)" } : undefined}
      />

      <div
        className={cn(
          "relative z-[1] h-full w-full overflow-hidden bg-gradient-to-b from-[#2a1008]/96 to-[#0c0402]/98",
          radius,
          innerClassName,
        )}
        style={
          trap
            ? {
                clipPath: "polygon(3.5% 0, 96.5% 0, 100% 100%, 0 100%)",
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
