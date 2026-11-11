import { EnchantedGroveSlot } from "@/components/maxhigh/EnchantedGroveSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Enchanted Grove. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="enchanted-grove" skin={skin}>
      <EnchantedGroveSlot {...props} />
    </SkinnedGame>
  );
}
