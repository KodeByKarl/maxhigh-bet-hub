import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Crystal Grimoire (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="crystal-grimoire" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "crystal-grimoire"} />
    </SkinnedGame>
  );
}
