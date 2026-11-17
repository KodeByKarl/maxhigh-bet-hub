import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./moonwell-layout.css";

/** Moonwell Mysteries (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="moonwell-mysteries" skin={skin}>
      <header className="mw-identity">
        <span className="mw-identity__brand">SILVER LIGHT, DEEP WATER</span>
        <h1>
          Moonwell <span>Mysteries</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "moonwell-mysteries"} />
    </SkinnedGame>
  );
}
