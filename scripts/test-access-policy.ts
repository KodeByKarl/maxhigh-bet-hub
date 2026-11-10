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
  grantKeys: [{ id: "dev-1", publicKeyPem: pem }],
};
const signPayload = (p: string, key = privateKey) => sign(null, Buffer.from(p, "utf8"), key).toString("base64");
const grant = (extra: object = {}) => JSON.stringify({ v: 1, kind: "unlock-games", environment: "uat", nonce: "n".repeat(20), issuedAt: "2026-11-10T00:00:00.000Z", games: ["deep-bass"], ...extra });

// ---- shipped default is inactive
assert.equal(getAccessPolicy().gameLocks.enforcement, "off");
assert.equal(getAccessPolicy().clientAccounts.enforcement, "off");
assert.equal(getAccessPolicy().gameLocks.lockedGames.length, 0);
assert.equal(getAccessPolicy().grantKeys.length, 0);
ok("shipped policy is INACTIVE: no locks, no cap, no grant keys");

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
const roles = [{ id: "u1", username: "player" }, { id: "u2", username: "owner_superadmin" }, { id: "u3", username: "client_admin" }];
const locked = await getEffectiveLockedGames();
assert.deepEqual([...locked].sort(), ["abyssal-pearls", "deep-bass", "golden-panther", "threecardpoker"]);
for (const who of roles) {
  for (const [g, a] of [["golden-panther", "goldenPantherSpinFn"], ["golden-panther", "goldenPantherBuyFeatureFn"], ["deep-bass", "deepBassFireShotFn"], ["threecardpoker", "threeCardPokerDealFn"], ["abyssal-pearls", "realmsSpinFn"]] as const)
    await assert.rejects(assertGameAccess(g, a, who), new RegExp(GAME_LOCKED_MESSAGE.slice(0, 30)), `${who.username} ${g} ${a}`);
}
ok("every new wager / feature purchase / fishing shot on a locked game is refused for player, superadmin and client admin alike");
for (const who of roles) {
  await assertGameAccess("golden-panther", "goldenPantherFreeSpinFn", who);
  await assertGameAccess("threecardpoker", "threeCardPokerPlayFn", who);
  await assertGameAccess("abyssal-pearls", "realmsFreeSpinFn", who);
}
ok("a round already paid for can still be finished on a locked game (no stranded sessions)");
for (const who of roles) await assertGameAccess("color-game", "colorGameDealFn", who);
ok("unlocked games are untouched");
assert.equal(GAME_LOCKED_MESSAGE, "Game temporarily unavailable. Additional games will be activated after final payment confirmation.");
assert.equal(mod.REGISTRATION_LIMIT_MESSAGE, "User registration is temporarily unavailable. Additional users will be enabled after the remaining payment is completed.");
assert.equal(mod.ADMIN_LIMIT_MESSAGE, "Waiting for Last Payment Before Adding New Users.");
ok("client-facing messages match the approved wording exactly");

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
assert.equal((await getEffectiveLockedGames()).size, 0);
ok("resetting the override restores the inactive default");

console.log(`PASS ${checks} access-policy checks`);
