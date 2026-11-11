import { TongitsArenaTable } from "@/components/maxhigh/games/tongits-arena";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Tongits Arena: a table game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="tongits-arena" skin={gameTheme.tableSkin!}>
      <TongitsArenaTable {...props} />
    </SkinnedTable>
  );
}
