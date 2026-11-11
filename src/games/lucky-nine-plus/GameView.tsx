import { LuckyNinePlusTable } from "@/components/maxhigh/games/lucky-nine-plus";
import type { GamePlayProps } from "../shared/types";

/** Lucky Nine Plus: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <LuckyNinePlusTable {...props} />;
}
