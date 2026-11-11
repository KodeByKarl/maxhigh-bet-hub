import { PokerShowdownTable } from "@/components/maxhigh/games/poker-showdown";
import type { GamePlayProps } from "../shared/types";

/** Poker Showdown: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <PokerShowdownTable {...props} />;
}
