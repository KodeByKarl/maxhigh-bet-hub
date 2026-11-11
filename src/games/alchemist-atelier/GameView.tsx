import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Alchemist Atelier (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="alchemist-atelier" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "alchemist-atelier"} />
    </SkinnedGame>
  );
}
