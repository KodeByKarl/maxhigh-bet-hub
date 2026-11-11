import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Clockwork Cache (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="clockwork-cache" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "clockwork-cache"} />
    </SkinnedGame>
  );
}
