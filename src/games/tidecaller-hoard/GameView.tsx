import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Tidecaller Hoard (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="tidecaller-hoard" skin={skin}>
      <div className="tide-title" aria-hidden="true">
        <svg viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="14" />
          <path d="m18 2 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" />
          <path d="m18 9 3 9-3 9-3-9Z" />
        </svg>
        <span>Tidecaller Hoard</span>
      </div>
      <RealmsSlot {...props} gameId={props.gameId ?? "tidecaller-hoard"} />
    </SkinnedGame>
  );
}
