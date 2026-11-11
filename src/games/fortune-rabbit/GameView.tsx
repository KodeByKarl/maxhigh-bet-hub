import { FortuneRabbitSlot } from "@/components/maxhigh/FortuneRabbitSlot";
import type { GamePlayProps } from "../shared/types";
import { SkinnedGame } from "../shared/layouts/SkinnedGame";
import { skin } from "./game.theme";

/** Fortune Rabbit. */
export function GameView(props: GamePlayProps) {
  return (
    <SkinnedGame gameId="fortune-rabbit" skin={skin}>
      <FortuneRabbitSlot {...props} />
    </SkinnedGame>
  );
}
