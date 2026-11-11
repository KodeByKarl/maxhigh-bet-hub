import { LotusLynxSlot } from "@/components/maxhigh/LotusLynxSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Lotus Lynx. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="lotus-lynx" skin={skin}>
      <LotusLynxSlot {...props} />
    </SkinnedGame>
  );
}
