import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Moonjelly Bay (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="moonjelly-bay" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "moonjelly-bay"} />
    </SkinnedGame>
  );
}
