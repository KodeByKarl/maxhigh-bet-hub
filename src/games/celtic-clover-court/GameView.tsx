import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Celtic Clover Court (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="celtic-clover-court" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "celtic-clover-court"} />
    </SkinnedGame>
  );
}
