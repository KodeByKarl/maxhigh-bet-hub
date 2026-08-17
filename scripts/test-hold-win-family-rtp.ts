/**
 * Originals RTP + clamp audit (post-overflow-fix tuning).
 *
 * Run:
 *   npx tsx scripts/test-hold-win-family-rtp.ts
 *   npx tsx scripts/test-hold-win-family-rtp.ts --rounds 20000
 *   npx tsx scripts/test-hold-win-family-rtp.ts --stakes
 *   npx tsx scripts/test-hold-win-family-rtp.ts --game golden-panther --rounds 20000
 */
import { enforcePoolCap } from "../src/server/settlement/enforcePoolCap";

import {
  GOLDEN_PANTHER_GAME_ID,
  DEFAULT_GOLDEN_PANTHER_CONFIG,
  remainingFreeSpinsAfterSpin as pantherRemainingFs,
} from "../src/lib/golden-panther-config";
import { setGoldenPantherConfig } from "../src/components/maxhigh/golden-panther/runtimeConfig";
import {
  finalizeFreeSpinTotal as pantherFinalize,
  resolveSpin as pantherResolve,
} from "../src/components/maxhigh/golden-panther/spinResolver";

import {
  CANDY_PEAK_GAME_ID,
  DEFAULT_CANDY_PEAK_CONFIG,
  remainingFreeSpinsAfterSpin as candyRemainingFs,
} from "../src/lib/candy-peak-config";
import { setCandyPeakConfig } from "../src/components/maxhigh/candy-peak/runtimeConfig";
import {
  finalizeFreeSpinTotal as candyFinalize,
  resolveSpin as candyResolve,
} from "../src/components/maxhigh/candy-peak/spinResolver";

import {
  SUGAR_SURGE_GAME_ID,
  DEFAULT_SUGAR_SURGE_CONFIG,
} from "../src/lib/sugar-surge-config";
import { setSugarSurgeConfig } from "../src/components/maxhigh/sugar-surge/runtimeConfig";
import { resolveSpin as sugarResolve } from "../src/components/maxhigh/sugar-surge/spinResolver";

import {
  GODLY_GATES_GAME_ID,
  DEFAULT_GODLY_GATES_CONFIG,
} from "../src/lib/godly-gates-config";
import { setGodlyGatesConfig } from "../src/components/maxhigh/godly-gates/runtimeConfig";
import { resolveSpin as godlyResolve } from "../src/components/maxhigh/godly-gates/spinResolver";

import {
  BUFFALO_REIGN_GAME_ID,
  DEFAULT_BUFFALO_REIGN_CONFIG,
} from "../src/lib/buffalo-reign-config";
import { setBuffaloReignConfig } from "../src/components/maxhigh/wild-frontier-stampede/runtimeConfig";
import { resolveBuffaloSpin } from "../src/components/maxhigh/wild-frontier-stampede/spinResolver";

import {
  FRONTIER_GOLD_GAME_ID,
  DEFAULT_FRONTIER_GOLD_CONFIG,
} from "../src/lib/frontier-gold-config";
import { setFrontierGoldConfig } from "../src/components/maxhigh/frontier-gold/runtimeConfig";
import { resolveFrontierSpin } from "../src/components/maxhigh/frontier-gold/spinResolver";

setGoldenPantherConfig(DEFAULT_GOLDEN_PANTHER_CONFIG);
setCandyPeakConfig(DEFAULT_CANDY_PEAK_CONFIG);
setSugarSurgeConfig(DEFAULT_SUGAR_SURGE_CONFIG);
setGodlyGatesConfig(DEFAULT_GODLY_GATES_CONFIG);
setBuffaloReignConfig(structuredClone(DEFAULT_BUFFALO_REIGN_CONFIG));
setFrontierGoldConfig(DEFAULT_FRONTIER_GOLD_CONFIG);

const roundsArg = process.argv.indexOf("--rounds");
const ROUNDS = roundsArg >= 0 ? Number(process.argv[roundsArg + 1] || 20000) : 20000;
const gameArg = process.argv.indexOf("--game");
const GAME_FILTER = gameArg >= 0 ? String(process.argv[gameArg + 1] || "") : "";
const RUN_STAKES = process.argv.includes("--stakes");
const BET = 5;

type RoundResult = {
  total: number;
  base: number;
  fsPay: number;
  clamped: boolean;
  preClampFs: number;
  fsHit: boolean;
  extra?: string;
};

function cap(gameId: string, bet: number, maxWinMult: number, computed: number, context: string) {
  return enforcePoolCap({ gameId, bet, maxWinMult, computedWin: computed, context });
}

function pctile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
}

function playPanther(bet: number): RoundResult {
  const cfg = DEFAULT_GOLDEN_PANTHER_CONFIG;
  const paid = pantherResolve({
    bet,
    ante: false,
    isFreeSpins: false,
    collectBombsInFreeSpins: true,
  });
  const baseCap = cap(GOLDEN_PANTHER_GAME_ID, bet, cfg.maxWinMult, paid.totalWin, "paid");
  let total = baseCap.payout;
  let clamped = baseCap.clamped;
  let preClampFs = 0;
  let fsHit = false;
  let fsPay = 0;
  if (paid.freeSpinsAwarded > 0) {
    fsHit = true;
    let left = paid.freeSpinsAwarded;
    let fsWin = 0;
    let bomb = 0;
    let played = 0;
    let guard = 0;
    while (left > 0 && guard++ < 80) {
      const fs = pantherResolve({
        bet,
        ante: false,
        isFreeSpins: true,
        collectBombsInFreeSpins: true,
        initialBombAccumulator: bomb,
      });
      fsWin += fs.totalWin;
      bomb = fs.bombAccumulator;
      played += 1;
      left = pantherRemainingFs({
        leftBefore: left,
        retrigger: fs.retriggerSpins,
        playedAfter: played,
        maxSessionSpins: cfg.maxFsSessionSpins,
      });
    }
    preClampFs = pantherFinalize(fsWin, bomb);
    const fsCap = cap(GOLDEN_PANTHER_GAME_ID, bet, cfg.maxWinMult, preClampFs, "fs-final");
    fsPay = fsCap.payout;
    total += fsPay;
    clamped = clamped || fsCap.clamped;
  }
  return { total, base: baseCap.payout, fsPay, clamped, preClampFs, fsHit };
}

function playCandy(bet: number): RoundResult {
  const cfg = DEFAULT_CANDY_PEAK_CONFIG;
  const paid = candyResolve({ bet, ante: false, isFreeSpins: false, collectBombsInFreeSpins: true });
  const base = cap(CANDY_PEAK_GAME_ID, bet, cfg.maxWinMult, paid.totalWin, "paid");
  let total = base.payout;
  let clamped = base.clamped;
  let preClampFs = 0;
  let fsHit = false;
  if (paid.freeSpinsAwarded > 0) {
    fsHit = true;
    let left = paid.freeSpinsAwarded;
    let fsWin = 0;
    let bomb = 0;
    let played = 0;
    let guard = 0;
    while (left > 0 && guard++ < 80) {
      const fs = candyResolve({
        bet,
        ante: false,
        isFreeSpins: true,
        collectBombsInFreeSpins: true,
        initialBombAccumulator: bomb,
      });
      fsWin += fs.totalWin;
      bomb = fs.bombAccumulator;
      played += 1;
      left = candyRemainingFs({
        leftBefore: left,
        retrigger: fs.retriggerSpins,
        playedAfter: played,
        maxSessionSpins: cfg.maxFsSessionSpins,
      });
    }
    preClampFs = candyFinalize(fsWin, bomb);
    const fsCap = cap(CANDY_PEAK_GAME_ID, bet, cfg.maxWinMult, preClampFs, "fs-final");
    total += fsCap.payout;
    clamped = clamped || fsCap.clamped;
  }
  return { total, base: base.payout, fsPay: total - base.payout, clamped, preClampFs, fsHit };
}

function playSugar(bet: number): RoundResult {
  const cfg = DEFAULT_SUGAR_SURGE_CONFIG;
  const paid = sugarResolve({ bet, ante: false, isFreeSpins: false });
  const base = cap(SUGAR_SURGE_GAME_ID, bet, cfg.maxWinMult, paid.totalWin, "paid");
  let total = base.payout;
  let clamped = base.clamped;
  let preClampFs = 0;
  let fsHit = false;
  let maxMultSum = 0;
  if (paid.freeSpinsAwarded > 0) {
    fsHit = true;
    let left = paid.freeSpinsAwarded;
    let fsWin = 0;
    let mults = paid.finalPositionMults;
    let guard = 0;
    while (left > 0 && guard++ < 80) {
      const fs = sugarResolve({
        bet,
        ante: false,
        isFreeSpins: true,
        initialPositionMults: mults,
      });
      const spinCap = cap(SUGAR_SURGE_GAME_ID, bet, cfg.maxWinMult, fs.totalWin, "fs-spin");
      fsWin += fs.totalWin;
      clamped = clamped || spinCap.clamped;
      mults = fs.finalPositionMults;
      const sum = fs.finalPositionMults.reduce((a, n) => a + (n > 0 ? n : 0), 0);
      if (sum > maxMultSum) maxMultSum = sum;
      left = left - 1 + fs.retriggerSpins;
    }
    preClampFs = fsWin;
    const fsCap = cap(SUGAR_SURGE_GAME_ID, bet, cfg.maxWinMult, fsWin, "fs-final");
    total += fsCap.payout;
    clamped = clamped || fsCap.clamped;
  }
  return { total, base: base.payout, fsPay: total - base.payout, clamped, preClampFs, fsHit, extra: `maxBoardMultSum=${maxMultSum}` };
}

function playGodly(bet: number): RoundResult {
  const cfg = DEFAULT_GODLY_GATES_CONFIG;
  const paid = godlyResolve({ bet, isFreeSpins: false });
  const base = cap(GODLY_GATES_GAME_ID, bet, cfg.maxWinMult, paid.totalWin, "paid");
  let total = base.payout;
  let clamped = base.clamped;
  let preClampFs = 0;
  let fsHit = false;
  let peakMult = 1;
  if (paid.freeSpinsAwarded > 0) {
    fsHit = true;
    let left = paid.freeSpinsAwarded;
    let fsWin = 0;
    let startMult = 1;
    let guard = 0;
    while (left > 0 && guard++ < 80) {
      const fs = godlyResolve({ bet, isFreeSpins: true, startMultiplier: startMult });
      const spinCap = cap(GODLY_GATES_GAME_ID, bet, cfg.maxWinMult, fs.totalWin, "fs-spin");
      fsWin += fs.totalWin;
      clamped = clamped || spinCap.clamped;
      startMult = Math.max(1, fs.endMultiplier);
      if (startMult > peakMult) peakMult = startMult;
      left = left - 1 + fs.retriggerSpins;
    }
    preClampFs = fsWin;
    const fsCap = cap(GODLY_GATES_GAME_ID, bet, cfg.maxWinMult, fsWin, "fs-final");
    total += fsCap.payout;
    clamped = clamped || fsCap.clamped;
  }
  return { total, base: base.payout, fsPay: total - base.payout, clamped, preClampFs, fsHit, extra: `peakFsMult=${peakMult}` };
}

function playBuffalo(bet: number): RoundResult {
  const cfg = DEFAULT_BUFFALO_REIGN_CONFIG;
  const paid = resolveBuffaloSpin({ bet, ante: false, isFreeSpins: false });
  const base = cap(BUFFALO_REIGN_GAME_ID, bet, cfg.maxWinMult, paid.totalWin, "paid");
  let total = base.payout;
  let clamped = base.clamped || !!paid.hitCap;
  let preClampFs = 0;
  let fsHit = false;
  if (paid.freeSpinsAwarded > 0) {
    fsHit = true;
    let left = paid.freeSpinsAwarded;
    let fsWin = 0;
    let played = 0;
    let guard = 0;
    while (left > 0 && guard++ < 80) {
      const sessionMultiplier =
        cfg.freeSpinsSessionMultStart + played * cfg.freeSpinsSessionMultStep;
      const fs = resolveBuffaloSpin({
        bet,
        ante: false,
        isFreeSpins: true,
        sessionMultiplier,
      });
      const spinCap = cap(BUFFALO_REIGN_GAME_ID, bet, cfg.maxWinMult, fs.totalWin, "fs-spin");
      fsWin += fs.totalWin;
      clamped = clamped || spinCap.clamped || !!fs.hitCap;
      played += 1;
      left = left - 1 + fs.freeSpinsAwarded;
    }
    preClampFs = fsWin;
    const fsCap = cap(BUFFALO_REIGN_GAME_ID, bet, cfg.maxWinMult, fsWin, "fs-final");
    total += fsCap.payout;
    clamped = clamped || fsCap.clamped;
  }
  return { total, base: base.payout, fsPay: total - base.payout, clamped, preClampFs, fsHit };
}

function playFrontier(bet: number): RoundResult {
  const cfg = DEFAULT_FRONTIER_GOLD_CONFIG;
  const paid = resolveFrontierSpin({ totalBet: bet, isFreeSpins: false });
  const base = cap(FRONTIER_GOLD_GAME_ID, bet, cfg.maxWinMult, paid.totalWin, "paid");
  let total = base.payout;
  let clamped = base.clamped || !!paid.hitCap;
  let preClampFs = 0;
  let fsHit = false;
  if (paid.freeSpinsAwarded > 0) {
    fsHit = true;
    let left = paid.freeSpinsAwarded;
    let fsWin = 0;
    let guard = 0;
    while (left > 0 && guard++ < 80) {
      const fs = resolveFrontierSpin({ totalBet: bet, isFreeSpins: true });
      const spinCap = cap(FRONTIER_GOLD_GAME_ID, bet, cfg.maxWinMult, fs.totalWin, "fs-spin");
      fsWin += fs.totalWin;
      clamped = clamped || spinCap.clamped || !!fs.hitCap;
      left = left - 1 + fs.freeSpinsAwarded;
    }
    preClampFs = fsWin;
    const fsCap = cap(FRONTIER_GOLD_GAME_ID, bet, cfg.maxWinMult, fsWin, "fs-final");
    total += fsCap.payout;
    clamped = clamped || fsCap.clamped;
  }
  return { total, base: base.payout, fsPay: total - base.payout, clamped, preClampFs, fsHit };
}

type GameSpec = {
  name: string;
  gameId: string;
  maxWinMult: number;
  targetRtp?: number;
  play: (bet: number) => RoundResult;
};

const GAMES: GameSpec[] = [
  {
    name: "Golden Panther",
    gameId: GOLDEN_PANTHER_GAME_ID,
    maxWinMult: DEFAULT_GOLDEN_PANTHER_CONFIG.maxWinMult,
    targetRtp: 96,
    play: playPanther,
  },
  {
    name: "Candy Peak",
    gameId: CANDY_PEAK_GAME_ID,
    maxWinMult: DEFAULT_CANDY_PEAK_CONFIG.maxWinMult,
    targetRtp: 96,
    play: playCandy,
  },
  {
    name: "Sugar Surge",
    gameId: SUGAR_SURGE_GAME_ID,
    maxWinMult: DEFAULT_SUGAR_SURGE_CONFIG.maxWinMult,
    targetRtp: 96,
    play: playSugar,
  },
  {
    name: "Godly Gates",
    gameId: GODLY_GATES_GAME_ID,
    maxWinMult: DEFAULT_GODLY_GATES_CONFIG.maxWinMult,
    targetRtp: 96,
    play: playGodly,
  },
  {
    name: "Buffalo Reign",
    gameId: BUFFALO_REIGN_GAME_ID,
    maxWinMult: DEFAULT_BUFFALO_REIGN_CONFIG.maxWinMult,
    targetRtp: DEFAULT_BUFFALO_REIGN_CONFIG.targetRtp,
    play: playBuffalo,
  },
  {
    name: "Frontier Gold",
    gameId: FRONTIER_GOLD_GAME_ID,
    maxWinMult: DEFAULT_FRONTIER_GOLD_CONFIG.maxWinMult,
    targetRtp: DEFAULT_FRONTIER_GOLD_CONFIG.targetRtp,
    play: playFrontier,
  },
];

function runGame(spec: GameSpec, bet: number, rounds: number) {
  let wagered = 0;
  let returned = 0;
  let baseReturned = 0;
  let fsReturned = 0;
  let clampCount = 0;
  let fsHits = 0;
  let wins = 0;
  const preXs: number[] = [];

  for (let i = 0; i < rounds; i++) {
    wagered += bet;
    const r = spec.play(bet);
    returned += r.total;
    baseReturned += r.base;
    fsReturned += r.fsPay;
    if (r.clamped) clampCount++;
    if (r.total > 0) wins++;
    if (r.fsHit) {
      fsHits++;
      preXs.push(r.preClampFs / bet);
    }
  }

  const rtp = (returned / wagered) * 100;
  const baseRtp = (baseReturned / wagered) * 100;
  const fsRtp = (fsReturned / wagered) * 100;
  const clampPct = (clampCount / rounds) * 100;
  const fsPct = (fsHits / rounds) * 100;
  const hitPct = (wins / rounds) * 100;
  const target = spec.targetRtp ?? 96;
  const inTol = rtp >= 94 && rtp <= 98;
  const flag = clampPct > 10 ? "CLAMP" : inTol ? "OK" : "TUNE";

  console.log(`\n${spec.name} (${spec.gameId})`);
  console.log(
    `  rounds ${rounds}  bet ₱${bet}  cap ${spec.maxWinMult}×  target ${target}%`,
  );
  console.log(
    `  total RTP ${rtp.toFixed(2)}%  base ${baseRtp.toFixed(2)}%  FS-contrib ${fsRtp.toFixed(2)}%  [${flag}]`,
  );
  console.log(
    `  hit ${hitPct.toFixed(1)}%  FS ${fsPct.toFixed(2)}% (n=${fsHits})  clamp ${clampPct.toFixed(2)}%`,
  );
  if (preXs.length) {
    console.log(
      `  FS pre-clamp ×bet  p50=${pctile(preXs, 50).toFixed(1)}  p95=${pctile(preXs, 95).toFixed(1)}  max=${pctile(preXs, 100).toFixed(1)}  n=${preXs.length}`,
    );
  }

  return {
    name: spec.name,
    gameId: spec.gameId,
    bet,
    rtp,
    baseRtp,
    fsRtp,
    clampPct,
    fsPct,
    fsHits,
    target,
    inTol,
    within1pp: Math.abs(rtp - target) <= 1,
    flag,
  };
}

const origError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("POOL_CAP_CLAMP")) return;
  origError.apply(console, args as []);
};

const selected = GAMES.filter((g) => !GAME_FILTER || g.gameId === GAME_FILTER || g.name.toLowerCase().includes(GAME_FILTER.toLowerCase()));
const stakes = RUN_STAKES ? [1, 5, 20, 100] : [BET];

console.log("==========================================");
console.log(`Originals RTP audit — ${ROUNDS} rounds × ₱${stakes.join("/")} `);
console.log("==========================================");

const rows = [];
for (const spec of selected) {
  for (const bet of stakes) {
    rows.push(runGame(spec, bet, ROUNDS));
  }
}
console.error = origError;

console.log("\n==========================================");
console.log("Summary");
console.log("==========================================");
console.log(
  `${"Game".padEnd(16)} ${"Bet".padStart(5)} ${"Total".padStart(8)} ${"Base".padStart(8)} ${"FS".padStart(8)} ${"FSn".padStart(6)} ${"Clamp".padStart(7)} ${"Tgt".padStart(6)}  ±1pp  94-98`,
);
for (const r of rows) {
  console.log(
    `${r.name.padEnd(16)} ${String(r.bet).padStart(5)} ${r.rtp.toFixed(2).padStart(7)}% ${r.baseRtp.toFixed(2).padStart(7)}% ${r.fsRtp.toFixed(2).padStart(7)}% ${String(r.fsHits).padStart(6)} ${r.clampPct.toFixed(2).padStart(6)}% ${r.target.toFixed(0).padStart(5)}%  ${r.within1pp ? "yes" : "NO "}  ${r.inTol ? "yes" : "NO"} ${r.flag}`,
  );
}
console.log("\nFamily audit complete.");
