import { WhaleWarGame } from "@/components/maxhigh/games/whale-war";
import type { GamePlayProps } from "../shared/types";

/** Whale War: a fishing game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <WhaleWarGame {...props} />;
}
