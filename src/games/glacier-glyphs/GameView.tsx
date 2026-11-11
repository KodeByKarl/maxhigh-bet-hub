import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Glacier Glyphs (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="glacier-glyphs" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "glacier-glyphs"} />
    </SkinnedGame>
  );
}
