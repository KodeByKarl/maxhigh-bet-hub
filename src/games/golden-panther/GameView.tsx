import { GoldenPantherSlot } from "@/components/maxhigh/GoldenPantherSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Golden Panther. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="golden-panther" skin={skin}>
      <GoldenPantherSlot {...props} />
    </SkinnedGame>
  );
}
