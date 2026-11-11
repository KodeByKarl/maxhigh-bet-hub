import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Monsoon Grove (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="monsoon-grove" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "monsoon-grove"} />
    </SkinnedGame>
  );
}
