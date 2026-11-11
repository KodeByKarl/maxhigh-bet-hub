import { DeepBassGame } from "@/components/maxhigh/games/deep-bass";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Deep Bass: a fishing game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="deep-bass" skin={gameTheme.tableSkin!}>
      <DeepBassGame {...props} />
    </SkinnedTable>
  );
}
