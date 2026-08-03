import { betPerLine, type CnySymKind } from "@/lib/chinese-new-year-config";
import { resolveDragonFireworks } from "./dragonBonus";
import { resolveMonkeyTrigger } from "./monkeyBonus";
import { evaluatePaylines } from "./paylineEngine";
import {
  detectDragonTrigger,
  detectMonkeyTrigger,
  generateGrid,
} from "./reelGenerator";
import { createRng, newSpinSeed } from "./rng";
import { getChineseNewYearConfig } from "./runtimeConfig";
import type { FreeSpinScript, SpinScript } from "./types";

function applyCap(
  amount: number,
  already: number,
  maxPayout: number,
): { credited: number; hitCap: boolean } {
  if (!Number.isFinite(maxPayout)) return { credited: amount, hitCap: false };
  if (already >= maxPayout) return { credited: 0, hitCap: true };
  if (already + amount > maxPayout) {
    return { credited: +Math.max(0, maxPayout - already).toFixed(2), hitCap: true };
  }
  return { credited: amount, hitCap: false };
}

/**
 * Server-authoritative full spin resolution (Section 8).
 * Resolves base grid + Dragon Fireworks + Monkey Free Spins (inline) + max-win cap.
 * Gamble is player-initiated via a separate endpoint after this returns.
 */
export function resolveCnySpin(opts: {
  totalBet: number;
  isFreeSpins?: boolean;
  extraScatterSymbol?: CnySymKind | null;
  /** When true, skip Dragon/Monkey feature checks (Free Spins). */
  disableFeatureTriggers?: boolean;
  seed?: string;
}): SpinScript {
  const cfg = getChineseNewYearConfig();
  const totalBet = opts.totalBet;
  const isFreeSpins = !!opts.isFreeSpins;
  const disableFeatures = !!opts.disableFeatureTriggers || isFreeSpins;
  const extraScatterSymbol = isFreeSpins ? (opts.extraScatterSymbol ?? null) : null;
  const seed = opts.seed ?? newSpinSeed(isFreeSpins ? "cny-fs" : "cny");
  const rng = createRng(seed);

  const maxPayout =
    cfg.maxWinMult > 0 ? +(totalBet * cfg.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;

  const grid = generateGrid(rng, cfg, { isFreeSpins });
  const { wins: paylineWins, total: paylineWinRaw } = evaluatePaylines(grid, totalBet, cfg, {
    extraScatterSymbol,
  });

  let totalWin = 0;
  let hitCap = false;

  const pl = applyCap(paylineWinRaw, totalWin, maxPayout);
  const paylineWin = pl.credited;
  totalWin += paylineWin;
  hitCap = hitCap || pl.hitCap;

  let dragonBonus: SpinScript["dragonBonus"] = null;
  if (!disableFeatures && !hitCap && detectDragonTrigger(grid)) {
    const raw = resolveDragonFireworks(rng, totalBet, cfg);
    const capped = applyCap(raw.totalCoins, totalWin, maxPayout);
    dragonBonus = { ...raw, totalCoins: capped.credited };
    totalWin += capped.credited;
    hitCap = hitCap || capped.hitCap;
  }

  let monkeyBonus: SpinScript["monkeyBonus"] = null;
  const freeSpins: FreeSpinScript[] = [];
  let freeSpinsTotalWin = 0;

  if (!disableFeatures && !hitCap && detectMonkeyTrigger(grid)) {
    monkeyBonus = resolveMonkeyTrigger(rng, totalBet, cfg);
    const mt = applyCap(monkeyBonus.triggerPayout, totalWin, maxPayout);
    monkeyBonus = { ...monkeyBonus, triggerPayout: mt.credited };
    totalWin += mt.credited;
    hitCap = hitCap || mt.hitCap;

    // Resolve entire Free Spins sequence inline (no retriggers).
    for (let i = 0; i < monkeyBonus.freeSpinsAwarded && !hitCap; i++) {
      const fsSeed = `${seed}-fs-${i}`;
      const fsScript = resolveCnySpin({
        totalBet,
        isFreeSpins: true,
        extraScatterSymbol: monkeyBonus.extraScatterSymbol,
        disableFeatureTriggers: true,
        seed: fsSeed,
      });
      const fsWinRaw = fsScript.paylineWin;
      const fsCap = applyCap(fsWinRaw, totalWin, maxPayout);
      freeSpins.push({
        spinIndex: i,
        seed: fsSeed,
        grid: fsScript.grid,
        paylineWins: fsScript.paylineWins,
        paylineWin: fsCap.credited,
        dragonBonus: null,
        monkeyBonus: null,
        spinWin: fsCap.credited,
      });
      freeSpinsTotalWin += fsCap.credited;
      totalWin += fsCap.credited;
      hitCap = hitCap || fsCap.hitCap;
    }
  }

  const rawTotalWin = +(
    paylineWinRaw +
    (dragonBonus ? dragonBonus.totalCoins : 0) +
    (monkeyBonus ? monkeyBonus.triggerPayout : 0) +
    freeSpinsTotalWin
  ).toFixed(2);

  // Recompute raw more carefully — use uncapped components where possible
  // (dragon/monkey already may be capped; rawTotalWin ≈ totalWin when under cap)

  return {
    seed,
    totalBet,
    betPerLine: betPerLine(totalBet, cfg),
    grid,
    paylineWins,
    paylineWin,
    dragonBonus,
    monkeyBonus,
    freeSpins,
    freeSpinsTotalWin: +freeSpinsTotalWin.toFixed(2),
    rawTotalWin: hitCap ? rawTotalWin : +totalWin.toFixed(2),
    totalWin: +totalWin.toFixed(2),
    hitCap,
    gambleAvailable: totalWin > 0 && !isFreeSpins,
    isFreeSpins,
    extraScatterSymbol,
  };
}

/** Alias used by older imports / tests. */
export const resolveSpinScript = (bet: number, _ante = false, isFreeSpins = false) =>
  resolveCnySpin({ totalBet: bet, isFreeSpins });
