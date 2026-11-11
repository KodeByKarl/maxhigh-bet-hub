import { AceHighSlot } from "@/components/maxhigh/AceHighSlot";

import type { GamePlayProps } from "../shared/types";

import { SkinnedTable } from "../shared/layouts/SkinnedTable";

import { gameTheme } from "./game.theme";

/** Ace High: a table game. Its bespoke UI is untouched; it gets an atmosphere, backdrop grade, heading typeface and frame ring. */

export function GameView(props: GamePlayProps) {
  return (
    <SkinnedTable gameId="ace-high" skin={gameTheme.tableSkin!}>
      <AceHighSlot {...props} />
    </SkinnedTable>
  );
}
