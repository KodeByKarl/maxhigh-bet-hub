import { CleopatraGoldSlot } from "@/components/maxhigh/CleopatraGoldSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Cleopatra Gold. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="cleopatra-gold" skin={skin}>
      <CleopatraGoldSlot {...props} />
    </SkinnedGame>
  );
}
