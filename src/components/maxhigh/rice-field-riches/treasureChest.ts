import type { RiceFieldRichesConfig } from "@/lib/rice-field-riches-config";
import { pickWeighted, type Rng } from "./rng";
import type { ChestCoin, TreasureChestScript, TreasureChestStep } from "./types";

function rollChest(rng: Rng, cfg: RiceFieldRichesConfig): ChestCoin {
  if (rng() < cfg.chestJackpotChance) {
    const jp = pickWeighted(rng, cfg.jackpots);
    return {
      reel: 0,
      row: 0,
      mult: jp.mult,
      jackpotId: jp.id,
      label: jp.label,
    };
  }
  const cv = pickWeighted(rng, cfg.coinValues);
  return {
    reel: 0,
    row: 0,
    mult: cv.mult,
    label: `${cv.mult}×`,
  };
}

/**
 * Treasure Chest Hold & Collect:
 * sticky chests, 3 respins, new chest resets to 3, full grid awards Legend jackpot.
 */
export function resolveTreasureChest(
  rng: Rng,
  totalBet: number,
  cfg: RiceFieldRichesConfig,
  triggerPositions: Array<[number, number]>,
): TreasureChestScript {
  const cells = cfg.reelsCount * cfg.maxReelHeight;
  const occupied = new Map<string, ChestCoin>();

  const triggerChests: ChestCoin[] = [];
  for (const [reel, row] of triggerPositions) {
    const coin = rollChest(rng, cfg);
    coin.reel = reel;
    coin.row = row;
    occupied.set(`${reel},${row}`, coin);
    triggerChests.push(coin);
  }

  let respins = cfg.chestRespins;
  const steps: TreasureChestStep[] = [];
  let stepIndex = 0;
  let filledGrid = false;
  let legendAwarded = false;

  while (respins > 0 && occupied.size < cells) {
    const newChests: ChestCoin[] = [];
    for (let r = 0; r < cfg.reelsCount; r++) {
      for (let row = 0; row < cfg.maxReelHeight; row++) {
        const key = `${r},${row}`;
        if (occupied.has(key)) continue;
        if (rng() < cfg.chestSpawnChance) {
          const coin = rollChest(rng, cfg);
          coin.reel = r;
          coin.row = row;
          occupied.set(key, coin);
          newChests.push(coin);
        }
      }
    }

    if (newChests.length > 0) respins = cfg.chestRespins;
    else respins -= 1;

    steps.push({
      stepIndex,
      respinsLeft: respins,
      chests: [...occupied.values()].map((c) => ({ ...c })),
      newChests,
    });
    stepIndex++;

    if (occupied.size >= cells) {
      filledGrid = true;
      break;
    }
    if (stepIndex > 80) break;
  }

  if (occupied.size >= cells) {
    filledGrid = true;
    legendAwarded = true;
  }

  let totalMult = 0;
  for (const c of occupied.values()) totalMult += c.mult;
  if (legendAwarded) {
    const legend = cfg.jackpots.find((j) => j.id === "legend");
    if (legend) totalMult += legend.mult;
  }

  return {
    triggerChests,
    steps,
    totalMult: +totalMult.toFixed(4),
    totalWin: +(totalMult * totalBet).toFixed(2),
    filledGrid,
    legendAwarded,
  };
}
