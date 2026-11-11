import { FortuneMouseSlot } from "@/components/maxhigh/FortuneMouseSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Fortune Mouse. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="fortune-mouse" skin={skin}>
      <FortuneMouseSlot {...props} />
    </SkinnedGame>
  );
}
