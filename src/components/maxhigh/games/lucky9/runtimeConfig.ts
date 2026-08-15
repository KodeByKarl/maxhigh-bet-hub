import { DEFAULT_LUCKY9_CONFIG, type Lucky9Config } from "@/lib/lucky9-config";

/** Framework-agnostic singleton — server injects DB config before resolve. */
let active: Lucky9Config = structuredClone(DEFAULT_LUCKY9_CONFIG);

export function getLucky9Config(): Lucky9Config {
  return active;
}

export function setLucky9Config(cfg: Lucky9Config) {
  active = cfg;
}
