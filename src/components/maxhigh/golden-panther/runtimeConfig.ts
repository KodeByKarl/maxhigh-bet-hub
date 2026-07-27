/**
 * Active Panther Peak config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_GOLDEN_PANTHER_CONFIG,
  normalizeGoldenPantherConfig,
  type GoldenPantherConfig,
} from "@/lib/golden-panther-config";
import type { CellSym } from "./types";

let active: GoldenPantherConfig = structuredClone(DEFAULT_GOLDEN_PANTHER_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getGoldenPantherConfig(): GoldenPantherConfig {
  return active;
}

export function setGoldenPantherConfig(raw: unknown) {
  active = normalizeGoldenPantherConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
