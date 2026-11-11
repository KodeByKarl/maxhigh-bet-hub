import { BaccaratTable } from "@/components/maxhigh/games/baccarat";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Baccarat: a table game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="baccarat" skin={gameTheme.tableSkin!}>
      <BaccaratTable {...props} />
    </SkinnedTable>
  );
}
