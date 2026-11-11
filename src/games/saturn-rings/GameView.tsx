import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Saturn Rings (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="saturn-rings" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "saturn-rings"} />
    </SkinnedGame>
  );
}
