/**
 * Tasks 4/6/7 — Superadmin chip password + jackpot toggle/display.
 * Run: npx tsx --env-file=.env scripts/test-sa-chip-jackpot.ts
 */
import { getDb } from "../src/server/db/client";
import { jackpot, users } from "../src/server/db/schema";
import { eq, like } from "drizzle-orm";
import { hash } from "bcryptjs";
import {
  isMegaJackpotEnabled,
  verifySuperadminChipPassword,
} from "../src/server/superadmin/services.server";
import { fetchJackpot } from "../src/server/services.server";
import { money } from "../src/server/session";

const TAG = `sajp_${Date.now()}`;

async function run() {
  console.log("=========================================");
  console.log("SA Password + Jackpot Tests (Tasks 4/6/7)");
  console.log("=========================================\n");

  const db = getDb();
  const saId = `sa-${TAG}`;
  const password = "SuperSecret1!";
  const passwordHash = await hash(password, 4);

  await db.insert(users).values({
    id: saId,
    username: `sa_${TAG}`,
    publicUserId: `sa_${TAG}`,
    passwordHash,
    role: "superadmin",
    balance: "0",
    failedAttempts: 0,
    lockedUntil: null,
  });

  let fail = 0;

  // Task 4 — wrong password
  try {
    await verifySuperadminChipPassword(saId, "wrong-password");
    console.error("❌ Wrong password was accepted");
    fail++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("incorrect password") || msg.includes("Unauthorized")) {
      console.log("✅ Wrong chip-confirm password rejected");
    } else {
      console.error("❌ Unexpected error:", msg);
      fail++;
    }
  }

  // Task 4 — correct password
  try {
    await verifySuperadminChipPassword(saId, password);
    console.log("✅ Correct chip-confirm password accepted");
  } catch (err) {
    console.error("❌ Correct password failed:", err);
    fail++;
  }

  // Task 4 — lockout after repeated failures
  for (let i = 0; i < 5; i++) {
    try {
      await verifySuperadminChipPassword(saId, "bad");
    } catch {
      /* expected */
    }
  }
  try {
    await verifySuperadminChipPassword(saId, password);
    console.error("❌ Lockout did not block after failures");
    fail++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("locked") || msg.toLowerCase().includes("too many")) {
      console.log("✅ Lockout after repeated failed chip-confirm attempts");
    } else {
      console.error("❌ Unexpected lockout error:", msg);
      fail++;
    }
  }

  // Reset lock for cleanup path
  await db.update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, saId));

  // Ensure mega row
  const [existing] = await db.select().from(jackpot).where(eq(jackpot.id, "mega")).limit(1);
  if (!existing) {
    await db.insert(jackpot).values({
      id: "mega",
      amount: money(12345),
      enabled: "yes",
      displayAmount: money(500_000_000),
    });
  }

  // Task 6 — toggle off
  await db.update(jackpot).set({ enabled: "no" }).where(eq(jackpot.id, "mega"));
  if ((await isMegaJackpotEnabled()) === false) {
    console.log("✅ Mega Jackpot OFF persisted");
  } else {
    console.error("❌ Mega Jackpot OFF not reflected");
    fail++;
  }

  await db.update(jackpot).set({ enabled: "yes" }).where(eq(jackpot.id, "mega"));
  if ((await isMegaJackpotEnabled()) === true) {
    console.log("✅ Mega Jackpot ON persisted");
  } else {
    console.error("❌ Mega Jackpot ON not reflected");
    fail++;
  }

  // Task 7 — display amount independent of pool
  await db
    .update(jackpot)
    .set({ amount: money(111), displayAmount: money(999_000_000) })
    .where(eq(jackpot.id, "mega"));
  const publicJp = await fetchJackpot();
  if (publicJp.amount === 999_000_000 && publicJp.poolAmount === 111) {
    console.log("✅ Player fetch returns Ultra Mega display, not real pool");
  } else {
    console.error("❌ Display/pool mismatch", publicJp);
    fail++;
  }

  await db.delete(users).where(like(users.username, `%${TAG}%`));

  console.log(`\nDone. Failures: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
