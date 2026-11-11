import { SafariGoldSlot } from "@/components/maxhigh/SafariGoldSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Safari Gold. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="safari-gold" skin={skin}>
      <SafariGoldSlot {...props} />
    </SkinnedGame>
  );
}
