import { MayaGoldSlot } from "@/components/maxhigh/MayaGoldSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Maya Gold. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="maya-gold" skin={skin}>
      <MayaGoldSlot {...props} />
    </SkinnedGame>
  );
}
