import { ZeusStrikeSlot } from "@/components/maxhigh/ZeusStrikeSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Zeus Strike. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="zeus-strike" skin={skin}>
      <ZeusStrikeSlot {...props} />
    </SkinnedGame>
  );
}
