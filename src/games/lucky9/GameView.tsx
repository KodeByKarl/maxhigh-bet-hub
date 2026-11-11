import { Lucky9Table } from "@/components/maxhigh/games/lucky9";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Lucky 9: a table game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="lucky9" skin={gameTheme.tableSkin!}>
      <Lucky9Table {...props} />
    </SkinnedTable>
  );
}
