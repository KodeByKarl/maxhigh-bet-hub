import {
  DEFAULT_COLOR_GAME_CONFIG,
  type ColorGameConfig,
} from "@/lib/color-game-config";

let active: ColorGameConfig = structuredClone(DEFAULT_COLOR_GAME_CONFIG);

export function getColorGameConfig(): ColorGameConfig {
  return active;
}

export function setColorGameConfig(cfg: ColorGameConfig) {
  active = cfg;
}
