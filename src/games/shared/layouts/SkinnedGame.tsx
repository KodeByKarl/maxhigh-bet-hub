import { useRef, type CSSProperties, type ReactNode } from "react";
import type { GameSkin } from "../themes/skin";
import { useSkinHooks } from "../hooks/useSkinHooks";
import "./skin-frames.css";
import "./skin-deck.css";
import "../effects/skin-fx.css";

/**
 * Presentation wrapper every slot game folder renders around its (unchanged) game engine component. It only sets data attributes and
 * CSS variables; the stylesheet does the rest. Nothing here touches gameplay state.
 */
export function SkinnedGame({
  gameId,
  skin,
  children,
}: {
  gameId: string;
  skin: GameSkin;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useSkinHooks(ref, skin.motif);
  const style = {
    "--gs-corner": `${skin.tune.corner}px`,
    "--gs-orn": skin.tune.ornament,
    "--gs-spin": `${skin.tune.spin}px`,
  } as CSSProperties;
  return (
    <div
      ref={ref}
      className="h-full min-h-0 w-full"
      data-game-view={gameId}
      data-frame={skin.frame}
      data-deck={skin.deck}
      data-voice={skin.voice}
      data-spin={skin.spin}
      data-fx={skin.fx}
      style={style}
    >
      {children}
    </div>
  );
}
