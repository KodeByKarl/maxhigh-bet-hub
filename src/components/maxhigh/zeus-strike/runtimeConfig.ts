/**
 * Active Zeus Strike config for the client/server engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_ZEUS_STRIKE_CONFIG,
  normalizeZeusStrikeConfig,
  type ZeusStrikeConfig,
} from "@/lib/zeus-strike-config";
import type { CellSym } from "./types";

let active: ZeusStrikeConfig = structuredClone(DEFAULT_ZEUS_STRIKE_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getZeusStrikeConfig(): ZeusStrikeConfig {
  return active;
}

export function setZeusStrikeConfig(raw: unknown) {
  active = normalizeZeusStrikeConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
