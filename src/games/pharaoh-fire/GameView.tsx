import { PharaohFireSlot } from "@/components/maxhigh/PharaohFireSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Pharaoh Fire. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="pharaoh-fire" skin={skin}>
      <PharaohFireSlot {...props} />
    </SkinnedGame>
  );
}
