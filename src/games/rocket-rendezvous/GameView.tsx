import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Rocket Rendezvous (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="rocket-rendezvous" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "rocket-rendezvous"} />
    </SkinnedGame>
  );
}
