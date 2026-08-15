import type { MahjongWays3Config } from "@/lib/mahjong-ways-3-config";
import { DEFAULT_MAHJONG_WAYS_3_CONFIG } from "@/lib/mahjong-ways-3-config";

let activeConfig: MahjongWays3Config = { ...DEFAULT_MAHJONG_WAYS_3_CONFIG };

export function getMahjongWays3Config(): MahjongWays3Config {
  return activeConfig;
}

export function setMahjongWays3Config(cfg: MahjongWays3Config) {
  activeConfig = cfg;
}
