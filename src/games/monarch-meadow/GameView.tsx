import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Monarch Meadow (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="monarch-meadow" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "monarch-meadow"} />
    </SkinnedGame>
  );
}
