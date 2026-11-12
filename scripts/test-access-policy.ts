// Unit tests for src/server/access-policy.server.ts (pure logic; no database writes). Keys are generated at runtime and never stored.
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
process.env.DATABASE_URL = "mysql://root:audit-local-only@127.0.0.1:19307/restr_conc";
process.env.MAXHIGH_POLICY_TEST_OVERRIDE = "disposable-test-only";
const mod = await import("../src/server/access-policy.server");
const { verifyGrant, isSettleAction, assertGameAccess, getEffectiveLockedGames, overridePolicyForDisposableTests, GAME_LOCKED_MESSAGE, getAccessPolicy } = mod;

let checks = 0;
const ok = (n: string) => { checks++; console.log("PASS", n); };

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const other = generateKeyPairSync("ed25519");
const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
const base = { enforcement: "on" as const };
const policy = {
  version: 1 as const, environment: "uat",
  gameLocks: { ...base, lockedGames: ["golden-panther", "deep-bass", "threecardpoker", "abyssal-pearls"] },
  clientAccounts: { ...base, maxClientAccounts: 2 },
  developerAccounts: ["owner_superadmin"],
  clientOwnerAccounts: ["client_owner"],
  grantKeys: [{ id: "dev-1", publicKeyPem: pem }],
};
const signPayload = (p: string, key = privateKey) => sign(null, Buffer.from(p, "utf8"), key).toString("base64");
const grant = (extra: object = {}) => JSON.stringify({ v: 1, kind: "unlock-games", environment: "uat", nonce: "n".repeat(20), issuedAt: "2026-11-10T00:00:00.000Z", games: ["deep-bass"], ...extra });

// ---- shipped policy = the approved limited client testing configuration
{
  const fs = await import("node:fs");
  const alloc = JSON.parse(fs.readFileSync("deploy/handoff/PROPOSED_GAME_ALLOCATION.json", "utf8"));
  const p = getAccessPolicy();
  assert.equal(p.environment, "production", "production release must disable UAT credit privileges");
  for (const username of ["uat_owner", "client_owner"]) {
    assert.equal(mod.ownerMayCreditSelf({ id: "production-owner", username, role: "superadmin" }, "production-owner"), false);
  }
  assert.equal(p.gameLocks.enforcement, "on");
  assert.equal(p.clientAccounts.enforcement, "off", "the client account cap was removed by the owner");
  assert.deepEqual([...p.developerAccounts], ["uat_owner"], "the developer maintenance account is named in the compiled policy");
  assert.deepEqual([...p.clientOwnerAccounts], ["client_owner"], "the client's primary owner account is named in the compiled policy");
  assert.ok(![...p.clientOwnerAccounts].some((n) => p.developerAccounts.includes(n)), "client owner and developer are different identities");
  assert.equal(p.grantKeys.length, 0, "no signing key for this handover: unlocking requires a new verified release");
  assert.equal(p.gameLocks.lockedGames.length, 50);
  assert.equal(new Set(p.gameLocks.lockedGames).size, 50);
  assert.deepEqual([...p.gameLocks.lockedGames].sort(), [...alloc.locked].sort(), "compiled locks equal the approved allocation");
  assert.ok(!p.gameLocks.lockedGames.includes("wild-panther"), "Wild Panther stays playable");
  assert.ok(p.gameLocks.lockedGames.includes("color-game-pro"), "Color Game Pro stays locked");
  for (const g of alloc.available) assert.ok(!p.gameLocks.lockedGames.includes(g), g);
}
ok("shipped policy is the approved configuration: 50 locked, 50 playable, NO account cap, client owner and developer identities named, no grant keys");

// ---- override is refused outside a disposable environment
process.env.MAXHIGH_POLICY_TEST_OVERRIDE = "";
assert.throws(() => overridePolicyForDisposableTests(policy), /refused/);
process.env.MAXHIGH_POLICY_TEST_OVERRIDE = "disposable-test-only";
process.env.DATABASE_URL = "mysql://u:p@db.example.com:3306/maxhigh_staging";
assert.throws(() => overridePolicyForDisposableTests(policy), /refused/);
process.env.DATABASE_URL = "mysql://u:p@127.0.0.1:3306/maxhigh_staging";
assert.throws(() => overridePolicyForDisposableTests(policy), /refused/, "a real-looking local database name must be refused too");
process.env.DATABASE_URL = "mysql://root:audit-local-only@127.0.0.1:19307/restr_conc";
// Gate tests use a keyless policy so nothing reads the database; the keyed policy is installed later for signature checks.
overridePolicyForDisposableTests({ ...policy, grantKeys: [] });
ok("policy override refused unless explicitly enabled AND the DB is loopback + disposable-named");

// ---- settle vs new wager classification
for (const a of ["goldenPantherFreeSpinFn", "realmsFreeSpinFn", "threeCardPokerPlayFn", "threeCardPokerFoldFn", "dropDeluxeDrawFn", "luckyDropGuessFn", "luckyDropCashoutFn", "luckyDropSkipFn", "tongitsArenaPlayFn"])
  assert.equal(isSettleAction(a), true, a);
for (const a of ["goldenPantherSpinFn", "realmsSpinFn", "wildPantherBuyFeatureFn", "threeCardPokerDealFn", "colorGameDealFn", "luckyDropStartFn", "dropDeluxeDealFn", "deepBassFireShotFn", "deepBassBuyPowerUpFn", "deepBassUseNetBombFn", "deepBassEnsureSessionFn", "unknownNewGameFn", "goldenPantherBuyFeatureFn"])
  assert.equal(isSettleAction(a), false, a);
ok("settle actions (finish a paid round) are distinguished from new wagers; unknown actions default to refused");

// ---- the gate
const roles = [{ id: "u1", username: "player", role: "player" }, { id: "u3", username: "client_admin", role: "superadmin" }, { id: "u4", username: "staff_admin", role: "admin" }];
const owner = { id: "u2", username: "owner_superadmin", role: "superadmin" };
const locked = await getEffectiveLockedGames();
assert.deepEqual([...locked].sort(), ["abyssal-pearls", "deep-bass", "golden-panther", "threecardpoker"]);
for (const who of roles) {
  for (const [g, a] of [["golden-panther", "goldenPantherSpinFn"], ["golden-panther", "goldenPantherBuyFeatureFn"], ["deep-bass", "deepBassFireShotFn"], ["threecardpoker", "threeCardPokerDealFn"], ["abyssal-pearls", "realmsSpinFn"]] as const)
    await assert.rejects(assertGameAccess(g, a, who), new RegExp(GAME_LOCKED_MESSAGE.slice(0, 30)), `${who.username} ${g} ${a}`);
}
ok("every new wager / feature purchase / fishing shot on a locked game is refused for players, client superadmins and client staff");
// ---- owner QA path: by account identity only, server-side
for (const [g, a] of [["golden-panther", "goldenPantherSpinFn"], ["deep-bass", "deepBassFireShotFn"], ["abyssal-pearls", "realmsSpinFn"]]) await assertGameAccess(g, a, owner);
await assert.rejects(assertGameAccess("golden-panther", "goldenPantherSpinFn", { id: "x", username: "owner_superadmin", role: "admin" }), new RegExp(GAME_LOCKED_MESSAGE.slice(0, 30)), "owner username without the superadmin role is NOT the owner");
await assert.rejects(assertGameAccess("golden-panther", "goldenPantherSpinFn", { id: "x", username: "Owner_Superadmin2", role: "superadmin" }), new RegExp(GAME_LOCKED_MESSAGE.slice(0, 30)), "a similar username is not the owner");
assert.equal(mod.isDeveloperAccount(owner), true);
assert.equal(mod.isDeveloperAccount({ username: "OWNER_SUPERADMIN", role: "superadmin" }), true);
assert.equal(mod.isDeveloperAccount({ username: "client_admin", role: "superadmin" }), false);
assert.equal(mod.isDeveloperAccount(null), false);
assert.equal((await mod.getPublicAccessStatus(owner)).lockedGames.length, 0);
assert.equal((await mod.getPublicAccessStatus(owner)).ownerQa, true);
assert.equal((await mod.getPublicAccessStatus(roles[1]!)).lockedGames.length, 4);
assert.equal((await mod.getPublicAccessStatus()).lockedGames.length, 4);
await mod.assertGameActivatable("golden-panther", owner);
await assert.rejects(mod.assertGameActivatable("golden-panther", roles[1]!), new RegExp(GAME_LOCKED_MESSAGE.slice(0, 30)), "a client superadmin cannot switch a locked game on");
ok("developer QA path works for the named developer account only; the lobby status and activation guard stay locked for everyone else");
// ---- the owner account is protected from client administrators
await mod.assertNotProtectedOwner(owner, { id: "u2", username: "owner_superadmin" });
await mod.assertNotProtectedOwner(roles[1]!, { id: "u9", username: "some_player" });
await assert.rejects(mod.assertNotProtectedOwner(roles[1]!, { id: "u2", username: "owner_superadmin" }), /protected owner account/);
await assert.rejects(mod.assertNotProtectedOwner(roles[2]!, { id: "u2", username: "OWNER_SUPERADMIN" }), /protected owner account/);
ok("a client administrator cannot modify the protected owner account (case-insensitive); the owner and ordinary targets are unaffected");
assert.equal(mod.ownerMayCreditSelf(owner, owner.id), true, "the owner may credit itself with synthetic QA credits on the UAT");
// ---- client owner: full configuration of all 100 games, but NO gameplay or activation of locked games
const clientOwner = { id: "u5", username: "client_owner", role: "superadmin" };
await assert.rejects(assertGameAccess("golden-panther", "goldenPantherSpinFn", clientOwner), new RegExp(GAME_LOCKED_MESSAGE.slice(0, 30)), "the client owner cannot play a locked game");
await assert.rejects(assertGameAccess("deep-bass", "deepBassFireShotFn", clientOwner), new RegExp(GAME_LOCKED_MESSAGE.slice(0, 30)));
await assertGameAccess("color-game", "colorGameDealFn", clientOwner);
await assert.rejects(mod.assertGameActivatable("golden-panther", clientOwner), new RegExp(GAME_LOCKED_MESSAGE.slice(0, 30)), "the client owner cannot activate a locked game");
assert.equal((await mod.getPublicAccessStatus(clientOwner)).lockedGames.length, 4, "the client owner's lobby shows the locked games");
assert.equal(mod.isClientOwnerAccount(clientOwner), true);
assert.equal(mod.isClientOwnerAccount({ ...clientOwner, role: "admin" }), false);
assert.equal(mod.isDeveloperAccount(clientOwner), false, "the client owner is not the developer");
assert.equal(mod.isClientOwnerAccount(owner), false, "the developer is not the client owner");
assert.equal(mod.hasFullGameConfigAccess(clientOwner), true);
assert.equal(mod.hasFullGameConfigAccess(owner), true);
assert.equal(mod.hasFullGameConfigAccess(roles[1]!), false);
await mod.assertGameConfigAccess(clientOwner, "golden-panther");
await mod.assertGameConfigAccess(owner, "golden-panther");
await mod.assertGameConfigAccess(roles[1]!, "color-game");
await assert.rejects(mod.assertGameConfigAccess(roles[1]!, "golden-panther"), new RegExp(GAME_LOCKED_MESSAGE.slice(0, 30)), "a client administrator cannot configure a locked game");
await assert.rejects(mod.assertGameConfigAccess(roles[0]!, "deep-bass"), new RegExp(GAME_LOCKED_MESSAGE.slice(0, 30)));
assert.equal(mod.ownerMayCreditSelf(clientOwner, clientOwner.id), true, "the client owner may credit itself with synthetic test credits on the UAT");
ok("client owner: configures all games, plays only unlocked ones, cannot play/activate locked ones; client administrators configure unlocked games only");
// protected identities
await mod.assertNotProtectedOwner(clientOwner, { id: "u5", username: "client_owner" });
await mod.assertNotProtectedOwner(owner, { id: "u5", username: "client_owner" });
await assert.rejects(mod.assertNotProtectedOwner(roles[1]!, { id: "u5", username: "client_owner" }), /protected owner account/, "client administrators cannot modify the client owner");
await assert.rejects(mod.assertNotProtectedOwner(clientOwner, { id: "u2", username: "owner_superadmin" }), /protected owner account/, "the client owner cannot modify the developer account");
await mod.assertNotProtectedOwner(clientOwner, { id: "u9", username: "some_admin" });
ok("protected identities: client owner modifiable by itself and the developer only; developer account by the developer only");
assert.equal(mod.ownerMayCreditSelf(owner, "someone-else"), false);
assert.equal(mod.ownerMayCreditSelf(roles[1]!, roles[1]!.id), false, "a client superadmin may not credit itself");
assert.equal(mod.ownerMayCreditSelf({ ...owner, role: "admin" }, owner.id), false);
ok("only the named owner account may self-credit synthetic QA credits (UAT environment only)");
for (const who of roles) {
  await assertGameAccess("golden-panther", "goldenPantherFreeSpinFn", who);
  await assertGameAccess("threecardpoker", "threeCardPokerPlayFn", who);
  await assertGameAccess("abyssal-pearls", "realmsFreeSpinFn", who);
}
ok("a round already paid for can still be finished on a locked game (no stranded sessions)");
for (const who of roles) await assertGameAccess("color-game", "colorGameDealFn", who);
ok("unlocked games are untouched");
assert.equal(GAME_LOCKED_MESSAGE, "Game Locked. Please settle the remaining project payment to activate this game.");
assert.equal(mod.ACCOUNT_LIMIT_MESSAGE, "Account Limit Reached. Please settle the remaining project payment to add more client accounts.");
assert.equal(mod.REGISTRATION_LIMIT_MESSAGE, mod.ACCOUNT_LIMIT_MESSAGE);
assert.equal(mod.ADMIN_LIMIT_MESSAGE, mod.ACCOUNT_LIMIT_MESSAGE);
assert.equal(new mod.GameLockedError().code, "GAME_LOCKED");
assert.equal(new mod.ClientLimitError("x", 2).code, "ACCOUNT_LIMIT_REACHED");
assert.equal(new mod.ClientLimitError("x", 2).message, mod.ACCOUNT_LIMIT_MESSAGE);
// only STAFF accounts count toward the cap; ordinary players never do
assert.equal(mod.countsTowardCap("player", "client"), false);
for (const r of ["admin", "agent", "master_agent", "superadmin"]) assert.equal(mod.countsTowardCap(r, "client"), true, r);
assert.equal(mod.countsTowardCap("admin", "qa"), false);
assert.equal(mod.countsTowardCap("superadmin", "admin"), false);
ok("payment notifications use the final wording, stable error codes, and the cap counts staff accounts only");

// ---- grant verification (keyed policy; verifyGrant itself never touches the database)
overridePolicyForDisposableTests(policy);
const good = grant();
assert.equal(verifyGrant(good, signPayload(good), "dev-1", new Date("2026-11-11")).kind, "unlock-games");
ok("a correctly signed grant verifies");
assert.throws(() => verifyGrant(good.replace("deep-bass", "golden-panther"), signPayload(good), "dev-1"), /Invalid grant signature/);
assert.throws(() => verifyGrant(good, signPayload(good, other.privateKey), "dev-1"), /Invalid grant signature/);
assert.throws(() => verifyGrant(good, signPayload(good), "dev-2"), /Unknown grant key/);
assert.throws(() => verifyGrant(good, "AAAA", "dev-1"), /Invalid grant signature/);
ok("tampered payload, wrong signing key, unknown key id and garbage signature are all rejected");
const wrongEnv = grant({ environment: "production" });
assert.throws(() => verifyGrant(wrongEnv, signPayload(wrongEnv), "dev-1"), /different environment/);
const expired = grant({ expiresAt: "2026-01-01T00:00:00.000Z" });
assert.throws(() => verifyGrant(expired, signPayload(expired), "dev-1", new Date("2026-11-10")), /expired/);
const malformed = JSON.stringify({ v: 1, kind: "unlock-games", environment: "uat", nonce: "n".repeat(20), issuedAt: "2026-11-10T00:00:00.000Z", games: ["../../etc/passwd"] });
assert.throws(() => verifyGrant(malformed, signPayload(malformed), "dev-1"), /Malformed/);
const unknownKind = JSON.stringify({ v: 1, kind: "root-shell", environment: "uat", nonce: "n".repeat(20), issuedAt: "2026-11-10T00:00:00.000Z" });
assert.throws(() => verifyGrant(unknownKind, signPayload(unknownKind), "dev-1"), /Malformed/);
ok("grants for another environment, expired grants, malformed ids and unknown kinds are rejected");
const exempt = grant({ kind: "authorize-exempt-account", username: "qa_helper", accountClass: "qa", games: undefined });
assert.equal(verifyGrant(exempt, signPayload(exempt), "dev-1").kind, "authorize-exempt-account");
const cap = JSON.stringify({ v: 1, kind: "lift-client-cap", environment: "uat", nonce: "c".repeat(20), issuedAt: "2026-11-10T00:00:00.000Z", maxClientAccounts: 10 });
assert.equal(verifyGrant(cap, signPayload(cap), "dev-1").kind, "lift-client-cap");
ok("exempt-account and lift-cap grants verify");

overridePolicyForDisposableTests(null);
assert.equal((await getEffectiveLockedGames()).size, 50);
ok("resetting the override restores the compiled configuration (50 locked)");

console.log(`PASS ${checks} access-policy checks`);
