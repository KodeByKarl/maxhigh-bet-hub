import { ThorThunderSlot } from "@/components/maxhigh/ThorThunderSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Thor Thunder. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="thor-thunder" skin={skin}>
      <div className="thunder-crest" aria-hidden="true">
        <svg viewBox="0 0 40 44" fill="none">
          <path d="M5 5h30l3 5v14l-5 4h-9v13h-8V28H7l-5-4V10Z" />
          <path d="m22 8-8 11h7l-3 7 10-12h-8Z" />
        </svg>
        <span>
          Thor Thunder<small>Forge of Asgard</small>
        </span>
      </div>
      <ThorThunderSlot {...props} />
    </SkinnedGame>
  );
}
