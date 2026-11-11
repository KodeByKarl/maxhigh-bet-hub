import { TurtleTideGame } from "@/components/maxhigh/games/turtle-tide";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Turtle Tide: a fishing game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="turtle-tide" skin={gameTheme.tableSkin!}>
      <TurtleTideGame {...props} />
    </SkinnedTable>
  );
}
