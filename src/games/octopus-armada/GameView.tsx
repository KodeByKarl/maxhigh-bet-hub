import { OctopusArmadaGame } from "@/components/maxhigh/games/octopus-armada";
import type { GamePlayProps } from "../shared/types";

/** Octopus Armada: a fishing game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <OctopusArmadaGame {...props} />;
}
