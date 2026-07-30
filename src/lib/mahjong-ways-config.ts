/**
 * Mahjong Ways math & configuration — shared by server resolver and UI components.
 */

export const MAHJONG_WAYS_GAME_ID = "mahjong-ways";

export type MahjongSymKind =
  | "sym_10"
  | "sym_j"
  | "sym_q"
  | "sym_k"
  | "sym_a"
  | "bamboo"
  | "character"
  | "dot"
  | "red_dragon"
  | "green_dragon"
  | "wild"
  | "scatter";

export type MahjongSymbolConfig = {
  id: string;
  kind: MahjongSymKind;
  name: string;
  tier: "low" | "high" | "wild" | "scatter";
  weight: number;
  weightFreeSpins: number;
  /** Payout × bet for [3 reels, 4 reels, 5 reels] consecutive matching left-to-right */
  pay: [number, number, number];
  wild?: boolean;
  scatter?: boolean;
  isGold?: boolean;
};

export type MahjongWaysConfig = {
  schemaVersion: 1;
  reelsCount: number;
  minReelHeight: number;
  maxReelHeight: number;
  minConsecutiveReels: number;
  baseCascadeMultipliers: number[];
  freeSpinsCascadeMultipliers: number[];
  freeSpinsTriggerCount: number;
  freeSpinsBaseCount: number;
  freeSpinsExtraPerScatter: number;
  freeSpinsRetriggerCount: number;
  buyFeatureMult: number;
  anteBetMult: number;
  anteScatterWeightMult: number;
  targetRtp: number;
  symbols: MahjongSymbolConfig[];
};

export const SYMBOL_NAMES: Record<MahjongSymKind, string> = {
  sym_10: "10 Tile",
  sym_j: "J Tile",
  sym_q: "Q Tile",
  sym_k: "K Tile",
  sym_a: "A Tile",
  bamboo: "5 Bamboo (五条)",
  character: "8 Character (八万)",
  dot: "5 Circle (五饼)",
  red_dragon: "Red Dragon (紅中)",
  green_dragon: "Green Dragon (發財)",
  wild: "Golden Ingot Wild",
  scatter: "Mahjong Gold Scatter",
};

export const DEFAULT_MAHJONG_WAYS_CONFIG: MahjongWaysConfig = {
  schemaVersion: 1,
  reelsCount: 5,
  minReelHeight: 4,
  maxReelHeight: 4,
  minConsecutiveReels: 3,
  baseCascadeMultipliers: [1, 2, 3, 5],
  freeSpinsCascadeMultipliers: [2, 4, 6, 10],
  freeSpinsTriggerCount: 3,
  freeSpinsBaseCount: 10,
  freeSpinsExtraPerScatter: 2,
  freeSpinsRetriggerCount: 10,
  buyFeatureMult: 100,
  anteBetMult: 1.25,
  anteScatterWeightMult: 1.8,
  targetRtp: 96.5,
  symbols: [
    {
      id: "sym_10",
      kind: "sym_10",
      name: "10 Tile",
      tier: "low",
      weight: 140,
      weightFreeSpins: 110,
      pay: [0.014, 0.042, 0.11],
    },
    {
      id: "sym_j",
      kind: "sym_j",
      name: "J Tile",
      tier: "low",
      weight: 120,
      weightFreeSpins: 100,
      pay: [0.02, 0.055, 0.14],
    },
    {
      id: "sym_q",
      kind: "sym_q",
      name: "Q Tile",
      tier: "low",
      weight: 100,
      weightFreeSpins: 90,
      pay: [0.028, 0.07, 0.17],
    },
    {
      id: "sym_k",
      kind: "sym_k",
      name: "K Tile",
      tier: "low",
      weight: 85,
      weightFreeSpins: 80,
      pay: [0.035, 0.085, 0.21],
    },
    {
      id: "sym_a",
      kind: "sym_a",
      name: "A Tile",
      tier: "low",
      weight: 75,
      weightFreeSpins: 70,
      pay: [0.042, 0.11, 0.28],
    },
    {
      id: "bamboo",
      kind: "bamboo",
      name: "5 Bamboo",
      tier: "high",
      weight: 55,
      weightFreeSpins: 50,
      pay: [0.07, 0.17, 0.42],
    },
    {
      id: "character",
      kind: "character",
      name: "8 Character",
      tier: "high",
      weight: 40,
      weightFreeSpins: 40,
      pay: [0.11, 0.25, 0.62],
    },
    {
      id: "dot",
      kind: "dot",
      name: "5 Circle",
      tier: "high",
      weight: 30,
      weightFreeSpins: 30,
      pay: [0.14, 0.35, 0.83],
    },
    {
      id: "red_dragon",
      kind: "red_dragon",
      name: "Red Dragon",
      tier: "high",
      weight: 20,
      weightFreeSpins: 22,
      pay: [0.21, 0.55, 1.38],
    },
    {
      id: "green_dragon",
      kind: "green_dragon",
      name: "Green Dragon",
      tier: "high",
      weight: 10,
      weightFreeSpins: 12,
      pay: [0.35, 0.90, 2.48],
    },
    {
      id: "wild",
      kind: "wild",
      name: "Gold Ingot Wild",
      tier: "wild",
      weight: 8,
      weightFreeSpins: 12,
      pay: [0, 0, 0],
      wild: true,
    },
    {
      id: "scatter",
      kind: "scatter",
      name: "Mahjong Gold Scatter",
      tier: "scatter",
      weight: 6,
      weightFreeSpins: 4,
      pay: [0.7, 2.1, 7.0],
      scatter: true,
    },
  ],
};

export function normalizeMahjongWaysConfig(raw: unknown): MahjongWaysConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_MAHJONG_WAYS_CONFIG;
  const obj = raw as Partial<MahjongWaysConfig>;
  return {
    schemaVersion: 1,
    reelsCount: obj.reelsCount ?? DEFAULT_MAHJONG_WAYS_CONFIG.reelsCount,
    minReelHeight: obj.minReelHeight ?? DEFAULT_MAHJONG_WAYS_CONFIG.minReelHeight,
    maxReelHeight: obj.maxReelHeight ?? DEFAULT_MAHJONG_WAYS_CONFIG.maxReelHeight,
    minConsecutiveReels: obj.minConsecutiveReels ?? DEFAULT_MAHJONG_WAYS_CONFIG.minConsecutiveReels,
    baseCascadeMultipliers: obj.baseCascadeMultipliers ?? DEFAULT_MAHJONG_WAYS_CONFIG.baseCascadeMultipliers,
    freeSpinsCascadeMultipliers:
      obj.freeSpinsCascadeMultipliers ?? DEFAULT_MAHJONG_WAYS_CONFIG.freeSpinsCascadeMultipliers,
    freeSpinsTriggerCount: obj.freeSpinsTriggerCount ?? DEFAULT_MAHJONG_WAYS_CONFIG.freeSpinsTriggerCount,
    freeSpinsBaseCount: obj.freeSpinsBaseCount ?? DEFAULT_MAHJONG_WAYS_CONFIG.freeSpinsBaseCount,
    freeSpinsExtraPerScatter:
      obj.freeSpinsExtraPerScatter ?? DEFAULT_MAHJONG_WAYS_CONFIG.freeSpinsExtraPerScatter,
    freeSpinsRetriggerCount: obj.freeSpinsRetriggerCount ?? DEFAULT_MAHJONG_WAYS_CONFIG.freeSpinsRetriggerCount,
    buyFeatureMult: obj.buyFeatureMult ?? DEFAULT_MAHJONG_WAYS_CONFIG.buyFeatureMult,
    anteBetMult: obj.anteBetMult ?? DEFAULT_MAHJONG_WAYS_CONFIG.anteBetMult,
    anteScatterWeightMult: obj.anteScatterWeightMult ?? DEFAULT_MAHJONG_WAYS_CONFIG.anteScatterWeightMult,
    targetRtp: obj.targetRtp ?? DEFAULT_MAHJONG_WAYS_CONFIG.targetRtp,
    symbols: Array.isArray(obj.symbols) && obj.symbols.length > 0 ? obj.symbols : DEFAULT_MAHJONG_WAYS_CONFIG.symbols,
  };
}
