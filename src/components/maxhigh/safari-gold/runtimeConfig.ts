/**
 * Active Safari Gold config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_SAFARI_GOLD_CONFIG,
  normalizeSafariGoldConfig,
  type SafariGoldConfig,
} from "@/lib/safari-gold-config";
import type { CellSym } from "./types";

let active: SafariGoldConfig = structuredClone(DEFAULT_SAFARI_GOLD_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getSafariGoldConfig(): SafariGoldConfig {
  return active;
}

export function setSafariGoldConfig(raw: unknown) {
  active = normalizeSafariGoldConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
