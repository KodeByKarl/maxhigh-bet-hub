import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Hexbound Library (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="hexbound-library" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "hexbound-library"} />
    </SkinnedGame>
  );
}
