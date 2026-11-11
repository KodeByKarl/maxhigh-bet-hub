import { JadeJaguarSlot } from "@/components/maxhigh/JadeJaguarSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./jade-layout.css";

/** Jade Jaguar. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="jade-jaguar" skin={skin}>
      <JadeJaguarSlot {...props} />
    </SkinnedGame>
  );
}
