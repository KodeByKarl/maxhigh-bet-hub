import { OctopusArmadaGame } from "@/components/maxhigh/games/octopus-armada";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Octopus Armada: a fishing game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="octopus-armada" skin={gameTheme.tableSkin!}>
      <OctopusArmadaGame {...props} />
    </SkinnedTable>
  );
}
