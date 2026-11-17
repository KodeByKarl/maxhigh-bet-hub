/**
 * superCreateUser zero-chip policy test (LOCAL DEMO DATABASE ONLY).
 * Run: node --env-file=<path-to-.env> --import tsx --experimental-test-module-mocks scripts/test-super-create-user.mts
 *
 * Refuses to run unless the DB host is loopback and the database name contains "demo".
 * It creates only uniquely tagged rows and removes them afterwards.
 */
import assert from "node:assert/strict";
import { mock, test, after } from "node:test";
import { randomUUID } from "node:crypto";
import { eq, like, inArray } from "drizzle-orm";

const host = process.env.MYSQL_HOST ?? "127.0.0.1";
const dbName = process.env.MYSQL_DATABASE ?? "";
if (process.env.DATABASE_URL || !["127.0.0.1", "localhost"].includes(host) || !/demo/i.test(dbName)) {
  console.error("Refusing to run: not a loopback demo database.");
  process.exit(2);
}

const TAG = `zc${Date.now().toString(36)}`;
const TOKEN = `tok_${TAG}_${randomUUID()}`;

// Real session validation is used; only the cookie source is stubbed.
mock.module("@tanstack/react-start/server", {
  namedExports: {
    getCookie: () => TOKEN,
    setCookie: () => undefined,
    deleteCookie: () => undefined,
  },
});

const { getDb } = await import("../src/server/db/client.ts");
const { users, sessions, transactions } = await import("../src/server/db/schema.ts");
const { superCreateUser } = await import("../src/server/superadmin/services.server.ts");

const db = getDb();
const saId = `sa-${TAG}`;
await db.insert(users).values({
  id: saId,
  username: `sa_${TAG}`,
  publicUserId: `sa_${TAG}`,
  passwordHash: "x",
  role: "superadmin",
  balance: "0.00",
});
await db.insert(sessions).values({
  id: randomUUID(),
  userId: saId,
  token: TOKEN,
  expiresAt: new Date(Date.now() + 3600_000),
});

async function snapshotForeign() {
  const rows = await db
    .select({ id: users.id, balance: users.balance })
    .from(users);
  return JSON.stringify(rows.filter((r) => !r.id.includes(TAG)).sort((a, b) => a.id.localeCompare(b.id)));
}
const before = await snapshotForeign();

async function ledgerOf(userId: string) {
  return db.select().from(transactions).where(eq(transactions.userId, userId));
}
async function byName(name: string) {
  const [u] = await db.select().from(users).where(eq(users.username, name)).limit(1);
  return u;
}

test("new player with no balance starts at exactly 0 with no ledger rows", async () => {
  const created = await superCreateUser({ username: `p0_${TAG}`, password: "secret123", role: "player" });
  assert.equal(Number(created.balance), 0);
  assert.equal((await ledgerOf(created.id)).length, 0);
});

test("explicit balance of 0 stays 0 with no ledger rows", async () => {
  const created = await superCreateUser({ username: `pz_${TAG}`, password: "secret123", role: "player", balance: 0 });
  assert.equal(Number(created.balance), 0);
  assert.equal((await ledgerOf(created.id)).length, 0);
});

test("authorized opening balance is credited through the ledger and matches the wallet", async () => {
  const created = await superCreateUser({ username: `p5_${TAG}`, password: "secret123", role: "player", balance: 500 });
  assert.equal(Number(created.balance), 500);
  const rows = await ledgerOf(created.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.type, "adjust");
  assert.equal(Number(rows[0]!.amount), 500);
  assert.equal(Number(rows[0]!.balanceAfter), 500);
  assert.match(rows[0]!.note ?? "", /Opening balance from @/);
  const sum = rows.reduce((s, r) => s + Number(r.amount), 0);
  assert.equal(sum, Number((await byName(`p5_${TAG}`))!.balance));
});

test("duplicate submission is rejected and never double-credits", async () => {
  const input = { username: `pd_${TAG}`, password: "secret123", role: "player" as const, balance: 250 };
  const first = await superCreateUser(input);
  await assert.rejects(superCreateUser(input), /already exists/);
  const [a, b] = await Promise.allSettled([
    superCreateUser({ ...input, username: `pc_${TAG}` }),
    superCreateUser({ ...input, username: `pc_${TAG}` }),
  ]);
  assert.equal([a, b].filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(Number((await byName(`pd_${TAG}`))!.balance), 250);
  assert.equal((await ledgerOf(first.id)).length, 1);
  const pc = (await byName(`pc_${TAG}`))!;
  assert.equal(Number(pc.balance), 250);
  assert.equal((await ledgerOf(pc.id)).length, 1);
});

test("negative or non-finite opening balance is rejected and creates nothing", async () => {
  for (const [i, bad] of [-5, Number.NaN, Number.POSITIVE_INFINITY].entries()) {
    await assert.rejects(
      superCreateUser({ username: `pn${i}_${TAG}`, password: "secret123", role: "player", balance: bad }),
      /Invalid initial balance/,
    );
    assert.equal(await byName(`pn${i}_${TAG}`), undefined);
  }
});

test("ledger failure rolls back the whole account (no orphan user, no partial credit)", async () => {
  await assert.rejects(
    superCreateUser({ username: `pr_${TAG}`, password: "secret123", role: "player", balance: 1e13 }),
  );
  assert.equal(await byName(`pr_${TAG}`), undefined);
});

after(async () => {
  const mine = await db.select({ id: users.id }).from(users).where(like(users.username, `%${TAG}`));
  const ids = mine.map((m) => m.id);
  if (ids.length) {
    await db.delete(transactions).where(inArray(transactions.userId, ids));
    await db.delete(sessions).where(inArray(sessions.userId, ids));
    await db.delete(users).where(inArray(users.id, ids));
  }
  const afterSnap = await snapshotForeign();
  console.log(`pre-existing users/balances unchanged: ${before === afterSnap}`);
  if (before !== afterSnap) process.exitCode = 1;
  process.exit(process.exitCode ?? 0);
});
