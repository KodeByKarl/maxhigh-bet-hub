import { DragonFisherGame } from "@/components/maxhigh/games/dragon-fisher";
import type { GamePlayProps } from "../shared/types";

/** Dragon Fisher: a fishing game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <DragonFisherGame {...props} />;
}
