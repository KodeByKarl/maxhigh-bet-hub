import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

import "./shogun-layout.css";

/** Shogun Sakura (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="shogun-sakura" skin={skin}>
      <header className="sk-identity">
        <span className="sk-identity__brand">BLOSSOMS AND BLADES</span>
        <h1>
          Shogun <span>Sakura</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "shogun-sakura"} />
    </SkinnedGame>
  );
}
