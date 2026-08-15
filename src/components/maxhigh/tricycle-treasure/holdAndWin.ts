import { totalCells, type TricycleTreasureConfig } from "@/lib/tricycle-treasure-config";
import { pickWeighted, type Rng } from "./rng";
import type { HoldCoin, HoldWinScript, HoldWinStep } from "./types";

function rollCoin(rng: Rng, cfg: TricycleTreasureConfig, _totalBet: number): HoldCoin {
  if (rng() < (cfg.holdWinJackpotChance ?? 0.025)) {
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
 * Hold & Win: lock trigger coins, 3 respins, reset on new coin,
 * end on 0 respins or full diamond (sum of reelHeights).
 */
export function resolveHoldAndWin(
  rng: Rng,
  totalBet: number,
  cfg: TricycleTreasureConfig,
  triggerPositions: Array<[number, number]>,
): HoldWinScript {
  const cells = totalCells(cfg);
  const occupied = new Map<string, HoldCoin>();

  const triggerCoins: HoldCoin[] = [];
  for (const [reel, row] of triggerPositions) {
    const coin = rollCoin(rng, cfg, totalBet);
    coin.reel = reel;
    coin.row = row;
    occupied.set(`${reel},${row}`, coin);
    triggerCoins.push(coin);
  }

  let respins = cfg.holdWinRespins;
  const steps: HoldWinStep[] = [];
  let stepIndex = 0;
  let filledGrid = occupied.size >= cells;
  let grandAwarded = false;

  while (respins > 0 && occupied.size < cells) {
    const newCoins: HoldCoin[] = [];
    for (let r = 0; r < cfg.reelsCount; r++) {
      const height = cfg.reelHeights?.[r] ?? cfg.rowsCount;
      for (let row = 0; row < height; row++) {
        const key = `${r},${row}`;
        if (occupied.has(key)) continue;
        if (rng() < cfg.holdWinCoinChance) {
          const coin = rollCoin(rng, cfg, totalBet);
          coin.reel = r;
          coin.row = row;
          occupied.set(key, coin);
          newCoins.push(coin);
        }
      }
    }

    if (newCoins.length > 0) respins = cfg.holdWinRespins;
    else respins -= 1;

    steps.push({
      stepIndex,
      respinsLeft: respins,
      coins: [...occupied.values()].map((c) => ({ ...c })),
      newCoins,
    });
    stepIndex++;

    if (occupied.size >= cells) {
      filledGrid = true;
      break;
    }
    if (stepIndex > 80) break; // safety
  }

  if (occupied.size >= cells) {
    filledGrid = true;
    grandAwarded = true;
  }

  let totalMult = 0;
  for (const c of occupied.values()) totalMult += c.mult;
  if (grandAwarded) {
    const grand = cfg.jackpots.find((j) => j.id === "grand");
    if (grand) totalMult += grand.mult;
  }

  const totalWin = +(totalMult * totalBet).toFixed(2);

  return {
    triggerCoins,
    steps,
    totalMult: +totalMult.toFixed(4),
    totalWin,
    filledGrid,
    grandAwarded,
  };
}
