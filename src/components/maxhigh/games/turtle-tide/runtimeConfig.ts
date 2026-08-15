import {
  DEFAULT_TURTLE_TIDE_CONFIG,
  type TurtleTideConfig,
} from "@/lib/turtle-tide-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: TurtleTideConfig = structuredClone(DEFAULT_TURTLE_TIDE_CONFIG);

export function getTurtleTideConfig(): TurtleTideConfig {
  return active;
}

export function setTurtleTideConfig(cfg: TurtleTideConfig) {
  active = cfg;
}
