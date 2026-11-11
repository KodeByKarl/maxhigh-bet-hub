import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Tesla Tower (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="tesla-tower" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "tesla-tower"} />
    </SkinnedGame>
  );
}
