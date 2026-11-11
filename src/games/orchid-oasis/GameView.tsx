import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Orchid Oasis (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="orchid-oasis" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "orchid-oasis"} />
    </SkinnedGame>
  );
}
