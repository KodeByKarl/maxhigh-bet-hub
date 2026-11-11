import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Brass Zeppelin (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="brass-zeppelin" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "brass-zeppelin"} />
    </SkinnedGame>
  );
}
