import { TongitsArenaTable } from "@/components/maxhigh/games/tongits-arena";
import type { GamePlayProps } from "../shared/types";

/** Tongits Arena: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <TongitsArenaTable {...props} />;
}
