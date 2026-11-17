import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

import "./tortoise-layout.css";

/** Tortoise Treasury (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="tortoise-treasury" skin={skin}>
      <header className="tr-identity">
        <span className="tr-identity__brand">SLOW AND GOLDEN</span>
        <h1>
          Tortoise <span>Treasury</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "tortoise-treasury"} />
    </SkinnedGame>
  );
}
