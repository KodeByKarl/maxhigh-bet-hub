import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Thunderbird Totem (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="thunderbird-totem" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "thunderbird-totem"} />
    </SkinnedGame>
  );
}
