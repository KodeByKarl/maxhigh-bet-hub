import { LuckyNekoSlot } from "@/components/maxhigh/LuckyNekoSlot";
import type { GamePlayProps } from "../shared/types";

/**
 * Lucky Neko. Presentation is fully owned by the game (lucky-neko/neko-theme.css), so it does not use the shared
 * SkinnedGame wrapper whose generic frame/deck/board skins would restyle the lacquer frame and tiles.
 */
export function GameView(props: GamePlayProps) {
  return (
    <div className="h-full min-h-0 w-full" data-game-view="lucky-neko">
      <LuckyNekoSlot {...props} />
    </div>
  );
}
