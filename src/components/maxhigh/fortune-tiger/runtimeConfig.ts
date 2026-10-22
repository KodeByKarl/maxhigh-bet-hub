/**
 * Active Fortune Tiger config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_FORTUNE_TIGER_CONFIG,
  normalizeFortuneTigerConfig,
  type FortuneTigerConfig,
} from "@/lib/fortune-tiger-config";
import type { CellSym } from "./types";

let active: FortuneTigerConfig = structuredClone(DEFAULT_FORTUNE_TIGER_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getFortuneTigerConfig(): FortuneTigerConfig {
  return active;
}

export function setFortuneTigerConfig(raw: unknown) {
  active = normalizeFortuneTigerConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
