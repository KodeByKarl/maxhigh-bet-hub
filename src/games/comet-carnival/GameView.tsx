import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Comet Carnival (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="comet-carnival" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "comet-carnival"} />
    </SkinnedGame>
  );
}
