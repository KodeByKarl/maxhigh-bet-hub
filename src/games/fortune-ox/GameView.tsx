import { FortuneOxSlot } from "@/components/maxhigh/FortuneOxSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Fortune Ox. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="fortune-ox" skin={skin}>
      <FortuneOxSlot {...props} />
    </SkinnedGame>
  );
}
