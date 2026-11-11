import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Siren's Lagoon (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="sirens-lagoon" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "sirens-lagoon"} />
    </SkinnedGame>
  );
}
