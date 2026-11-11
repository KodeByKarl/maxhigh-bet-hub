import { LuckyNinePlusTable } from "@/components/maxhigh/games/lucky-nine-plus";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Lucky Nine Plus: a table game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="lucky-nine-plus" skin={gameTheme.tableSkin!}>
      <LuckyNinePlusTable {...props} />
    </SkinnedTable>
  );
}
