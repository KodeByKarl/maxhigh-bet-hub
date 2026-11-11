import { ThorThunderSlot } from "@/components/maxhigh/ThorThunderSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Thor Thunder. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="thor-thunder" skin={skin}>
      <ThorThunderSlot {...props} />
    </SkinnedGame>
  );
}
