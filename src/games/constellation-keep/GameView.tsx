import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Constellation Keep (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="constellation-keep" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "constellation-keep"} />
    </SkinnedGame>
  );
}
