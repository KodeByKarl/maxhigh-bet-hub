import { LuckyDropTable } from "@/components/maxhigh/games/lucky-drop";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Royal Climb: a table game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="lucky-drop" skin={gameTheme.tableSkin!}>
      <LuckyDropTable {...props} />
    </SkinnedTable>
  );
}
