import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./monsoon-layout.css";

/** Monsoon Grove (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="monsoon-grove" skin={skin}>
      <header className="mg-identity">
        <span className="mg-identity__brand">RAIN ON THE CANOPY</span>
        <h1>
          Monsoon <span>Grove</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "monsoon-grove"} />
    </SkinnedGame>
  );
}
