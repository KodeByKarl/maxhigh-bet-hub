import { DropDeluxeTable } from "@/components/maxhigh/games/drop-deluxe";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Deluxe Draw: a table game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="drop-deluxe" skin={gameTheme.tableSkin!}>
      <DropDeluxeTable {...props} />
    </SkinnedTable>
  );
}
