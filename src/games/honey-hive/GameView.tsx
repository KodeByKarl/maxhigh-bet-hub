import { HoneyHiveSlot } from "@/components/maxhigh/HoneyHiveSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Honey Hive. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="honey-hive" skin={skin}>
      <HoneyHiveSlot {...props} />
    </SkinnedGame>
  );
}
