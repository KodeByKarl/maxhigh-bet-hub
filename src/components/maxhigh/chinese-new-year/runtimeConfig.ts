import {
  configToCellSyms,
  DEFAULT_CHINESE_NEW_YEAR_CONFIG,
  normalizeChineseNewYearConfig,
  type ChineseNewYearConfig,
} from "@/lib/chinese-new-year-config";
import type { CellSym } from "./types";

let active: ChineseNewYearConfig = structuredClone(DEFAULT_CHINESE_NEW_YEAR_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getChineseNewYearConfig(): ChineseNewYearConfig {
  return active;
}

export function setChineseNewYearConfig(raw: unknown) {
  active = normalizeChineseNewYearConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
