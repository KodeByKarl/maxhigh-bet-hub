import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./orchid-layout.css";

/** Orchid Oasis (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="orchid-oasis" skin={skin}>
      <header className="oc-identity">
        <span className="oc-identity__brand">BLOOMS BY STILL WATER</span>
        <h1>
          Orchid <span>Oasis</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "orchid-oasis"} />
    </SkinnedGame>
  );
}
