import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Hummingbird Haven (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="hummingbird-haven" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "hummingbird-haven"} />
    </SkinnedGame>
  );
}
