/**
 * Task 1 — Role-based chip permission tests (assertCanManageChips).
 * Run: npx tsx --env-file=.env scripts/test-chip-hierarchy.ts
 */
import { getDb } from "../src/server/db/client";
import { users } from "../src/server/db/schema";
import { eq, like } from "drizzle-orm";
import { assertCanManageChips } from "../src/server/auth/network-scope.server";
import type { UserRole } from "../src/lib/user";

const TAG = `chip_hier_${Date.now()}`;

function actor(id: string, role: UserRole, username: string) {
  return { id, role, username };
}

function target(id: string, role: UserRole, parentAgentId: string | null, username: string) {
  return { id, role, parentAgentId, username };
}

async function expectForbidden(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.error(`❌ ${label}: expected Forbidden, but succeeded`);
    return false;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("Forbidden")) {
      console.log(`✅ ${label}: blocked — ${msg}`);
      return true;
    }
    console.error(`❌ ${label}: wrong error — ${msg}`);
    return false;
  }
}

async function expectOk(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${label}`);
    return true;
  } catch (err) {
    console.error(`❌ ${label}: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function run() {
  console.log("=========================================");
  console.log("Chip Hierarchy Permission Tests (Task 1)");
  console.log("=========================================\n");

  const db = getDb();
  const ids = {
    sa: `u-sa-${TAG}`,
    ma1: `u-ma1-${TAG}`,
    ma2: `u-ma2-${TAG}`,
    ag1: `u-ag1-${TAG}`,
    ag2: `u-ag2-${TAG}`,
    pl1: `u-pl1-${TAG}`,
    pl2: `u-pl2-${TAG}`,
    plDirect: `u-pld-${TAG}`,
  };

  await db.insert(users).values([
    { id: ids.sa, username: `sa_${TAG}`, publicUserId: `sa_${TAG}`, passwordHash: "x", role: "superadmin", balance: "0" },
    { id: ids.ma1, username: `ma1_${TAG}`, publicUserId: `ma1_${TAG}`, passwordHash: "x", role: "master_agent", balance: "10000" },
    { id: ids.ma2, username: `ma2_${TAG}`, publicUserId: `ma2_${TAG}`, passwordHash: "x", role: "master_agent", balance: "10000" },
    {
      id: ids.ag1,
      username: `ag1_${TAG}`,
      publicUserId: `ag1_${TAG}`,
      passwordHash: "x",
      role: "agent",
      balance: "5000",
      parentAgentId: ids.ma1,
    },
    {
      id: ids.ag2,
      username: `ag2_${TAG}`,
      publicUserId: `ag2_${TAG}`,
      passwordHash: "x",
      role: "agent",
      balance: "5000",
      parentAgentId: ids.ma2,
    },
    {
      id: ids.pl1,
      username: `pl1_${TAG}`,
      publicUserId: `pl1_${TAG}`,
      passwordHash: "x",
      role: "player",
      balance: "100",
      parentAgentId: ids.ag1,
    },
    {
      id: ids.pl2,
      username: `pl2_${TAG}`,
      publicUserId: `pl2_${TAG}`,
      passwordHash: "x",
      role: "player",
      balance: "100",
      parentAgentId: ids.ag2,
    },
    {
      id: ids.plDirect,
      username: `pld_${TAG}`,
      publicUserId: `pld_${TAG}`,
      passwordHash: "x",
      role: "player",
      balance: "100",
      parentAgentId: ids.ma1,
    },
  ]);

  let pass = 0;
  let fail = 0;
  const check = async (ok: boolean) => {
    if (ok) pass++;
    else fail++;
  };

  // Happy paths
  await check(
    await expectOk("SuperAdmin → Master Agent", () =>
      assertCanManageChips(actor(ids.sa, "superadmin", "sa"), target(ids.ma1, "master_agent", null, "ma1")),
    ),
  );
  await check(
    await expectOk("SuperAdmin → Agent", () =>
      assertCanManageChips(actor(ids.sa, "superadmin", "sa"), target(ids.ag1, "agent", ids.ma1, "ag1")),
    ),
  );
  await check(
    await expectOk("SuperAdmin → Player", () =>
      assertCanManageChips(actor(ids.sa, "superadmin", "sa"), target(ids.pl1, "player", ids.ag1, "pl1")),
    ),
  );
  await check(
    await expectOk("Master → own Agent", () =>
      assertCanManageChips(actor(ids.ma1, "master_agent", "ma1"), target(ids.ag1, "agent", ids.ma1, "ag1")),
    ),
  );
  await check(
    await expectOk("Master → player under own Agent", () =>
      assertCanManageChips(actor(ids.ma1, "master_agent", "ma1"), target(ids.pl1, "player", ids.ag1, "pl1")),
    ),
  );
  await check(
    await expectOk("Master → direct player", () =>
      assertCanManageChips(
        actor(ids.ma1, "master_agent", "ma1"),
        target(ids.plDirect, "player", ids.ma1, "pld"),
      ),
    ),
  );
  await check(
    await expectOk("Agent → own Player", () =>
      assertCanManageChips(actor(ids.ag1, "agent", "ag1"), target(ids.pl1, "player", ids.ag1, "pl1")),
    ),
  );

  // Blocked paths
  await check(
    await expectForbidden("Agent → other Agent's player", () =>
      assertCanManageChips(actor(ids.ag1, "agent", "ag1"), target(ids.pl2, "player", ids.ag2, "pl2")),
    ),
  );
  await check(
    await expectForbidden("Agent → another Agent", () =>
      assertCanManageChips(actor(ids.ag1, "agent", "ag1"), target(ids.ag2, "agent", ids.ma2, "ag2")),
    ),
  );
  await check(
    await expectForbidden("Master → outside network player", () =>
      assertCanManageChips(actor(ids.ma1, "master_agent", "ma1"), target(ids.pl2, "player", ids.ag2, "pl2")),
    ),
  );
  await check(
    await expectForbidden("Master → other Master's agent", () =>
      assertCanManageChips(actor(ids.ma1, "master_agent", "ma1"), target(ids.ag2, "agent", ids.ma2, "ag2")),
    ),
  );
  await check(
    await expectForbidden("SuperAdmin → another SuperAdmin", () =>
      assertCanManageChips(actor(ids.sa, "superadmin", "sa"), target(ids.sa, "superadmin", null, "sa")),
    ),
  );

  // Cleanup
  for (const id of Object.values(ids)) {
    await db.delete(users).where(eq(users.id, id));
  }
  // Extra safety for any leaked usernames
  await db.delete(users).where(like(users.username, `%${TAG}%`));

  console.log(`\n=========================================`);
  console.log(`Results: ${pass} passed, ${fail} failed`);
  console.log(`=========================================`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
