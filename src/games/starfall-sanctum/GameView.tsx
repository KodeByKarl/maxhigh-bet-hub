import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Starfall Sanctum (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="starfall-sanctum" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "starfall-sanctum"} />
    </SkinnedGame>
  );
}
