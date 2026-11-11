import { DeepBassGame } from "@/components/maxhigh/games/deep-bass";
import type { GamePlayProps } from "../shared/types";

/** Deep Bass: a fishing game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <DeepBassGame {...props} />;
}
