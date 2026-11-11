import { ProsperityLionSlot } from "@/components/maxhigh/ProsperityLionSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./lion-layout.css";

/** Prosperity Lion. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="prosperity-lion" skin={skin}>
      <ProsperityLionSlot {...props} />
    </SkinnedGame>
  );
}
