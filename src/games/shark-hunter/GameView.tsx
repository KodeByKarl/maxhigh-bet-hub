import { SharkHunterGame } from "@/components/maxhigh/games/shark-hunter";
import type { GamePlayProps } from "../shared/types";

/** Shark Hunter: a fishing game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <SharkHunterGame {...props} />;
}
