import { BaccaratTable } from "@/components/maxhigh/games/baccarat";
import type { GamePlayProps } from "../shared/types";

/** Baccarat: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <BaccaratTable {...props} />;
}
