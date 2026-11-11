import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Stag Spirit Glade (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="stag-spirit-glade" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "stag-spirit-glade"} />
    </SkinnedGame>
  );
}
