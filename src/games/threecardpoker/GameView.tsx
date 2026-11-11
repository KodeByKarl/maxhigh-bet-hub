import { ThreeCardPokerTable } from "@/components/maxhigh/games/threecardpoker";
import type { GamePlayProps } from "../shared/types";

/** Three Card Poker: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <ThreeCardPokerTable {...props} />;
}
