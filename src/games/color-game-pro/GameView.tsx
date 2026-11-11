import { ColorGameProTable } from "@/components/maxhigh/games/color-game-pro";
import type { GamePlayProps } from "../shared/types";

/** Color Game Pro: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <ColorGameProTable {...props} />;
}
