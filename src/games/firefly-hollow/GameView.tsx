import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Firefly Hollow (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="firefly-hollow" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "firefly-hollow"} />
    </SkinnedGame>
  );
}
