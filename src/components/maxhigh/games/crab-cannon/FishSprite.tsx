import type { FishTierId } from "@/lib/crab-cannon-config";
import { FAUNA } from "../fishing-shared/fauna";
import { FaunaFish } from "../fishing-shared/species";

const CAST = FAUNA["crab-cannon"];

export function FishSprite(props: {
  tierId: FishTierId;
  size?: number;
  flipped?: boolean;
  hitFlash?: boolean;
  frozen?: boolean;
  className?: string;
  animSeed?: number;
}) {
  return <FaunaFish {...props} spec={CAST[props.tierId]} crate={CAST.crate.pal} />;
}
