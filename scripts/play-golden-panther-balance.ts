/**
 * Client-facing Golden Panther balance QA — 20 consecutive paid spins,
 * wins and losses. HUD Bet/Win/Balance vs live wallet.
 *
 * Run: npx tsx --env-file=.env scripts/play-golden-panther-balance.ts
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { GOLDEN_PANTHER_GAME_ID, normalizeGoldenPantherConfig } from "../src/lib/golden-panther-config";
import { getDb } from "../src/server/db/client";
import { gameControls, users } from "../src/server/db/schema";
import { writeLedgerDelta } from "../src/server/wallet.server";
import { applyCapToScriptTotalWin } from "../src/server/settlement/enforcePoolCap";
import { setGoldenPantherConfig } from "../src/components/maxhigh/golden-panther/runtimeConfig";
import { resolveSpin } from "../src/components/maxhigh/golden-panther/spinResolver";

const BET = 0.2;
const SPINS = 20;
const GAME_NAME = "Panther Peak";

function php(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pad(s: string, n: number) {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
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

type Row = {
  spin: number;
  result: "WIN" | "LOSE";
  betOut: number;
  winIn: number;
  net: number;
  balanceBefore: number;
  balanceAfterBet: number;
  balanceAfter: number;
  hudBalance: number;
  match: boolean;
  detail: string;
};

async function main() {
  const db = getDb();
  const cfg = await loadCfg();
  setGoldenPantherConfig(cfg);

  const [player] = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.username}) = 'player1'`)
    .limit(1);
  if (!player) throw new Error("player1 not found — run npm run db:seed first");

  let wallet = Number(player.balance);
  const startBalance = wallet;
  const rows: Row[] = [];
  let mismatches = 0;

  for (let i = 1; i <= SPINS; i++) {
    if (wallet < BET) {
      console.log(`Stopped: not enough chips for spin ${i}`);
      break;
    }

    const balanceBefore = wallet;
    const script = resolveSpin({
      bet: BET,
      ante: false,
      isFreeSpins: false,
      collectBombsInFreeSpins: true,
    });
    applyCapToScriptTotalWin(script, {
      gameId: GOLDEN_PANTHER_GAME_ID,
      gameName: GAME_NAME,
      bet: BET,
      maxWinMult: cfg.maxWinMult,
      context: "client-qa",
    });

    const afterBet = +(wallet - BET).toFixed(2);
    let running = 0;
    const tumbleBits: string[] = [];

    for (const [t, step] of script.steps.entries()) {
      if (step.tumbleWin <= 0) continue;
      running = +(running + step.tumbleWin).toFixed(2);
      const clusters = step.clusters.map((c) => `${c.count} ${c.kind}`).join(" + ");
      tumbleBits.push(
        `T${t + 1} ${php(step.tumbleWin)}${step.bombSum > 1 ? ` bomb ${step.bombSum}x` : ""}${clusters ? ` (${clusters})` : ""}`,
      );
    }

    const leftover = +(script.totalWin - running).toFixed(2);
    if (Math.abs(leftover) >= 0.01) {
      running = script.totalWin;
      if (script.scatterPay > 0) tumbleBits.push(`Scatter ${php(script.scatterPay)}`);
      else tumbleBits.push(`Cap adjust ${php(leftover)}`);
    }

    const hudBalance = +(afterBet + running).toFixed(2);
    const result = await db.transaction(async (tx) => {
      let ledger = await writeLedgerDelta(tx, {
        userId: player.id,
        username: player.username,
        delta: -BET,
        type: "bet",
        game: GAME_NAME,
        note: `QA wager ${php(BET)}`,
      });
      if (script.totalWin > 0) {
        ledger = await writeLedgerDelta(tx, {
          userId: player.id,
          username: player.username,
          delta: script.totalWin,
          type: "win",
          game: GAME_NAME,
          note: `QA win ${php(script.totalWin)}`,
        });
      }
      return ledger.balance;
    });

    const match = Math.abs(result - hudBalance) < 0.015;
    if (!match) mismatches++;
    const winIn = script.totalWin;
    const isWin = winIn > 0;
    rows.push({
      spin: i,
      result: isWin ? "WIN" : "LOSE",
      betOut: BET,
      winIn,
      net: +(winIn - BET).toFixed(2),
      balanceBefore,
      balanceAfterBet: afterBet,
      balanceAfter: result,
      hudBalance,
      match,
      detail: isWin ? tumbleBits.join("; ") || php(winIn) : "No cluster / no scatter",
    });
    wallet = result;
  }

  const wins = rows.filter((r) => r.result === "WIN");
  const losses = rows.filter((r) => r.result === "LOSE");
  const totalBet = +(rows.reduce((a, r) => a + r.betOut, 0)).toFixed(2);
  const totalWin = +(rows.reduce((a, r) => a + r.winIn, 0)).toFixed(2);
  const net = +(totalWin - totalBet).toFixed(2);
  const endBalance = Number(
    (await db.select({ balance: users.balance }).from(users).where(eq(users.id, player.id)).limit(1))[0]
      ?.balance ?? wallet,
  );

  console.log("============================================================");
  console.log("GOLDEN PANTHER — BALANCE QA REPORT");
  console.log("============================================================");
  console.log(`Game:           Golden Panther (Panther Peak)`);
  console.log(`Stake:          ${php(BET)} per spin (no ante)`);
  console.log(`Spins tested:   ${rows.length} consecutive (wins and losses)`);
  console.log(`Date:           ${new Date().toISOString().slice(0, 10)}`);
  console.log(`Start balance:  ${php(startBalance)}`);
  console.log(`End balance:    ${php(endBalance)}`);
  console.log("------------------------------------------------------------");
  console.log(
    pad("#", 4) +
      pad("Result", 8) +
      pad("Bet out", 12) +
      pad("Win in", 12) +
      pad("Net", 12) +
      pad("Balance after", 16) +
      pad("HUD=Wallet", 12),
  );
  console.log("------------------------------------------------------------");
  for (const r of rows) {
    console.log(
      pad(String(r.spin), 4) +
        pad(r.result, 8) +
        pad("−" + php(r.betOut), 12) +
        pad(r.winIn > 0 ? "+" + php(r.winIn) : php(0), 12) +
        pad((r.net >= 0 ? "+" : "") + php(r.net), 12) +
        pad(php(r.balanceAfter), 16) +
        pad(r.match ? "PASS" : "FAIL", 12),
    );
    if (r.result === "WIN") console.log(`     ${r.detail}`);
    else console.log(`     ${r.detail}  |  after bet ${php(r.balanceAfterBet)}`);
  }
  console.log("------------------------------------------------------------");
  console.log(`Wins:           ${wins.length} / ${rows.length}`);
  console.log(`Losses:         ${losses.length} / ${rows.length}`);
  console.log(`Total bet out:  ${php(totalBet)}`);
  console.log(`Total win in:   ${php(totalWin)}`);
  console.log(`Session net:    ${net >= 0 ? "+" : ""}${php(net)}`);
  console.log(`Balance delta:  ${php(startBalance)} → ${php(endBalance)}  (${endBalance - startBalance >= 0 ? "+" : ""}${php(endBalance - startBalance)})`);
  console.log(`HUD vs wallet:  ${mismatches === 0 ? "ALL PASS — every spin matched" : `${mismatches} FAIL`}`);
  console.log("============================================================");
  process.exit(mismatches === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
