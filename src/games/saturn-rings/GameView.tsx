import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

import "./saturn-layout.css";

/** Saturn Rings (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="saturn-rings" skin={skin}>
      <header className="sn-identity">
        <span className="sn-identity__brand">RIDING THE RINGS</span>
        <h1>
          Saturn <span>Rings</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "saturn-rings"} />
    </SkinnedGame>
  );
}
