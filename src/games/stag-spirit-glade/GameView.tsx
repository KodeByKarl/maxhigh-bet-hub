import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

import "./stag-layout.css";

/** Stag Spirit Glade (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="stag-spirit-glade" skin={skin}>
      <header className="stg-identity">
        <span className="stg-identity__brand">THE ANTLERED SPIRIT</span>
        <h1>
          Stag Spirit <span>Glade</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "stag-spirit-glade"} />
    </SkinnedGame>
  );
}
