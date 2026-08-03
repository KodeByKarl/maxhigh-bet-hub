/**
 * Buffalo Reign (buffalo-reign) — regression + optional RTP.
 * Run: npx tsx scripts/test-buffalo-reign.ts
 * RTP:  npx tsx scripts/test-buffalo-reign.ts --rtp 50000
 */
import {
  DEFAULT_BUFFALO_REIGN_CONFIG,
  normalizeBuffaloReignConfig,
  calcFreeSpinsAward,
} from "../src/lib/buffalo-reign-config";
import { setBuffaloReignConfig } from "../src/components/maxhigh/wild-frontier-stampede/runtimeConfig";
import { resolveBuffaloSpin } from "../src/components/maxhigh/wild-frontier-stampede/spinResolver";
import { evaluateWays } from "../src/components/maxhigh/wild-frontier-stampede/waysEngine";
import { generateInitialBoard } from "../src/components/maxhigh/wild-frontier-stampede/tumbleEngine";
import { resolveTreasureChest } from "../src/components/maxhigh/wild-frontier-stampede/treasureChest";
import { createRng } from "../src/components/maxhigh/wild-frontier-stampede/rng";

setBuffaloReignConfig(structuredClone(DEFAULT_BUFFALO_REIGN_CONFIG));

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

assert(DEFAULT_BUFFALO_REIGN_CONFIG.reelsCount === 5, "5 reels");
assert(DEFAULT_BUFFALO_REIGN_CONFIG.maxReelHeight === 4, "4 rows");
assert(4 ** 5 === 1024, "1024 ways");
assert(DEFAULT_BUFFALO_REIGN_CONFIG.freeSpinsTriggerCount === 4, "FS needs 4 scatters");
assert(calcFreeSpinsAward(3) === 0, "3 scatters no FS");
assert(calcFreeSpinsAward(4) === 10, "4 scatters → 10 FS");
assert(calcFreeSpinsAward(5) === 12, "5 scatters → 12 FS");

const heights = [4, 4, 4, 4, 4];
const board = generateInitialBoard(heights, false, false);
assert(board.length === 20, "full board 20 cells");
const eval0 = evaluateWays(board, 1, heights, { payScatter: true });
assert(eval0.totalWays === 1024, "eval totalWays 1024");

const script = resolveBuffaloSpin({ bet: 1, ante: false, isFreeSpins: false });
assert(Array.isArray(script.steps) && script.steps.length >= 1, "spin has steps");
assert(typeof script.totalWin === "number", "totalWin number");
assert(script.totalWays === 1024, "script ways 1024");

const fs = resolveBuffaloSpin({ bet: 1, isFreeSpins: true, sessionMultiplier: 3 });
assert(fs.sessionMultiplier === 3, "session mult passed");
assert(fs.treasureChest === null, "no chests in FS");

const cfg = DEFAULT_BUFFALO_REIGN_CONFIG;
const chest = resolveTreasureChest(createRng("chest-test"), 1, cfg, [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [0, 1],
]);
assert(chest.triggerChests.length === 6, "6 trigger chests");
assert(chest.totalWin >= 0, "chest win >= 0");
assert(chest.steps.length >= 1, "chest has steps");

const norm = normalizeBuffaloReignConfig({ freeSpinsBaseCount: 8, chestTriggerCount: 5 });
assert(norm.freeSpinsBaseCount === 8, "normalize FS count");
assert(norm.chestTriggerCount === 5, "normalize chest trigger");

const rtpArg = process.argv.find((a) => a === "--rtp");
const rtpN = rtpArg ? Number(process.argv[process.argv.indexOf("--rtp") + 1] || 20000) : 0;
if (rtpN > 0) {
  let wagered = 0;
  let won = 0;
  let fsHits = 0;
  let chestHits = 0;
  for (let i = 0; i < rtpN; i++) {
    const s = resolveBuffaloSpin({ bet: 1 });
    wagered += 1;
    won += s.totalWin;
    if (s.freeSpinsAwarded > 0) fsHits++;
    if (s.treasureChest) chestHits++;
  }
  const rtp = (won / wagered) * 100;
  console.log(
    `RTP smoke ${rtpN}: ${(rtp).toFixed(2)}%  FS hit ${(fsHits / rtpN * 100).toFixed(2)}%  Chest ${(chestHits / rtpN * 100).toFixed(2)}%`,
  );
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll Buffalo Reign checks passed.");
