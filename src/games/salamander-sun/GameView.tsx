import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./salamander-layout.css";

/** Salamander Sun (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="salamander-sun" skin={skin}>
      <header className="ss-identity">
        <span className="ss-identity__brand">WARM GOLD, LIVING FIRE</span>
        <h1>
          Salamander <span>Sun</span>
        </h1>
      </header>
      <RealmsSlot {...props} gameId={props.gameId ?? "salamander-sun"} />
    </SkinnedGame>
  );
}
