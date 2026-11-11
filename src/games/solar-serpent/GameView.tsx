import { SolarSerpentSlot } from "@/components/maxhigh/SolarSerpentSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Solar Serpent. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="solar-serpent" skin={skin}>
      <SolarSerpentSlot {...props} />
    </SkinnedGame>
  );
}
