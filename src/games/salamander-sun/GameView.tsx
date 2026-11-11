import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Salamander Sun (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="salamander-sun" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "salamander-sun"} />
    </SkinnedGame>
  );
}
