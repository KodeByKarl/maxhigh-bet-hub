import { ColorGameTable } from "@/components/maxhigh/games/color-game";
import type { GamePlayProps } from "../shared/types";

/** Color Game: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <ColorGameTable {...props} />;
}
