import { WildPantherSlot } from "@/components/maxhigh/WildPantherSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Wild Panther. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="wild-panther" skin={skin}>
      <WildPantherSlot {...props} />
    </SkinnedGame>
  );
}
