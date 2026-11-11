import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Tidecaller Hoard (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="tidecaller-hoard" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "tidecaller-hoard"} />
    </SkinnedGame>
  );
}
