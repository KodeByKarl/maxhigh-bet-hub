import { TempleRushSlot } from "@/components/maxhigh/TempleRushSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Temple Rush. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="temple-rush" skin={skin}>
      <TempleRushSlot {...props} />
    </SkinnedGame>
  );
}
