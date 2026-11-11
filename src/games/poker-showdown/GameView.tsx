import { PokerShowdownTable } from "@/components/maxhigh/games/poker-showdown";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Poker Showdown: a table game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="poker-showdown" skin={gameTheme.tableSkin!}>
      <PokerShowdownTable {...props} />
    </SkinnedTable>
  );
}
