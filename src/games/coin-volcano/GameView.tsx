import { CoinVolcanoSlot } from "@/components/maxhigh/CoinVolcanoSlot";
import type { GamePlayProps } from "../shared/types";

/** Coin Volcano. */
export function GameView(props: GamePlayProps) {
  return <CoinVolcanoSlot {...props} />;
}
