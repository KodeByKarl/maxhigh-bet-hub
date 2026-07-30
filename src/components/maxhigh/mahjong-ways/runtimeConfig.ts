import type { MahjongWaysConfig } from "@/lib/mahjong-ways-config";
import { DEFAULT_MAHJONG_WAYS_CONFIG } from "@/lib/mahjong-ways-config";

let activeConfig: MahjongWaysConfig = { ...DEFAULT_MAHJONG_WAYS_CONFIG };

export function getMahjongWaysConfig(): MahjongWaysConfig {
  return activeConfig;
}

export function setMahjongWaysConfig(cfg: MahjongWaysConfig) {
  activeConfig = cfg;
}
