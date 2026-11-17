import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./oracle-layout.css";

/** Obsidian Oracle (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="obsidian-oracle" skin={skin}>
      <header className="oo-identity">
        <span className="oo-identity__brand">FATE IN BLACK GLASS</span>
        <h1>
          Obsidian <span>Oracle</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "obsidian-oracle"} />
    </SkinnedGame>
  );
}
