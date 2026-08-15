import {
  DEFAULT_COLOR_GAME_PRO_CONFIG,
  type ColorGameProConfig,
} from "@/lib/color-game-pro-config";

let active: ColorGameProConfig = structuredClone(DEFAULT_COLOR_GAME_PRO_CONFIG);

export function getColorGameProConfig(): ColorGameProConfig {
  return active;
}

export function setColorGameProConfig(cfg: ColorGameProConfig) {
  active = cfg;
}
