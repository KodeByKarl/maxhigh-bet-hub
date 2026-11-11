import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Canopy Kingdom (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="canopy-kingdom" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "canopy-kingdom"} />
    </SkinnedGame>
  );
}
