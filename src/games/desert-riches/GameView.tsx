import { DesertRichesSlot } from "@/components/maxhigh/DesertRichesSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./desert-layout.css";

/** Desert Riches. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="desert-riches" skin={skin}>
      <DesertRichesSlot {...props} />
    </SkinnedGame>
  );
}
