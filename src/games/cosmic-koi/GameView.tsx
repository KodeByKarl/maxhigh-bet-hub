import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Cosmic Koi (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="cosmic-koi" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "cosmic-koi"} />
    </SkinnedGame>
  );
}
