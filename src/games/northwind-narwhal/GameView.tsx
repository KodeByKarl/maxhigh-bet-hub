import { RealmsSlot } from "@/components/maxhigh/RealmsSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Northwind Narwhal (Realms engine, own presentation). */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="northwind-narwhal" skin={skin}>
      <RealmsSlot {...props} gameId={props.gameId ?? "northwind-narwhal"} />
    </SkinnedGame>
  );
}
