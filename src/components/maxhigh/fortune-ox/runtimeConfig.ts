/**
 * Active Fortune Ox config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_FORTUNE_OX_CONFIG,
  normalizeFortuneOxConfig,
  type FortuneOxConfig,
} from "@/lib/fortune-ox-config";
import type { CellSym } from "./types";

let active: FortuneOxConfig = structuredClone(DEFAULT_FORTUNE_OX_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getFortuneOxConfig(): FortuneOxConfig {
  return active;
}

export function setFortuneOxConfig(raw: unknown) {
  active = normalizeFortuneOxConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
