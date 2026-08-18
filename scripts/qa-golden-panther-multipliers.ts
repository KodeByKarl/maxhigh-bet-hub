/**
 * Stress-play Golden Panther: bombs may only be 2x/3x/4x/5x, and paid
 * amounts must match the applied multiplier.
 *
 * Run: npx tsx --env-file=.env scripts/qa-golden-panther-multipliers.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import {
  GOLDEN_PANTHER_BOMB_MULTS,
  GOLDEN_PANTHER_GAME_ID,
  normalizeGoldenPantherConfig,
} from "../src/lib/golden-panther-config";
import { getDb } from "../src/server/db/client";
import { gameControls } from "../src/server/db/schema";
import { setGoldenPantherConfig } from "../src/components/maxhigh/golden-panther/runtimeConfig";
import { resolveSpin } from "../src/components/maxhigh/golden-panther/spinResolver";
import { evaluateBoard } from "../src/components/maxhigh/golden-panther/tumbleEngine";
import { applyBombToTumble, finalizeFreeSpinTotal } from "../src/components/maxhigh/golden-panther/multiplierEngine";

const ALLOWED = new Set<number>(GOLDEN_PANTHER_BOMB_MULTS);
const PAID_SPINS = 1500;
const FS_SPINS = 800;
const BET = 0.2;

function php(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function loadCfg() {
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, GOLDEN_PANTHER_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    if (!raw) return normalizeGoldenPantherConfig(null);
    return normalizeGoldenPantherConfig(JSON.parse(raw) as unknown);
  } catch {
    return normalizeGoldenPantherConfig(null);
  }
}

type Fail = string;

function checkBoardBombs(board: { sym: { kind: string }; mult?: number }[], fails: Fail[], tag: string) {
  for (const cell of board) {
    if (cell?.sym.kind !== "bomb") continue;
    const m = cell.mult ?? 0;
    if (!ALLOWED.has(m)) fails.push(`${tag}: illegal bomb ${m}x on reel`);
  }
}

async function main() {
  const cfg = await loadCfg();
  setGoldenPantherConfig(cfg);

  const fails: Fail[] = [];
  const seenBombs = new Set<number>();
  const seenApplied = new Set<number>();
  let bombWins = 0;
  let clusterWins = 0;
  const samples: string[] = [];

  for (let i = 0; i < PAID_SPINS; i++) {
    const script = resolveSpin({
      bet: BET,
      ante: false,
      isFreeSpins: false,
      collectBombsInFreeSpins: true,
    });
    checkBoardBombs(script.initialBoard, fails, `paid#${i + 1} open`);
    if (script.displayMult != null && script.displayMult > 1 && !ALLOWED.has(script.displayMult)) {
      fails.push(`paid#${i + 1}: displayMult ${script.displayMult}x not in 2–5`);
    }

    for (const [t, step] of script.steps.entries()) {
      checkBoardBombs(step.board, fails, `paid#${i + 1} T${t + 1}`);
      if (step.tumbleWin > 0) clusterWins++;
      if (step.bombSum > 0) {
        seenApplied.add(step.bombSum);
        if (!ALLOWED.has(step.bombSum)) {
          fails.push(`paid#${i + 1} T${t + 1}: applied bomb ${step.bombSum}x`);
        }
      }

      const ev = evaluateBoard(step.board, BET);
      for (const b of ev.bombs) seenBombs.add(b.mult ?? 0);
      const bomb = applyBombToTumble(ev.win, ev.bombs, {
        freeSpins: false,
        collectMode: false,
        accumulator: 0,
      });
      if (Math.abs(bomb.win - step.tumbleWin) > 0.02) {
        fails.push(
          `paid#${i + 1} T${t + 1}: resolver win ${php(step.tumbleWin)} != engine ${php(bomb.win)}`,
        );
      }
      if (ev.win > 0 && bomb.bombSum > 1) {
        bombWins++;
        const expected = +(ev.win * bomb.bombSum).toFixed(2);
        if (Math.abs(expected - bomb.win) > 0.02) {
          fails.push(
            `paid#${i + 1} T${t + 1}: cluster ${php(ev.win)} × ${bomb.bombSum} = ${php(expected)}, paid ${php(bomb.win)}`,
          );
        } else if (samples.length < 12) {
          samples.push(
            `base T${t + 1}: cluster ${php(ev.win)} × ${bomb.bombSum}x = ${php(bomb.win)} (${ev.clusters.map((c) => `${c.count} ${c.kind}`).join(", ")})`,
          );
        }
      }
    }
  }

  let fsBombWins = 0;
  for (let i = 0; i < FS_SPINS; i++) {
    const accIn = i % 5 === 0 ? 0 : [0, 2, 3, 4, 5][i % 5]!;
    const script = resolveSpin({
      bet: BET,
      ante: false,
      isFreeSpins: true,
      collectBombsInFreeSpins: true,
      initialBombAccumulator: accIn,
    });
    checkBoardBombs(script.initialBoard, fails, `fs#${i + 1} open`);
    const accOut = script.bombAccumulator ?? 0;
    if (accOut > 0 && !ALLOWED.has(accOut)) {
      fails.push(`fs#${i + 1}: banked ${accOut}x`);
    }
    if (accOut < accIn) {
      fails.push(`fs#${i + 1}: banked dropped ${accIn}x → ${accOut}x`);
    }

    let earned = 0;
    for (const [t, step] of script.steps.entries()) {
      checkBoardBombs(step.board, fails, `fs#${i + 1} T${t + 1}`);
      earned = +(earned + step.tumbleWin).toFixed(2);
      if (step.bombSum > 0) {
        fsBombWins++;
        seenApplied.add(step.bombSum);
        if (!ALLOWED.has(step.bombSum)) fails.push(`fs#${i + 1} T${t + 1}: ${step.bombSum}x`);
      }
      const ev = evaluateBoard(step.board, BET);
      for (const b of ev.bombs) seenBombs.add(b.mult ?? 0);
      // Collect mode: tumble is NOT multiplied yet
      if (Math.abs(step.tumbleWin - ev.win) > 0.02 && step.tumbleWin > 0) {
        fails.push(
          `fs#${i + 1} T${t + 1}: collect-mode tumble ${php(step.tumbleWin)} should equal cluster ${php(ev.win)}`,
        );
      }
    }
    const projected = finalizeFreeSpinTotal(earned, accOut);
    const expectedMult = Math.max(1, accOut);
    const expectPay = +(earned * expectedMult).toFixed(2);
    if (Math.abs(projected - expectPay) > 0.02) {
      fails.push(`fs#${i + 1}: end ${php(earned)} × ${expectedMult}x = ${php(expectPay)}, got ${php(projected)}`);
    } else if (expectedMult > 1 && earned > 0 && samples.length < 18) {
      samples.push(`FS: earn ${php(earned)} × ${expectedMult}x = ${php(projected)}`);
    }
  }

  console.log("============================================================");
  console.log("GOLDEN PANTHER — MULTIPLIER QA");
  console.log("============================================================");
  console.log(`Allowed bombs:  ${[...GOLDEN_PANTHER_BOMB_MULTS].map((n) => `${n}x`).join(", ")}`);
  console.log(`Config table:   ${cfg.bombTable.map((b) => `${b.mult}x w=${b.weight}`).join(" | ")}`);
  console.log(`Paid spins:     ${PAID_SPINS}`);
  console.log(`Free spins:     ${FS_SPINS}`);
  console.log(`Stake:          ${php(BET)}`);
  console.log(`Cluster wins:   ${clusterWins}`);
  console.log(`Base bomb wins: ${bombWins}`);
  console.log(`FS bomb steps:  ${fsBombWins}`);
  console.log(`Bombs on reels: ${[...seenBombs].sort((a, b) => a - b).map((n) => `${n}x`).join(", ") || "none"}`);
  console.log(`Applied bombs:  ${[...seenApplied].sort((a, b) => a - b).map((n) => `${n}x`).join(", ") || "none"}`);
  console.log("------------------------------------------------------------");
  for (const s of samples) console.log(`  ${s}`);
  console.log("------------------------------------------------------------");
  if (fails.length === 0) {
    console.log("ALL PASS — no bomb above 5x, every payout matched the shown times");
  } else {
    console.log(`FAIL x${fails.length}`);
    for (const f of fails.slice(0, 25)) console.log(`  - ${f}`);
    if (fails.length > 25) console.log(`  … ${fails.length - 25} more`);
  }
  console.log("============================================================");
  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
