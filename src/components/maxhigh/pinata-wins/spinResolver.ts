import {
  calcFreeSpinsAward,
  calcFreeSpinsRetrigger,
} from "@/lib/pinata-wins-config";
import { resolveGoldFramesInWins, effectiveGoldMult } from "./goldFrameEngine";
import { evaluatePaylines } from "./paylineEngine";
import { countKind, generateGrid } from "./reelGenerator";
import { createRng, newSpinSeed } from "./rng";
import { getPinataWinsConfig } from "./runtimeConfig";
import { applyGravity } from "./tumbleEngine";
import { cloneGrid, type CascadeStep, type FreeSpinsSessionScript, type SpinScript } from "./types";

const MAX_CASCADES = 40;
const MAX_FS_SPINS = 500;

function applyCap(amount: number, already: number, maxPayout: number) {
  if (!Number.isFinite(maxPayout)) return { credited: amount, hitCap: false };
  if (already >= maxPayout) return { credited: 0, hitCap: true };
  if (already + amount > maxPayout) {
    return { credited: +Math.max(0, maxPayout - already).toFixed(2), hitCap: true };
  }
  return { credited: amount, hitCap: false };
}

/**
 * Resolve a single spin (base or one free spin):
 * generate → payline eval → Gold Frame collect+transform → cascade loop →
 * apply collected mult to aggregate → Scatter FS award.
 *
 * Free Spins persistent mult:
 * - persistentMultBefore is the session accumulator entering this spin
 * - Collections during this spin raise persistentMultAfter
 * - Applied mult depends on cfg.fsMultApplyTiming (same_spin | next_spin)
 * Base game: persistent mult unused; only this-spin Gold Frame collect applies.
 */
export function resolvePinataSpin(opts: {
  totalBet: number;
  isFreeSpins?: boolean;
  seed?: string;
  /** Persistent FS Gold Frame accumulator entering this spin */
  persistentMult?: number;
  /** How many FS retriggers already awarded this session (for cap) */
  retriggersAlready?: number;
  /** Wins already credited toward max-win cap this round */
  alreadyTowardCap?: number;
  /** Forced initial grid (unit tests) */
  grid?: ReturnType<typeof generateGrid>;
}): SpinScript {
  const cfg = getPinataWinsConfig();
  const totalBet = opts.totalBet;
  const isFreeSpins = !!opts.isFreeSpins;
  const seed = opts.seed ?? newSpinSeed(isFreeSpins ? "pw-fs" : "pw");
  const rng = createRng(seed);

  const maxPayout =
    cfg.maxWinMult > 0 ? +(totalBet * cfg.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;
  const alreadyTowardCap = Math.max(0, opts.alreadyTowardCap ?? 0);

  const persistentMultBefore = Math.max(0, opts.persistentMult ?? 0);
  let spinCollected = 0;
  let grid = opts.grid ? cloneGrid(opts.grid) : generateGrid(rng, cfg, { isFreeSpins });

  const steps: CascadeStep[] = [];
  let paylineWinRaw = 0;
  let peakScatter = 0;
  let hitCap = false;

  for (let cascadeIndex = 0; cascadeIndex < MAX_CASCADES; cascadeIndex++) {
    const { wins, total: rawLine } = evaluatePaylines(grid, totalBet, cfg);
    const scatterCount = countKind(grid, "scatter");
    if (scatterCount > peakScatter) peakScatter = scatterCount;

    paylineWinRaw += rawLine;

    const gf = resolveGoldFramesInWins(grid, wins, cfg, spinCollected);
    spinCollected = gf.collectedTotal;

    steps.push({
      stepIndex: cascadeIndex,
      grid: cloneGrid(grid),
      paylineWins: wins,
      paylineWin: rawLine,
      removed: gf.remove,
      goldCollected: gf.goldCollected,
      transformToWild: gf.transformToWild,
    });

    if (wins.length === 0) break;

    grid = applyGravity(grid, gf.remove, gf.transformToWild, rng, cfg, isFreeSpins);
  }

  // Aggregate Gold Frame application
  let goldFrameAppliedMult: number;
  let persistentMultAfter = persistentMultBefore;

  if (isFreeSpins) {
    if (cfg.fsMultApplyTiming === "same_spin") {
      persistentMultAfter = persistentMultBefore + spinCollected;
      goldFrameAppliedMult = effectiveGoldMult(persistentMultAfter);
    } else {
      // next_spin: apply entering mult only; collections raise for subsequent spins
      goldFrameAppliedMult = effectiveGoldMult(persistentMultBefore);
      persistentMultAfter = persistentMultBefore + spinCollected;
    }
  } else {
    goldFrameAppliedMult = effectiveGoldMult(spinCollected);
    persistentMultAfter = spinCollected;
  }

  const rawAfterMult = +(paylineWinRaw * goldFrameAppliedMult).toFixed(2);
  const capped = applyCap(rawAfterMult, alreadyTowardCap, maxPayout);
  const totalWin = capped.credited;
  hitCap = capped.hitCap;

  let freeSpinsAwarded = 0;
  if (isFreeSpins) {
    freeSpinsAwarded = calcFreeSpinsRetrigger(
      peakScatter,
      opts.retriggersAlready ?? 0,
      cfg,
    );
  } else {
    freeSpinsAwarded = calcFreeSpinsAward(peakScatter, cfg);
  }

  const first = steps[0]!;
  const finalGrid = steps.length ? steps[steps.length - 1]!.grid : grid;

  return {
    seed,
    steps,
    grid: finalGrid,
    paylineWins: first.paylineWins,
    paylineWinRaw: +paylineWinRaw.toFixed(2),
    goldFrameCollected: spinCollected,
    goldFrameAppliedMult,
    paylineWin: totalWin,
    scatterCount: peakScatter,
    freeSpinsAwarded,
    totalWin,
    hitCap: hitCap || undefined,
    persistentMultBefore,
    persistentMultAfter,
  };
}

/**
 * Resolve a full Free Spins session in one pass (simulation / audit).
 * Starts with awarded spin count and persistent mult = 0.
 */
export function resolvePinataFreeSpinsSession(opts: {
  totalBet: number;
  freeSpinsAwarded: number;
  seed?: string;
  /** Wins already credited toward the max-win cap (e.g. base spin) */
  alreadyTowardCap?: number;
}): FreeSpinsSessionScript {
  const cfg = getPinataWinsConfig();
  const seed = opts.seed ?? newSpinSeed("pw-fs-session");
  const rng = createRng(seed);
  const maxPayout =
    cfg.maxWinMult > 0 ? +(opts.totalBet * cfg.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;

  let left = opts.freeSpinsAwarded;
  let persistentMult = 0;
  let retriggerTotal = 0;
  let totalWin = 0;
  let towardCap = opts.alreadyTowardCap ?? 0;
  let hitCap = false;
  const spins: SpinScript[] = [];
  let spinIndex = 0;

  while (left > 0 && spinIndex < MAX_FS_SPINS && !hitCap) {
    left--;
    spinIndex++;
    const childSeed = `${seed}-fs-${spinIndex}-${rng().toString(36).slice(2, 8)}`;
    const script = resolvePinataSpin({
      totalBet: opts.totalBet,
      isFreeSpins: true,
      seed: childSeed,
      persistentMult,
      retriggersAlready: retriggerTotal,
    });

    const room = applyCap(script.totalWin, towardCap, maxPayout);
    const credited = { ...script, totalWin: room.credited, paylineWin: room.credited };
    if (room.hitCap) credited.hitCap = true;
    totalWin += room.credited;
    towardCap += room.credited;
    hitCap = hitCap || room.hitCap;
    persistentMult = script.persistentMultAfter;
    spins.push(credited);

    if (script.freeSpinsAwarded > 0) {
      left += script.freeSpinsAwarded;
      retriggerTotal += script.freeSpinsAwarded;
    }
  }

  return {
    seed,
    spins,
    freeSpinsAwarded: opts.freeSpinsAwarded,
    retriggerTotal,
    persistentMultFinal: persistentMult,
    totalWin: +totalWin.toFixed(2),
    hitCap: hitCap || undefined,
  };
}

/**
 * Full paid-round resolution (base spin + inline Free Spins if triggered).
 * Used by simulation and optional one-shot settlement paths.
 */
export function resolvePinataPaidRound(opts: {
  totalBet: number;
  seed?: string;
  /** Skip base spin and enter FS directly (feature buy) */
  featureBuy?: boolean;
}): {
  seed: string;
  base: SpinScript | null;
  freeSpins: FreeSpinsSessionScript | null;
  totalWin: number;
  costMult: number;
  hitCap?: boolean;
} {
  const cfg = getPinataWinsConfig();
  const seed = opts.seed ?? newSpinSeed(opts.featureBuy ? "pw-buy" : "pw-round");
  const maxPayout =
    cfg.maxWinMult > 0 ? +(opts.totalBet * cfg.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;

  if (opts.featureBuy) {
    const fs = resolvePinataFreeSpinsSession({
      totalBet: opts.totalBet,
      freeSpinsAwarded: cfg.freeSpinsBaseCount,
      seed: `${seed}-fs`,
    });
    const capped = applyCap(fs.totalWin, 0, maxPayout);
    return {
      seed,
      base: null,
      freeSpins: { ...fs, totalWin: capped.credited, hitCap: capped.hitCap || fs.hitCap },
      totalWin: capped.credited,
      costMult: cfg.buyFeatureMult,
      hitCap: capped.hitCap || fs.hitCap,
    };
  }

  const base = resolvePinataSpin({
    totalBet: opts.totalBet,
    isFreeSpins: false,
    seed: `${seed}-base`,
  });

  let totalWin = base.totalWin;
  let hitCap = !!base.hitCap;
  let freeSpins: FreeSpinsSessionScript | null = null;

  if (base.freeSpinsAwarded > 0 && !hitCap) {
    freeSpins = resolvePinataFreeSpinsSession({
      totalBet: opts.totalBet,
      freeSpinsAwarded: base.freeSpinsAwarded,
      seed: `${seed}-fs`,
      alreadyTowardCap: totalWin,
    });
    totalWin += freeSpins.totalWin;
    hitCap = hitCap || !!freeSpins.hitCap;
  }

  return {
    seed,
    base,
    freeSpins,
    totalWin: +totalWin.toFixed(2),
    costMult: 1,
    hitCap: hitCap || undefined,
  };
}
