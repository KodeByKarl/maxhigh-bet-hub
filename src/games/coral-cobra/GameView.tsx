import { CoralCobraSlot } from "@/components/maxhigh/CoralCobraSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Coral Cobra. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="coral-cobra" skin={skin}>
      <CoralCobraSlot {...props} />
    </SkinnedGame>
  );
}
