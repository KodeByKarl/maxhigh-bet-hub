/**
 * Verify mega jackpot bump never blocks ledger bets/wins.
 * Run: npx tsx --env-file=.env scripts/verify-jackpot-ledger.ts
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../src/server/db/client";
import { jackpot, users } from "../src/server/db/schema";
import { bumpMegaJackpot, writeLedgerDelta } from "../src/server/wallet.server";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const db = getDb();

  // Ensure mega row exists via atomic upsert
  await bumpMegaJackpot(0.01, { insertFloor: 10_000 });
  const beforeRows = await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
  assert(!!beforeRows[0], "mega jackpot row missing after bump");
  const before = Number(beforeRows[0]!.amount);
  console.log("mega before:", before);

  // Concurrent bumps must all apply (atomic add)
  await Promise.all([bumpMegaJackpot(0.05), bumpMegaJackpot(0.05), bumpMegaJackpot(0.05)]);
  await sleep(50);
  const afterBump = Number(
    (await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1))[0]!.amount,
  );
  assert(Math.abs(afterBump - (before + 0.15)) < 0.001, `expected +0.15, got ${afterBump} from ${before}`);
  console.log("✓ concurrent atomic bumps OK →", afterBump);

  const [player] = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.username}) = 'player1'`)
    .limit(1);
  if (!player) {
    console.log("player1 missing — skip ledger path (seed first)");
  } else {
    const balBefore = Number(player.balance);
    const jpBefore = Number(
      (await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1))[0]!.amount,
    );

    const result = await db.transaction(async (tx) => {
      return writeLedgerDelta(tx, {
        userId: player.id,
        username: player.username,
        delta: -2,
        type: "bet",
        game: "Panther Peak",
        note: "jackpot-verify bet",
      });
    });
    assert(Math.abs(result.balance - (balBefore - 2)) < 0.001, "bet balance mismatch");

    // Jackpot is async/scheduled — give it a moment
    await sleep(150);
    const jpAfter = Number(
      (await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1))[0]!.amount,
    );
    assert(jpAfter >= jpBefore + 0.02 - 0.001, `jackpot should rise by ~0.02: ${jpBefore} → ${jpAfter}`);
    console.log("✓ bet ledger OK; jackpot", jpBefore, "→", jpAfter);

    // Refund the test bet so we don't drain player1
    await db.transaction(async (tx) => {
      await writeLedgerDelta(tx, {
        userId: player.id,
        username: player.username,
        delta: 2,
        type: "adjust",
        game: "Panther Peak",
        note: "jackpot-verify refund",
      });
    });
  }

  console.log("All jackpot ledger checks passed.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
