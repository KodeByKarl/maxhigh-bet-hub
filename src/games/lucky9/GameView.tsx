import { Lucky9Table } from "@/components/maxhigh/games/lucky9";
import type { GamePlayProps } from "../shared/types";

/** Lucky 9: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <Lucky9Table {...props} />;
}
