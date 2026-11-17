import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

import "./steamforge-layout.css";

/** Steamforge Express (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="steamforge-express" skin={skin}>
      <header className="se-identity">
        <span className="se-identity__brand">ALL ABOARD THE FORGE</span>
        <h1>
          Steamforge <span>Express</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "steamforge-express"} />
    </SkinnedGame>
  );
}
