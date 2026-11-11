import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Crane Pavilion (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="crane-pavilion" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "crane-pavilion"} />
    </SkinnedGame>
  );
}
