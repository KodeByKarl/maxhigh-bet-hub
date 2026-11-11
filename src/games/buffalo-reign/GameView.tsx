import { BuffaloReignSlot } from "@/components/maxhigh/BuffaloReignSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Buffalo Reign. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="buffalo-reign" skin={skin}>
      <BuffaloReignSlot {...props} />
    </SkinnedGame>
  );
}
