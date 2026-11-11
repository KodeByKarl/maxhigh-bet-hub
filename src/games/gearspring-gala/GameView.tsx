import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Gearspring Gala (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="gearspring-gala" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "gearspring-gala"} />
    </SkinnedGame>
  );
}
