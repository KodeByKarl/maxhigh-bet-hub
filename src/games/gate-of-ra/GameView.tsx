import { GateOfRaSlot } from "@/components/maxhigh/GateOfRaSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Gate of Ra. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="gate-of-ra" skin={skin}>
      <GateOfRaSlot {...props} />
    </SkinnedGame>
  );
}
