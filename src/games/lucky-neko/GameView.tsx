import { LuckyNekoSlot } from "@/components/maxhigh/LuckyNekoSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Lucky Neko. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="lucky-neko" skin={skin}>
      <LuckyNekoSlot {...props} />
    </SkinnedGame>
  );
}
