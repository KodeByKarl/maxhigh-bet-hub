import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./narwhal-layout.css";

/** Northwind Narwhal (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="northwind-narwhal" skin={skin}>
      <header className="nw-identity">
        <span className="nw-identity__brand">ARCTIC TIDES</span>
        <h1>
          Northwind <span>Narwhal</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "northwind-narwhal"} />
    </SkinnedGame>
  );
}
