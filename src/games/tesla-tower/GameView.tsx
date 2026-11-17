import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

import "./tesla-layout.css";

/** Tesla Tower (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="tesla-tower" skin={skin}>
      <header className="ts-identity">
        <span className="ts-identity__brand">LIGHTNING ON THE WIRE</span>
        <h1>
          Tesla <span>Tower</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "tesla-tower"} />
    </SkinnedGame>
  );
}
