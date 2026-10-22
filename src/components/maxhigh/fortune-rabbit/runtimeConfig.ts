/**
 * Active Fortune Rabbit config for the client engine.
 * Superadmin values are loaded at play time; defaults until then.
 */
import {
  configToCellSyms,
  DEFAULT_FORTUNE_RABBIT_CONFIG,
  normalizeFortuneRabbitConfig,
  type FortuneRabbitConfig,
} from "@/lib/fortune-rabbit-config";
import type { CellSym } from "./types";

let active: FortuneRabbitConfig = structuredClone(DEFAULT_FORTUNE_RABBIT_CONFIG);
let cellSyms: CellSym[] = configToCellSyms(active) as CellSym[];

export function getFortuneRabbitConfig(): FortuneRabbitConfig {
  return active;
}

export function setFortuneRabbitConfig(raw: unknown) {
  active = normalizeFortuneRabbitConfig(raw);
  cellSyms = configToCellSyms(active) as CellSym[];
}

export function getRuntimeSymbols(): CellSym[] {
  return cellSyms;
}

export function getRuntimeSymbol(id: string): CellSym | undefined {
  return cellSyms.find((s) => s.id === id);
}
