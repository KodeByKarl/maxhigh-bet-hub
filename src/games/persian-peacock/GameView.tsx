import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./peacock-layout.css";

/** Persian Peacock (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="persian-peacock" skin={skin}>
      <header className="pp-identity">
        <span className="pp-identity__brand">JEWELS OF THE PALACE</span>
        <h1>
          Persian <span>Peacock</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "persian-peacock"} />
    </SkinnedGame>
  );
}
