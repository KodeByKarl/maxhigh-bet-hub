import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Potion Parlor (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="potion-parlor" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "potion-parlor"} />
    </SkinnedGame>
  );
}
