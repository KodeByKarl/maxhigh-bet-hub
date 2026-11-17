import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./meadow-layout.css";

/** Monarch Meadow (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="monarch-meadow" skin={skin}>
      <header className="mm-identity">
        <span className="mm-identity__brand">WINGS IN THE WILDFLOWERS</span>
        <h1>
          Monarch <span>Meadow</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "monarch-meadow"} />
    </SkinnedGame>
  );
}
