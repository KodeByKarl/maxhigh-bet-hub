import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./magma-layout.css";

/** Magma Anvil (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="magma-anvil" skin={skin}>
      <header className="ma-identity">
        <span className="ma-identity__brand">FORGED IN MOLTEN STONE</span>
        <h1>
          Magma <span>Anvil</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "magma-anvil"} />
    </SkinnedGame>
  );
}
