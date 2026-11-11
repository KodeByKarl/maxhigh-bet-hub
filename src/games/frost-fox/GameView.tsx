import { FrostFoxSlot } from "@/components/maxhigh/FrostFoxSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Frost Fox. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="frost-fox" skin={skin}>
      <FrostFoxSlot {...props} />
    </SkinnedGame>
  );
}
