/**
 * Active Lucky Neko config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_LUCKY_NEKO_CONFIG,
  normalizeLuckyNekoConfig,
  type LuckyNekoConfig,
} from "@/lib/lucky-neko-config";
import type { CellSym } from "./types";

let active: LuckyNekoConfig = structuredClone(DEFAULT_LUCKY_NEKO_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getLuckyNekoConfig(): LuckyNekoConfig {
  return active;
}

export function setLuckyNekoConfig(raw: unknown) {
  active = normalizeLuckyNekoConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
