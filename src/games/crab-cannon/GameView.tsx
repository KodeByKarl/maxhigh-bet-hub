import { CrabCannonGame } from "@/components/maxhigh/games/crab-cannon";
import type { GamePlayProps } from "../shared/types";

/** Crab Cannon: a fishing game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <CrabCannonGame {...props} />;
}
