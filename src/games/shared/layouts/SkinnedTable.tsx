import type { CSSProperties, ReactNode } from "react";
import type { TableSkin } from "../themes/skin";
import "./skin-atmosphere.css";
import "./skin-table.css";

/**
 * Presentation wrapper for table and fishing games. Their gameplay UI is bespoke and is rendered untouched: this adds an atmosphere
 * layer behind it, a backdrop grade, a typeface voice for headings and an optional frame ring. Attributes and CSS only.
 */
export function SkinnedTable({
  gameId,
  skin,
  children,
}: {
  gameId: string;
  skin: TableSkin;
  children: ReactNode;
}) {
  return (
    <div
      className="h-full min-h-0 w-full"
      data-table-view={gameId}
      data-atmos={skin.atmos}
      data-grade={skin.grade}
      data-voice={skin.voice}
      data-ring={skin.ring}
      style={
        {
          "--p-accent": skin.accent,
          "--p-accent-soft": `color-mix(in srgb, ${skin.accent} 55%, #fff)`,
          "--p-accent-deep": skin.deep,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
