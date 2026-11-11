import { CoinVolcanoSlot } from "@/components/maxhigh/CoinVolcanoSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Coin Volcano. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="coin-volcano" skin={skin}>
      <CoinVolcanoSlot {...props} />
    </SkinnedGame>
  );
}
