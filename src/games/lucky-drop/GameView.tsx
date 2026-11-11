import { LuckyDropTable } from "@/components/maxhigh/games/lucky-drop";
import type { GamePlayProps } from "../shared/types";

/** Royal Climb: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <LuckyDropTable {...props} />;
}
