import { CrabCannonGame } from "@/components/maxhigh/games/crab-cannon";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Crab Cannon: a fishing game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="crab-cannon" skin={gameTheme.tableSkin!}>
      <CrabCannonGame {...props} />
    </SkinnedTable>
  );
}
