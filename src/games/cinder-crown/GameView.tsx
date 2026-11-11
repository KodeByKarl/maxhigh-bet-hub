import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Cinder Crown (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="cinder-crown" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "cinder-crown"} />
    </SkinnedGame>
  );
}
