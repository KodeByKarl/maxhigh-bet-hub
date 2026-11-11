import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Obsidian Oracle (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="obsidian-oracle" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "obsidian-oracle"} />
    </SkinnedGame>
  );
}
