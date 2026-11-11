import { EmberTigerSlot } from "@/components/maxhigh/EmberTigerSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";
import "./ember-layout.css";

/** Ember Tiger. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="ember-tiger" skin={skin}>
      <EmberTigerSlot {...props} />
    </SkinnedGame>
  );
}
