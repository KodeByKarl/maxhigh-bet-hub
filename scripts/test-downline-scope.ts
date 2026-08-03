/**
 * Task 2 — Downline scope / IDOR protection tests.
 * Run: npx tsx --env-file=.env scripts/test-downline-scope.ts
 */
import { getDb } from "../src/server/db/client";
import { users, transactions } from "../src/server/db/schema";
import { eq, like, inArray } from "drizzle-orm";
import { isInDownline, scopeToDownline } from "../src/server/auth/network-scope.server";
import type { PublicUser, UserRole } from "../src/lib/user";

const TAG = `scope_${Date.now()}`;

function asPublic(id: string, role: UserRole, username: string): PublicUser {
  return {
    id,
    publicUserId: username,
    role,
    username,
    email: null,
    balance: 0,
    displayName: null,
    avatarUrl: null,
  };
}

async function run() {
  console.log("=========================================");
  console.log("Downline Scope / IDOR Tests (Task 2)");
  console.log("=========================================\n");

  const db = getDb();
  const ids = {
    ma1: `u-ma1-${TAG}`,
    ma2: `u-ma2-${TAG}`,
    ag1: `u-ag1-${TAG}`,
    ag2: `u-ag2-${TAG}`,
    pl1: `u-pl1-${TAG}`,
    pl2: `u-pl2-${TAG}`,
  };

  await db.insert(users).values([
    { id: ids.ma1, username: `ma1_${TAG}`, publicUserId: `ma1_${TAG}`, passwordHash: "x", role: "master_agent", balance: "0" },
    { id: ids.ma2, username: `ma2_${TAG}`, publicUserId: `ma2_${TAG}`, passwordHash: "x", role: "master_agent", balance: "0" },
    {
      id: ids.ag1,
      username: `ag1_${TAG}`,
      publicUserId: `ag1_${TAG}`,
      passwordHash: "x",
      role: "agent",
      balance: "0",
      parentAgentId: ids.ma1,
    },
    {
      id: ids.ag2,
      username: `ag2_${TAG}`,
      publicUserId: `ag2_${TAG}`,
      passwordHash: "x",
      role: "agent",
      balance: "0",
      parentAgentId: ids.ma2,
    },
    {
      id: ids.pl1,
      username: `pl1_${TAG}`,
      publicUserId: `pl1_${TAG}`,
      passwordHash: "x",
      role: "player",
      balance: "50",
      parentAgentId: ids.ag1,
    },
    {
      id: ids.pl2,
      username: `pl2_${TAG}`,
      publicUserId: `pl2_${TAG}`,
      passwordHash: "x",
      role: "player",
      balance: "50",
      parentAgentId: ids.ag2,
    },
  ]);

  const txId1 = `tx1-${TAG}`;
  const txId2 = `tx2-${TAG}`;
  await db.insert(transactions).values([
    {
      id: txId1,
      userId: ids.pl1,
      type: "bet",
      amount: "10.00",
      balanceAfter: "40.00",
      game: "Test",
    },
    {
      id: txId2,
      userId: ids.pl2,
      type: "bet",
      amount: "10.00",
      balanceAfter: "40.00",
      game: "Test",
    },
  ]);

  let pass = 0;
  let fail = 0;
  const check = (label: string, ok: boolean, detail?: string) => {
    if (ok) {
      console.log(`✅ ${label}${detail ? ` — ${detail}` : ""}`);
      pass++;
    } else {
      console.error(`❌ ${label}${detail ? ` — ${detail}` : ""}`);
      fail++;
    }
  };

  const ma1 = asPublic(ids.ma1, "master_agent", "ma1");
  const ag1 = asPublic(ids.ag1, "agent", "ag1");
  const ma2 = asPublic(ids.ma2, "master_agent", "ma2");

  const ma1Scope = await scopeToDownline(ma1);
  check("Master1 scope includes own agent", !!ma1Scope?.includes(ids.ag1));
  check("Master1 scope includes own player", !!ma1Scope?.includes(ids.pl1));
  check("Master1 scope excludes other network", !ma1Scope?.includes(ids.pl2) && !ma1Scope?.includes(ids.ag2));

  const ag1Scope = await scopeToDownline(ag1);
  check("Agent1 scope includes own player only", !!ag1Scope?.includes(ids.pl1) && ag1Scope.length === 1);
  check("Agent1 scope excludes other player", !ag1Scope?.includes(ids.pl2));

  check("IDOR: Master1 can see pl1", await isInDownline(ma1, ids.pl1));
  check("IDOR: Master1 cannot see pl2", !(await isInDownline(ma1, ids.pl2)));
  check("IDOR: Agent1 cannot see pl2", !(await isInDownline(ag1, ids.pl2)));
  check("IDOR: Master2 cannot see pl1", !(await isInDownline(ma2, ids.pl1)));

  // Transaction list simulation with scope filter
  const scopedIds = await scopeToDownline(ag1, { playersOnly: true });
  const visibleTx =
    scopedIds && scopedIds.length > 0
      ? await db.select().from(transactions).where(inArray(transactions.userId, scopedIds))
      : [];
  check(
    "Agent cannot read other network transactions via scoped query",
    visibleTx.every((t) => t.userId === ids.pl1) && !visibleTx.some((t) => t.id === txId2),
  );

  const masterTxIds = await scopeToDownline(ma1, { playersOnly: true });
  const masterTx =
    masterTxIds && masterTxIds.length > 0
      ? await db.select().from(transactions).where(inArray(transactions.userId, masterTxIds))
      : [];
  check(
    "Master can read own downline txs only",
    masterTx.some((t) => t.id === txId1) && !masterTx.some((t) => t.id === txId2),
  );

  await db.delete(transactions).where(like(transactions.id, `%${TAG}%`));
  for (const id of Object.values(ids)) {
    await db.delete(users).where(eq(users.id, id));
  }

  console.log(`\nResults: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
