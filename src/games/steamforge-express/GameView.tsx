import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Steamforge Express (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="steamforge-express" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "steamforge-express"} />
    </SkinnedGame>
  );
}
