import { calcFreeSpinsAward } from "@/lib/palengke-pays-config";
import { resolveHoldAndWin } from "./holdAndWin";
import { evaluatePaylines, evaluateScatterPay } from "./paylineEngine";
import { countKind, generateGrid, listBonusPositions } from "./reelGenerator";
import { createRng, newSpinSeed } from "./rng";
import { getPalengkePaysConfig } from "./runtimeConfig";
import { applyGravity } from "./tumbleEngine";
import type { CascadeStep, SpinScript } from "./types";

const MAX_CASCADES = 25;

function applyCap(amount: number, already: number, maxPayout: number) {
  if (!Number.isFinite(maxPayout)) return { credited: amount, hitCap: false };
  if (already >= maxPayout) return { credited: 0, hitCap: true };
  if (already + amount > maxPayout) {
    return { credited: +Math.max(0, maxPayout - already).toFixed(2), hitCap: true };
  }
  return { credited: amount, hitCap: false };
}

/**
 * Server-authoritative spin:
 * diamond connecting-ways cascade (remove → drop → refill) → scatter → Hold & Win → cap.
 */
export function resolvePalengkePaysSpin(opts: {
  totalBet: number;
  isFreeSpins?: boolean;
  seed?: string;
}): SpinScript {
  const cfg = getPalengkePaysConfig();
  const totalBet = opts.totalBet;
  const isFreeSpins = !!opts.isFreeSpins;
  const seed = opts.seed ?? newSpinSeed(isFreeSpins ? "fg-fs" : "fg");
  const rng = createRng(seed);

  const maxPayout =
    cfg.maxWinMult > 0 ? +(totalBet * cfg.maxWinMult).toFixed(2) : Number.POSITIVE_INFINITY;

  let grid = generateGrid(rng, cfg, { isFreeSpins });
  const steps: CascadeStep[] = [];
  let paylineWinTotal = 0;
  let totalWin = 0;
  let hitCap = false;
  let scatterPaid = false;
  let scatterPay = 0;
  let peakScatter = 0;
  let freeSpinsAwarded = 0;

  for (let cascadeIndex = 0; cascadeIndex < MAX_CASCADES; cascadeIndex++) {
    const { wins, total: rawLine } = evaluatePaylines(grid, totalBet, cfg);
    const scatterCount = countKind(grid, "scatter");
    if (scatterCount > peakScatter) peakScatter = scatterCount;

    if (!scatterPaid && scatterCount >= cfg.freeSpinsTriggerCount) {
      const rawSc = evaluateScatterPay(scatterCount, totalBet, cfg);
      const sc = applyCap(rawSc, totalWin, maxPayout);
      scatterPay = sc.credited;
      totalWin += sc.credited;
      hitCap = hitCap || sc.hitCap;
      scatterPaid = true;
      freeSpinsAwarded = calcFreeSpinsAward(scatterCount, cfg);
    }

    const capped = applyCap(rawLine, totalWin, maxPayout);
    const stepWin = capped.credited;
    paylineWinTotal += stepWin;
    totalWin += stepWin;
    hitCap = hitCap || capped.hitCap;

    const removed: Array<[number, number]> = [];
    if (wins.length > 0 && !hitCap && stepWin > 0) {
      const seen = new Set<string>();
      for (const w of wins) {
        for (const [r, row] of w.positions) {
          const k = `${r},${row}`;
          if (seen.has(k)) continue;
          seen.add(k);
          removed.push([r, row]);
        }
      }
    }

    steps.push({
      stepIndex: cascadeIndex,
      grid: grid.map((col) => [...col]),
      paylineWins: wins,
      paylineWin: stepWin,
      removed,
    });

    if (removed.length === 0 || hitCap) break;

    grid = applyGravity(grid, removed, rng, cfg, isFreeSpins);
  }

  const finalGrid = steps.length ? steps[steps.length - 1]!.grid : grid;
  // Recompute bonus on final board (after last tumble fill)
  // Use live grid after last gravity if we tumbled; else final step grid
  const boardForBonus = hitCap || steps[steps.length - 1]?.removed.length === 0
    ? finalGrid
    : grid;
  // After loop break without gravity, boardForBonus === finalGrid.
  // After gravity then break on no wins, last step is the new grid with empty removed.
  const evalBoard = steps[steps.length - 1]!.grid;
  const bonusPositions = listBonusPositions(evalBoard);
  const bonusCoinCount = bonusPositions.length;

  let holdWin: SpinScript["holdWin"] = null;
  if (!hitCap && bonusCoinCount >= cfg.holdWinTriggerCount) {
    const raw = resolveHoldAndWin(rng, totalBet, cfg, bonusPositions);
    const capped = applyCap(raw.totalWin, totalWin, maxPayout);
    holdWin = { ...raw, totalWin: capped.credited };
    totalWin += capped.credited;
    hitCap = hitCap || capped.hitCap;
  }

  const first = steps[0]!;
  return {
    seed,
    steps,
    grid: evalBoard,
    paylineWins: first.paylineWins,
    paylineWin: +paylineWinTotal.toFixed(2),
    scatterCount: peakScatter,
    scatterPay,
    freeSpinsAwarded,
    bonusCoinCount,
    holdWin,
    totalWin: +totalWin.toFixed(2),
    hitCap: hitCap || undefined,
  };
}
