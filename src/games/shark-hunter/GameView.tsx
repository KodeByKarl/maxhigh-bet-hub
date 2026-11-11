import { SharkHunterGame } from "@/components/maxhigh/games/shark-hunter";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Shark Hunter: a fishing game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="shark-hunter" skin={gameTheme.tableSkin!}>
      <SharkHunterGame {...props} />
    </SkinnedTable>
  );
}
