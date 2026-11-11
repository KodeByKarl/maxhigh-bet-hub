import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Magma Anvil (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="magma-anvil" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "magma-anvil"} />
    </SkinnedGame>
  );
}
