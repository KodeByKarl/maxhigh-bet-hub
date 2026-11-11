import { DropDeluxeTable } from "@/components/maxhigh/games/drop-deluxe";
import type { GamePlayProps } from "../shared/types";

/** Deluxe Draw: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <DropDeluxeTable {...props} />;
}
