import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Polar Prism (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="polar-prism" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "polar-prism"} />
    </SkinnedGame>
  );
}
