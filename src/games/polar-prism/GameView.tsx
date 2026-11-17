import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./prism-layout.css";

/** Polar Prism (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="polar-prism" skin={skin}>
      <header className="pr-identity">
        <span className="pr-identity__brand">LIGHT BENT THROUGH ICE</span>
        <h1>
          Polar <span>Prism</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "polar-prism"} />
    </SkinnedGame>
  );
}
