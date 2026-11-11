import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Ashfall Citadel (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="ashfall-citadel" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "ashfall-citadel"} />
    </SkinnedGame>
  );
}
