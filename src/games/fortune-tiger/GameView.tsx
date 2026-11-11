import { FortuneTigerSlot } from "@/components/maxhigh/FortuneTigerSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Fortune Tiger. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="fortune-tiger" skin={skin}>
      <FortuneTigerSlot {...props} />
    </SkinnedGame>
  );
}
