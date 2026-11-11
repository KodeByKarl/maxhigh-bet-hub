import { AceHighSlot } from "@/components/maxhigh/AceHighSlot";
import type { GamePlayProps } from "../shared/types";

/** Ace High: a table game with its own bespoke UI; entry point only, no slot skin. */
export function GameView(props: GamePlayProps) {
  return <AceHighSlot {...props} />;
}
