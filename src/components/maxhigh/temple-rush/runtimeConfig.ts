/**
 * Active Pirate Plunder config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_TEMPLE_RUSH_CONFIG,
  normalizeTempleRushConfig,
  type TempleRushConfig,
} from "@/lib/temple-rush-config";
import type { CellSym } from "./types";

let active: TempleRushConfig = structuredClone(DEFAULT_TEMPLE_RUSH_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getTempleRushConfig(): TempleRushConfig {
  return active;
}

export function setTempleRushConfig(raw: unknown) {
  active = normalizeTempleRushConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
