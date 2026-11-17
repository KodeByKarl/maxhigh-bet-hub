import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

import "./snowglobe-layout.css";

/** Snowglobe Sorcery (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="snowglobe-sorcery" skin={skin}>
      <header className="sg-identity">
        <span className="sg-identity__brand">A WINTER WORLD IN GLASS</span>
        <h1>
          Snowglobe <span>Sorcery</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "snowglobe-sorcery"} />
    </SkinnedGame>
  );
}
