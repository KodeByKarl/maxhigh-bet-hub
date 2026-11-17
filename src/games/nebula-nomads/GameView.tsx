import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./nebula-layout.css";

/** Nebula Nomads (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="nebula-nomads" skin={skin}>
      <header className="nn-identity">
        <span className="nn-identity__brand">WANDER THE DEEP VOID</span>
        <h1>
          Nebula <span>Nomads</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "nebula-nomads"} />
    </SkinnedGame>
  );
}
