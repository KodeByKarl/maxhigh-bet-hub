import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Tarot Twilight (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="tarot-twilight" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "tarot-twilight"} />
    </SkinnedGame>
  );
}
