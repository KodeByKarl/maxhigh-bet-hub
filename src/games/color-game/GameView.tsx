import { ColorGameTable } from "@/components/maxhigh/games/color-game";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Color Game: a table game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="color-game" skin={gameTheme.tableSkin!}>
      <ColorGameTable {...props} />
    </SkinnedTable>
  );
}
