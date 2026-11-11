import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Frostbound Fjord (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="frostbound-fjord" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "frostbound-fjord"} />
    </SkinnedGame>
  );
}
