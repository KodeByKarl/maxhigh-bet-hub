/**
 * Active Godly Gates config for the client/server engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_GODLY_GATES_CONFIG,
  normalizeGodlyGatesConfig,
  type GodlyGatesConfig,
} from "@/lib/godly-gates-config";
import type { CellSym } from "./types";

let active: GodlyGatesConfig = structuredClone(DEFAULT_GODLY_GATES_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getGodlyGatesConfig(): GodlyGatesConfig {
  return active;
}

export function setGodlyGatesConfig(raw: unknown) {
  active = normalizeGodlyGatesConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
