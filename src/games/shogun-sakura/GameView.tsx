import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Shogun Sakura (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="shogun-sakura" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "shogun-sakura"} />
    </SkinnedGame>
  );
}
