import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

import "./thunderbird-layout.css";

/** Thunderbird Totem (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="thunderbird-totem" skin={skin}>
      <header className="tb-identity">
        <span className="tb-identity__brand">STORM-BORN SPIRIT</span>
        <h1>
          Thunderbird <span>Totem</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "thunderbird-totem"} />
    </SkinnedGame>
  );
}
