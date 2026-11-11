import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Moonwell Mysteries (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="moonwell-mysteries" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "moonwell-mysteries"} />
    </SkinnedGame>
  );
}
