/**
 * Active Olympus Wrath config for the client/server engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_OLYMPUS_WRATH_CONFIG,
  normalizeOlympusWrathConfig,
  type OlympusWrathConfig,
} from "@/lib/olympus-wrath-config";
import type { CellSym } from "./types";

let active: OlympusWrathConfig = structuredClone(DEFAULT_OLYMPUS_WRATH_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getOlympusWrathConfig(): OlympusWrathConfig {
  return active;
}

export function setOlympusWrathConfig(raw: unknown) {
  active = normalizeOlympusWrathConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
