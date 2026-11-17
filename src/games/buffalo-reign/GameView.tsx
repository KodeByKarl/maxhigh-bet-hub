import { useEffect } from "react";
import { BuffaloReignSlot } from "@/components/maxhigh/BuffaloReignSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./buffalo-ui.css";
import "./buffalo-layout.css";

const RIPPLE_MS = 500;

/**
 * Presentation only: marks the Spin medallion for a brief press ripple (CSS plays it while data-ripple is set).
 * No gameplay state is read or written. The listener and any pending timer are removed on unmount.
 */
function useSpinPress() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-game-view="buffalo-reign"]');
    if (!root) return;
    const timers = new Map<Element, number>();
    const onDown = (e: PointerEvent) => {
      const btn = (e.target as Element | null)?.closest<HTMLButtonElement>(".slot-deck__spin");
      if (!btn || btn.disabled) return;
      window.clearTimeout(timers.get(btn));
      btn.removeAttribute("data-ripple");
      void btn.offsetWidth; // restart the animation on rapid taps
      btn.setAttribute("data-ripple", "");
      timers.set(
        btn,
        window.setTimeout(() => {
          btn.removeAttribute("data-ripple");
          timers.delete(btn);
        }, RIPPLE_MS),
      );
    };
    root.addEventListener("pointerdown", onDown);
    return () => {
      root.removeEventListener("pointerdown", onDown);
      timers.forEach((t, btn) => {
        window.clearTimeout(t);
        btn.removeAttribute("data-ripple");
      });
      timers.clear();
    };
  }, []);
}

/** Buffalo Reign (Panther engine, own presentation). */
export function GameView(props: GamePlayProps) {
  useSpinPress();
  return (
    <SkinnedGame gameId="buffalo-reign" skin={skin}>
      <BuffaloReignSlot {...props} />
    </SkinnedGame>
  );
}
