import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Nebula Nomads (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="nebula-nomads" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "nebula-nomads"} />
    </SkinnedGame>
  );
}
