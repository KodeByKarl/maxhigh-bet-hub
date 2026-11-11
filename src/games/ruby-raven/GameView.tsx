import { RubyRavenSlot } from "@/components/maxhigh/RubyRavenSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Ruby Raven. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="ruby-raven" skin={skin}>
      <RubyRavenSlot {...props} />
    </SkinnedGame>
  );
}
