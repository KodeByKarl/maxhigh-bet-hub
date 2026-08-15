/**
 * Active Mystic Runes config for the client/server engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_MYSTIC_RUNES_CONFIG,
  normalizeMysticRunesConfig,
  type MysticRunesConfig,
} from "@/lib/mystic-runes-config";
import type { CellSym } from "./types";

let active: MysticRunesConfig = structuredClone(DEFAULT_MYSTIC_RUNES_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getMysticRunesConfig(): MysticRunesConfig {
  return active;
}

export function setMysticRunesConfig(raw: unknown) {
  active = normalizeMysticRunesConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
