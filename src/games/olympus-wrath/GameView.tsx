import { OlympusWrathSlot } from "@/components/maxhigh/OlympusWrathSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Olympus Wrath. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="olympus-wrath" skin={skin}>
      <OlympusWrathSlot {...props} />
    </SkinnedGame>
  );
}
