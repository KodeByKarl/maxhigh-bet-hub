import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Persian Peacock (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="persian-peacock" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "persian-peacock"} />
    </SkinnedGame>
  );
}
