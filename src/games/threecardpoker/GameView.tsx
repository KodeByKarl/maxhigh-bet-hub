import { ThreeCardPokerTable } from "@/components/maxhigh/games/threecardpoker";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Three Card Poker: a table game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="threecardpoker" skin={gameTheme.tableSkin!}>
      <ThreeCardPokerTable {...props} />
    </SkinnedTable>
  );
}
