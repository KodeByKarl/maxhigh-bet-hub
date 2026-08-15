import {
  DEFAULT_DROP_DELUXE_CONFIG,
  type DropDeluxeConfig,
} from "@/lib/drop-deluxe-config";

let active: DropDeluxeConfig = structuredClone(DEFAULT_DROP_DELUXE_CONFIG);

export function getDropDeluxeConfig(): DropDeluxeConfig {
  return active;
}

export function setDropDeluxeConfig(cfg: DropDeluxeConfig) {
  active = cfg;
}
