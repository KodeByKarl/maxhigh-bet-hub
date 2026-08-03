/**
 * Task 3 — Global unique username + publicUserId across hierarchies.
 * Run: npx tsx --env-file=.env scripts/test-global-userid.ts
 */
import { getDb } from "../src/server/db/client";
import { users } from "../src/server/db/schema";
import { eq, like } from "drizzle-orm";
import { hash } from "bcryptjs";

const TAG = `uid_${Date.now()}`;

async function run() {
  console.log("=========================================");
  console.log("Global Username / User ID Tests (Task 3)");
  console.log("=========================================\n");

  const db = getDb();
  const ma1 = `ma1-${TAG}`;
  const ma2 = `ma2-${TAG}`;
  const ag1 = `ag1-${TAG}`;
  const ag2 = `ag2-${TAG}`;
  const pl1 = `pl1-${TAG}`;
  const pwd = await hash("testpass", 4);

  await db.insert(users).values([
    { id: ma1, username: `ma1_${TAG}`, publicUserId: `ma1_${TAG}`, passwordHash: pwd, role: "master_agent", balance: "0" },
    { id: ma2, username: `ma2_${TAG}`, publicUserId: `ma2_${TAG}`, passwordHash: pwd, role: "master_agent", balance: "0" },
    {
      id: ag1,
      username: `aga_${TAG}`,
      publicUserId: `aga_${TAG}`,
      passwordHash: pwd,
      role: "agent",
      balance: "0",
      parentAgentId: ma1,
    },
    {
      id: ag2,
      username: `agb_${TAG}`,
      publicUserId: `agb_${TAG}`,
      passwordHash: pwd,
      role: "agent",
      balance: "0",
      parentAgentId: ma2,
    },
  ]);

  // Agent A creates darwin33
  await db.insert(users).values({
    id: pl1,
    username: `darwin33_${TAG}`,
    publicUserId: `darwin33_${TAG}`,
    passwordHash: pwd,
    role: "player",
    balance: "0",
    parentAgentId: ag1,
  });
  console.log("✅ Agent A created player darwin33");

  let fail = 0;

  // Username collision across hierarchy
  try {
    await db.insert(users).values({
      id: `pl2-${TAG}`,
      username: `darwin33_${TAG}`,
      publicUserId: `otherid_${TAG}`,
      passwordHash: pwd,
      role: "player",
      balance: "0",
      parentAgentId: ag2,
    });
    console.error("❌ Username collision was allowed");
    fail++;
  } catch {
    console.log("✅ Username already exists — blocked across hierarchy");
  }

  // publicUserId collision across hierarchy
  try {
    await db.insert(users).values({
      id: `pl3-${TAG}`,
      username: `othername_${TAG}`,
      publicUserId: `darwin33_${TAG}`,
      passwordHash: pwd,
      role: "player",
      balance: "0",
      parentAgentId: ag2,
    });
    console.error("❌ User ID collision was allowed");
    fail++;
  } catch {
    console.log("✅ User ID already exists — blocked across hierarchy");
  }

  await db.delete(users).where(like(users.username, `%${TAG}%`));

  console.log(`\nDone. Failures: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
