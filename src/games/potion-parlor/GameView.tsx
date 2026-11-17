import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./parlor-layout.css";

/** Potion Parlor (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="potion-parlor" skin={skin}>
      <header className="pz-identity">
        <span className="pz-identity__brand">BREW BRIGHT, BREW BOLD</span>
        <h1>
          Potion <span>Parlor</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "potion-parlor"} />
    </SkinnedGame>
  );
}
