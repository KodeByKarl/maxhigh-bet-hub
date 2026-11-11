import { FireSpikeSlot } from "@/components/maxhigh/FireSpikeSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Fire Spike. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="fire-spike" skin={skin}>
      <FireSpikeSlot {...props} />
    </SkinnedGame>
  );
}
