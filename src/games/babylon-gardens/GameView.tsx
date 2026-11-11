import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Babylon Gardens (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="babylon-gardens" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "babylon-gardens"} />
    </SkinnedGame>
  );
}
