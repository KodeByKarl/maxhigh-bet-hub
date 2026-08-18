/**
 * Top up every user account to role-based chip targets (ledger-safe).
 *
 * Run: npx tsx --env-file=.env scripts/seed-all-chips.ts
 * Optional: npx tsx --env-file=.env scripts/seed-all-chips.ts --force
 *   --force sets balance exactly to target (may deduct excess).
 */
import "dotenv/config";
import { getDb } from "../src/server/db/client";
import { users } from "../src/server/db/schema";
import { writeLedgerDelta } from "../src/server/wallet.server";
import type { UserRole } from "../src/lib/user";

const TARGET_BY_ROLE: Record<UserRole, number> = {
  superadmin: 100_000,
  master_agent: 100_000,
  agent: 50_000,
  admin: 50_000,
  player: 10_000,
};

function targetForRole(role: string): number {
  return TARGET_BY_ROLE[role as UserRole] ?? 10_000;
}

async function main() {
  const force = process.argv.includes("--force");
  const db = getDb();
  const rows = await db.select().from(users);

  if (rows.length === 0) {
    console.log("No users in database — run npm run db:seed first.");
    process.exit(0);
  }

  console.log(`Seeding chips for ${rows.length} account(s)…\n`);

  let credited = 0;
  let skipped = 0;

  for (const user of rows) {
    const current = Number(user.balance);
    const target = targetForRole(user.role);
    let delta = +(target - current).toFixed(2);

    if (!force && delta <= 0) {
      console.log(`  skip @${user.username} (${user.role}) — already ₱${current.toLocaleString("en-PH")}`);
      skipped++;
      continue;
    }

    if (force && delta === 0) {
      console.log(`  ok   @${user.username} (${user.role}) — already at ₱${target.toLocaleString("en-PH")}`);
      skipped++;
      continue;
    }

    if (force && delta < 0) {
      // Deduct excess down to target
      await db.transaction(async (tx) => {
        await writeLedgerDelta(tx, {
          userId: user.id,
          username: user.username,
          delta,
          type: "adjust",
          game: "SeedScript",
          note: `Seed reset to ₱${target.toLocaleString("en-PH")} (${user.role})`,
        });
      });
      console.log(
        `  trim @${user.username} (${user.role}) ₱${current.toLocaleString("en-PH")} → ₱${target.toLocaleString("en-PH")}`,
      );
      credited++;
      continue;
    }

    await db.transaction(async (tx) => {
      await writeLedgerDelta(tx, {
        userId: user.id,
        username: user.username,
        delta,
        type: "adjust",
        game: "SeedScript",
        note: `Seed chips to ₱${target.toLocaleString("en-PH")} (${user.role})`,
      });
    });

    console.log(
      `  +₱${delta.toLocaleString("en-PH")} @${user.username} (${user.role}) → ₱${target.toLocaleString("en-PH")}`,
    );
    credited++;
  }

  console.log(`\nDone — ${credited} updated, ${skipped} unchanged.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
