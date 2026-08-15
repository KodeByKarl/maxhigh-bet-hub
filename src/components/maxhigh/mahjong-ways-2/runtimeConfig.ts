import type { MahjongWays2Config } from "@/lib/mahjong-ways-2-config";
import { DEFAULT_MAHJONG_WAYS_2_CONFIG } from "@/lib/mahjong-ways-2-config";

let activeConfig: MahjongWays2Config = { ...DEFAULT_MAHJONG_WAYS_2_CONFIG };

export function getMahjongWays2Config(): MahjongWays2Config {
  return activeConfig;
}

export function setMahjongWays2Config(cfg: MahjongWays2Config) {
  activeConfig = cfg;
}
