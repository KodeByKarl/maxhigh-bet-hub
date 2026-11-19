// Regression guard for the "games still locked in production" incident (2026-11-19).
// Production kept serving release 29656ce, whose compiled policy locked 50 of the 100 contracted games, while QA ran as the
// developer account (uat_owner), which the policy deliberately exempts. This test checks the SHIPPED policy against the
// authoritative manifest from the point of view of every CLIENT role, so a re-locked or mis-keyed release fails CI.
// Pure logic: no database access (the shipped policy has no grant keys, so no grant rows are read).
import assert from "node:assert/strict";
process.env.DATABASE_URL ??= "mysql://audit:audit@127.0.0.1:1/audit";
const { slotGames } = await import("../src/lib/games");
const { REALMS_GAMES } = await import("../src/lib/realms/catalog");
const { resolveLazyGame } = await import("../src/components/maxhigh/gamePlayRegistry");
const access = await import("../src/server/access-policy.server");
const policy = access.getAccessPolicy();

let checks = 0;
const ok = (name: string) => {
  checks++;
  console.log("PASS", name);
};

// ---- authoritative manifest: 100 contracted games, unique IDs, every one launchable from the lobby
const CONTRACTED_GAMES = 100;
const ids = slotGames.map((g) => g.id);
assert.equal(ids.length, CONTRACTED_GAMES, "manifest must list exactly the 100 contracted games");
assert.equal(new Set(ids).size, ids.length, "manifest game IDs must be unique");
for (const id of ids) assert.match(id, /^[a-z0-9-]+$/, `game ID ${id} must be a normalized slug`);
assert.equal(REALMS_GAMES.length, 50, "the Realms family contributes 50 titles");
for (const r of REALMS_GAMES)
  assert.ok(ids.includes(r.id), `Realms title ${r.id} is in the lobby manifest`);
for (const id of ids) assert.ok(resolveLazyGame(id), `${id} resolves to a launch component`);
ok(`manifest has ${ids.length} unique, launchable game IDs`);

// ---- compiled policy: every listed ID must be a real catalog ID (a typo would silently lock nothing / the wrong game)
for (const id of policy.gameLocks.lockedGames)
  assert.ok(ids.includes(id), `locked game ${id} is not in the manifest`);
ok("every compiled lock ID exists in the manifest");

// ---- full-catalog release: nothing is locked for any client-facing identity
assert.equal(policy.environment, "production");
assert.deepEqual(
  [...policy.gameLocks.lockedGames],
  [],
  "full-catalog release: no contracted game may be locked",
);
assert.equal(
  policy.grantKeys.length,
  0,
  "no grant keys: entitlement state cannot be changed from the database",
);
ok("shipped production policy locks no games");

const clients = [
  { id: "p", username: "qa_player", role: "player" },
  { id: "a", username: "qa_agent", role: "agent" },
  { id: "m", username: "qa_master", role: "master_agent" },
  { id: "s", username: "client_admin", role: "superadmin" }, // client administrator (not the developer)
  { id: "o", username: policy.clientOwnerAccounts[0] ?? "client_owner", role: "superadmin" },
];
for (const who of clients)
  assert.equal(
    access.isDeveloperAccount(who),
    false,
    `${who.username} must not be the developer QA identity`,
  );

// Anonymous lobby and every client role see zero locked games (the developer account must not be the only proof).
assert.deepEqual((await access.getPublicAccessStatus()).lockedGames, []);
for (const who of clients) {
  const status = await access.getPublicAccessStatus(who);
  assert.deepEqual(status.lockedGames, [], `${who.role} lobby shows no locked games`);
  assert.equal(status.message, null);
  assert.equal(status.ownerQa, undefined, `${who.role} is not on the developer QA path`);
}
ok(
  "lobby access status is empty for anonymous, player, agent, master agent, client admin and client owner",
);

// Server wager gate: a NEW wager (not a settle action) on every game passes for every client role.
const wagerAction = (id: string) =>
  REALMS_GAMES.some((r) => r.id === id)
    ? "realmsSpinFn"
    : `${id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())}SpinFn`;
for (const id of ids) {
  assert.equal(access.isSettleAction(wagerAction(id)), false);
  for (const who of clients) await access.assertGameAccess(id, wagerAction(id), who);
}
ok(`server wager gate admits all ${ids.length} games for ${clients.length} client identities`);

// Admin activation gate: a client administrator may switch every game on.
for (const id of ids) await access.assertGameActivatable(id, clients[3]!);
ok("client administrator may activate every catalog game");

console.log(`catalog-access: ${checks} checks passed`);
process.exit(0);
