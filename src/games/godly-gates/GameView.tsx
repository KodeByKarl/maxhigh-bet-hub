import { GodlyGatesSlot } from "@/components/maxhigh/GodlyGatesSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Godly Gates. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="godly-gates" skin={skin}>
      <GodlyGatesSlot {...props} />
    </SkinnedGame>
  );
}
