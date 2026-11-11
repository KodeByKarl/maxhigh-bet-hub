import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Longship Raiders (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="longship-raiders" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "longship-raiders"} />
    </SkinnedGame>
  );
}
