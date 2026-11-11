import { TurtleTideGame } from "@/components/maxhigh/games/turtle-tide";
import type { GamePlayProps } from "../shared/types";

/** Turtle Tide: a fishing game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <TurtleTideGame {...props} />;
}
