import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./rocket-layout.css";

/** Rocket Rendezvous (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="rocket-rendezvous" skin={skin}>
      <header className="rv-identity">
        <span className="rv-identity__brand">RETRO LAUNCH WINDOW</span>
        <h1>
          Rocket <span>Rendezvous</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "rocket-rendezvous"} />
    </SkinnedGame>
  );
}
