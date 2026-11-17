import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

import "./tarot-layout.css";

/** Tarot Twilight (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="tarot-twilight" skin={skin}>
      <header className="tt-identity">
        <span className="tt-identity__brand">THE CARDS FALL AT DUSK</span>
        <h1>
          Tarot <span>Twilight</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "tarot-twilight"} />
    </SkinnedGame>
  );
}
