import { MidnightOwlSlot } from "@/components/maxhigh/MidnightOwlSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Midnight Owl. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="midnight-owl" skin={skin}>
      <MidnightOwlSlot {...props} />
    </SkinnedGame>
  );
}
