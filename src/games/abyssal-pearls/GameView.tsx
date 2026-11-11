import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Abyssal Pearls (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="abyssal-pearls" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "abyssal-pearls"} />
    </SkinnedGame>
  );
}
