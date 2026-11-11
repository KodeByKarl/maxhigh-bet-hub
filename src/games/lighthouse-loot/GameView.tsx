import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Lighthouse Loot (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="lighthouse-loot" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "lighthouse-loot"} />
    </SkinnedGame>
  );
}
