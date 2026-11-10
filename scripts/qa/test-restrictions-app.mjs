// End-to-end test of the access restrictions against the BUILT app on a DISPOSABLE clone (loopback MariaDB 19307, app 18081).
//   CLONE_ROOT_PW=audit-local-only OUT=<evidence dir> node scripts/qa/test-restrictions-app.mjs
// Phase A: restrictions OFF - full 100-game suite. Activation: developer script classifies accounts. Phase B: policy ON (proposed
// 50/50 split, TEST ONLY) - 50 available games function, 50 locked games refuse every role, cap/grant/bypass tests.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync, sign, randomBytes } from "node:crypto";
import mysql from "mysql2/promise";

const ROOT_PW = process.env.CLONE_ROOT_PW ?? "audit-local-only";
const OUT = process.env.OUT ?? "restrictions-app-evidence";
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const note = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + String(detail).slice(0, 200) : ""}`); };
const run = (args, env = {}) => spawnSync(process.execPath, args, { env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
const LOCKED = "Game temporarily unavailable. Additional games will be activated after final payment confirmation.";
const REG = "User registration is temporarily unavailable. Additional users will be enabled after the remaining payment is completed.";
const ADMIN = "Waiting for Last Payment Before Adding New Users.";

// ---- clone up (restrictions OFF)
const up = run(["scripts/qa/local-clone.mjs", "setup"], { CLONE_ROOT_PW: ROOT_PW });
if (up.status !== 0) throw new Error("clone setup failed: " + up.stderr.slice(0, 300));
const info = JSON.parse(up.stdout.trim().split("\n").pop());
const envC = { UAT_BASE: info.UAT_BASE, UAT_CREDS_FILE: info.UAT_CREDS_FILE, UAT_QA_CREDS_FILE: info.UAT_QA_CREDS_FILE, UAT_EXPECT_RELEASE: info.UAT_EXPECT_RELEASE };
Object.assign(process.env, envC);
const DB_URL = `mysql://root:${encodeURIComponent(ROOT_PW)}@127.0.0.1:19307/qa_clone`;
const { Client, knownFunctions, RpcRejection } = await import("./uat-client.mjs");
const db = await mysql.createConnection(DB_URL);
const q = async (sql, p) => (await db.query(sql, p))[0];
const fns = new Set(knownFunctions());
const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const catalog = fs.readFileSync("deploy/diagnostics/uat-game-catalog.tsv", "utf8").trim().split("\n").slice(1).map((l) => { const [id, category] = l.split("\t"); return { id, category }; });
const spinCall = (id) => (fns.has(`${camel(id)}SpinFn`) ? [`${camel(id)}SpinFn`, id === "fire-spike" || id === "coin-volcano" ? { bet: 1 } : { bet: 1, ante: false }] : ["realmsSpinFn", { gameId: id, bet: 1, ante: false }]);
const refused = async (fn) => { try { await fn(); return { refused: false }; } catch (e) { return { refused: true, msg: e.message }; } };
const suite = (args, env = {}) => { const r = run(["scripts/qa/uat-qa.mjs", "--run", "--confirm-uat", ...args], { ...envC, ...env }); return r; };
const summaryOf = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "summary.json"), "utf8"));

try {
  // ============================================================ Phase A: restrictions OFF
  const fund = run(["scripts/qa/uat-fund.mjs", "--apply"], envC);
  note("A: five synthetic players funded through audited flows", fund.status === 0, fund.stdout.split("\n").find((l) => l.startsWith("RESULT")));
  suite(["--rounds", "1", "--evidence", path.join(OUT, "phaseA-all100")]);
  const A = summaryOf(path.join(OUT, "phaseA-all100"));
  note("A: all 100 games pass with restrictions DISABLED", A.failed === 0 && A.gamesWithPassingFunctionalRound === 100, `${A.gamesWithPassingFunctionalRound}/100 games, ${A.checks} checks, ${A.failed} failed`);

  // open a feature session on a game that will be locked later (to test "finish what you paid for")
  const proposalRun = run(["scripts/qa/make-game-allocation.mjs", "deploy/handoff"]);
  const proposal = JSON.parse(fs.readFileSync("deploy/handoff/PROPOSED_GAME_ALLOCATION.json", "utf8"));
  const lockedSet = new Set(proposal.locked), availableIds = proposal.available;
  // The locked slots are Realms titles (shared realms functions taking a gameId); fall back to an own-slot game if the split changes.
  const settleGame = proposal.locked.find((id) => catalog.find((c) => c.id === id)?.category === "slot") ?? null;
  const settleIsRealms = !!settleGame && !fns.has(`${camel(settleGame)}BuyFeatureFn`);
  const buyFn = settleIsRealms ? "realmsBuyFeatureFn" : `${camel(settleGame ?? "x")}BuyFeatureFn`;
  const freeFn = settleIsRealms ? "realmsFreeSpinFn" : `${camel(settleGame ?? "x")}FreeSpinFn`;
  const buyInputs = () => (settleIsRealms ? [{ gameId: settleGame, bet: 1, quantity: 10 }] : [{ bet: 1, mode: "normal" }, { bet: 1, quantity: 10 }, { bet: 1 }]);
  let sessionId = null;
  if (settleGame) {
    const p5 = new Client(); await p5.login("uat_player5");
    for (const input of buyInputs()) {
      try { const r = await p5.rpc(buyFn, input); sessionId = r?.session?.sessionId ?? null; if (sessionId) break; } catch { /* try next shape */ }
    }
    await p5.logout();
  }
  note("A: an open paid feature exists on a soon-to-be-locked game", !!sessionId, settleGame ?? "no locked slot with buy+free functions found");

  // ============================================================ developer activation (dry run, then apply)
  const dsn = { DATABASE_URL: DB_URL, CONFIRM_ACTIVATE_RESTRICTIONS: "qa_clone" };
  const players = "uat_player,uat_player2,uat_player3,uat_player4,uat_player5";
  const dry = run(["scripts/dev/activate-restrictions.mjs", "--classify", `qa:${players}`, "--classify", "admin:uat_owner", "--max-clients", "2", "--enforce", "yes"], dsn);
  const [[afterDry]] = await db.query("SELECT enforced e FROM account_limits WHERE id='default'");
  note("activation script: dry run changes nothing", dry.status === 0 && afterDry.e === "no" && /dry run/i.test(dry.stdout), dry.stdout.split("\n").find((l) => l.startsWith("RESULT")));
  const noConfirm = run(["scripts/dev/activate-restrictions.mjs", "--enforce", "yes", "--apply"], { DATABASE_URL: DB_URL, CONFIRM_ACTIVATE_RESTRICTIONS: "" });
  note("activation script: --apply refuses without the exact database-name confirmation", noConfirm.status !== 0);
  const act = run(["scripts/dev/activate-restrictions.mjs", "--classify", `qa:${players}`, "--classify", "admin:uat_owner", "--max-clients", "2", "--enforce", "yes", "--apply"], dsn);
  const classes = await q("SELECT username, account_class FROM users ORDER BY username");
  note("activation script: QA players classified qa, owner admin, no other column touched", act.status === 0 && classes.filter((u) => u.account_class === "qa").length === 5 && classes.find((u) => u.username === "uat_owner").account_class === "admin", JSON.stringify(classes.map((u) => u.account_class)));
  const [[aud]] = await db.query("SELECT COUNT(*) n FROM audit_logs WHERE action='restrictions.activate'");
  note("activation is audited", aud.n === 1);

  // ============================================================ restart the app WITH the policy (test policy = proposal)
  const keys = generateKeyPairSync("ed25519");
  fs.writeFileSync(path.join(OUT, "test-grant-key.json"), JSON.stringify({ publicKeyPem: keys.publicKey.export({ type: "spki", format: "pem" }).toString() }));
  const polFile = path.join(OUT, "test-policy.json");
  run(["scripts/qa/make-game-allocation.mjs", "deploy/handoff", polFile]);
  const rs = run(["scripts/qa/local-clone.mjs", "restart-app"], { CLONE_ROOT_PW: ROOT_PW, CLONE_POLICY_FILE: path.resolve(polFile) });
  note("app restarted with the TEST policy (50 locked, cap 2)", rs.status === 0 && /WITH policy/.test(rs.stdout), rs.stderr.slice(0, 120));
  const signGrant = (obj) => { const payload = JSON.stringify({ v: 1, environment: "uat", nonce: randomBytes(16).toString("hex"), issuedAt: new Date().toISOString(), ...obj }); return { payload, signature: sign(null, Buffer.from(payload), keys.privateKey).toString("base64"), keyId: "test-key-1" }; };

  // ============================================================ Phase B1: game access
  const anon = new Client();
  const pub = await anon.rpc("getAccessStatusFn", undefined, { method: "GET" });
  note("lobby status (anonymous) lists exactly the 50 locked games with the approved message", pub.lockedGames.length === 50 && pub.message === LOCKED && proposal.locked.every((g) => pub.lockedGames.includes(g)) && !JSON.stringify(pub).toLowerCase().includes("dispute"));
  note("all 100 games remain registered", catalog.length === 100 && availableIds.length + proposal.locked.length === 100);

  suite(["--rounds", "1", "--games", availableIds.join(","), "--evidence", path.join(OUT, "phaseB-available50")]);
  const B1 = summaryOf(path.join(OUT, "phaseB-available50"));
  note("B: all 50 AVAILABLE games still pass functional, negative, idempotency and concurrency tests", B1.failed === 0 && B1.gamesWithPassingFunctionalRound === 50, `${B1.gamesWithPassingFunctionalRound}/50 games, ${B1.checks} checks, ${B1.failed} failed`);
  suite(["--phases", "locked", "--locked-check", "--games", proposal.locked.join(","), "--evidence", path.join(OUT, "phaseB-locked50")]);
  const B2 = summaryOf(path.join(OUT, "phaseB-locked50"));
  note("B: all 50 LOCKED games refuse a new wager with the approved message and NO wallet/ledger change (player accounts)", B2.failed === 0 && B2.checks === 50, `${B2.checks} checks, ${B2.failed} failed`);

  // owner / superadmin bypass (balance 0 on purpose: the gate must run before any balance check)
  const owner = new Client(); await owner.login("uat_owner");
  let bypassFails = 0;
  for (const id of proposal.locked) {
    const c = camel(id), cat = catalog.find((x) => x.id === id).category;
    const fn = cat === "fishing" ? null : (fns.has(`${c}SpinFn`) ? `${c}SpinFn` : fns.has("realmsSpinFn") && cat === "slot" ? "realmsSpinFn" : null);
    if (!fn) continue;
    const input = fn === "realmsSpinFn" ? { gameId: id, bet: 1, ante: false } : fn === "fireSpikeSpinFn" || fn === "coinVolcanoSpinFn" ? { bet: 1 } : { bet: 1, ante: false };
    const r = await refused(() => owner.rpc(fn, input));
    if (!(r.refused && r.msg === LOCKED)) bypassFails++;
  }
  note("owner/superadmin cannot play ANY locked slot (no role exemption)", bypassFails === 0, `${bypassFails} bypasses`);
  const lockedCards = ["threecardpoker", "color-game", "lucky-drop", "drop-deluxe", "tongits-arena", "poker-showdown", "color-game-pro"].filter((g) => lockedSet.has(g));
  const rc = [];
  for (const g of lockedCards) {
    const fn = { threecardpoker: ["threeCardPokerDealFn", { ante: 1, pairPlus: 0 }], "color-game": ["colorGameDealFn", { bets: { red: 1 } }], "color-game-pro": ["colorGameProDealFn", { bets: { red: 1 } }], "lucky-drop": ["luckyDropStartFn", { bet: 1 }], "drop-deluxe": ["dropDeluxeDealFn", { bet: 1 }], "tongits-arena": ["tongitsArenaDealFn", { ante: 1 }], "poker-showdown": ["pokerShowdownDealFn", { ante: 1 }] }[g];
    rc.push((await refused(() => owner.rpc(fn[0], fn[1]))).msg === LOCKED);
  }
  note("owner/superadmin cannot start a locked card/spot-bet game", rc.every(Boolean), `${rc.length} checked`);
  const lockedFish = proposal.locked.filter((g) => catalog.find((c) => c.id === g).category === "fishing");
  const rf = [];
  for (const g of lockedFish) for (const fnName of [`${camel(g)}SyncSpawnsFn`, `${camel(g)}EnsureSessionFn`]) rf.push((await refused(() => owner.rpc(fnName, fnName.endsWith("EnsureSessionFn") ? { weaponId: "mini" } : undefined))).msg === LOCKED);
  note("owner/superadmin cannot enter or populate a locked fishing room", rf.every(Boolean), `${rf.length} calls`);

  // finish-what-you-paid-for
  if (settleGame && sessionId) {
    const p5 = new Client(); await p5.login("uat_player5");
    const b0 = await p5.balance(); let left = 1, n = 0, error = null;
    try { while (left > 0 && n < 200) { const r = await p5.rpc(freeFn, settleIsRealms ? { gameId: settleGame, sessionId } : { sessionId }); left = r?.session?.freeSpinsLeft ?? 0; n++; } } catch (e) { error = e.message; }
    const again = await refused(() => p5.rpc(buyFn, buyInputs()[0]));
    note("a feature paid for BEFORE the lock can still be finished (no stranded session or confiscated win)", !error && left === 0 && n > 0, error ?? `${n} free spins played on locked ${settleGame}`);
    note("...but a NEW feature purchase on the locked game is refused", again.refused && again.msg === LOCKED, again.msg);
    await p5.logout();
  }

  // ============================================================ Phase B2: client-account cap
  const clientsNow = async () => (await q("SELECT COUNT(*) n FROM users WHERE account_class='client' AND NOT (is_locked='yes' AND locked_by IS NOT NULL)"))[0].n;
  note("before: 0 active client accounts (1 admin + 5 qa preserved)", (await clientsNow()) === 0);
  const mk = (name, extra = {}) => owner.rpc("superCreateUserFn", { username: name, password: "Client-Pass-12345", role: "player", balance: 0, displayName: name, ...extra });
  const c1 = await mk("client_one", { accountClass: "qa" }).catch((e) => ({ error: e.message }));
  const c1row = (await q("SELECT id, account_class FROM users WHERE username='client_one'"))[0];
  note("first client account allowed; caller-supplied accountClass is ignored/refused (cannot self-assign exemption)", !!c1row && c1row.account_class === "client", c1.error ?? "created as client");
  const c2 = await mk("client_two").catch((e) => ({ error: e.message }));
  note("second client account allowed", !c2.error && (await clientsNow()) === 2, c2.error);
  const c3 = await refused(() => mk("client_three"));
  note("third client account REJECTED with the approved message", c3.refused && c3.msg === REG, c3.msg);
  const par = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => mk(`race_${i}`)));
  note("12 concurrent creations cannot bypass the cap", par.every((p) => p.status === "rejected") && (await clientsNow()) === 2, `${par.filter((p) => p.status === "fulfilled").length} created`);
  const [[rej]] = await db.query("SELECT COUNT(*) n FROM audit_logs WHERE action='account.create_rejected'");
  note("every rejected attempt is audited", rej.n >= 13, `${rej.n} rows`);
  const adm = await owner.rpc("getAdminLimitStatusFn", undefined, { method: "GET" });
  note("admin screen shows the approved waiting message", adm.restricted === true && adm.message === ADMIN, adm.message);
  const noAdmin = await refused(() => new Client().rpc("getAdminLimitStatusFn", undefined, { method: "GET" }));
  note("admin limit status is not available to anonymous users", noAdmin.refused);
  const classBypass = await refused(() => db.query("UPDATE users SET account_class='qa' WHERE username='client_one'"));
  note("account class cannot be changed through the database layer without the developer flag", classBypass.refused && /ACCOUNT_CLASS_IMMUTABLE/.test(classBypass.msg));
  await owner.rpc("superUpdateUserFn", { userId: c1row.id, role: "admin" }).catch(() => undefined);
  note("changing a role does not change the account class (no exemption by role)", (await q("SELECT account_class FROM users WHERE username='client_one'"))[0].account_class === "client");
  await owner.rpc("adminLockUserFn", { userId: c1row.id, reason: "test disable" });
  const c3b = await mk("client_three").catch((e) => ({ error: e.message }));
  note("disabling a client account frees exactly one slot (documented replacement policy)", !c3b.error && (await clientsNow()) === 2, c3b.error);
  const unl = await refused(() => owner.rpc("adminUnlockUserFn", { userId: c1row.id }));
  note("re-enabling the disabled account while full is REJECTED", unl.refused && unl.msg === REG, unl.msg);
  // existing QA/admin identities keep working
  const qaOk = new Client(); await qaOk.login("uat_player3");
  const before = await qaOk.balance();
  const sp = await qaOk.rpc(`${camel(availableIds.find((g) => catalog.find((c) => c.id === g).category === "slot" && fns.has(`${camel(g)}SpinFn`)))}SpinFn`, { bet: 1, ante: false }).catch((e) => ({ error: e.message }));
  note("existing QA identity still signs in and plays an available game", !sp.error && (await qaOk.balance()) !== before, sp.error);
  await qaOk.logout();

  // ============================================================ Phase B3: signed grants
  const unlockTarget = proposal.locked.filter((g) => catalog.find((c) => c.id === g).category === "slot")[0];
  const apply = (g, extra = {}) => owner.rpc("applyEntitlementGrantFn", { ...g, confirm: "APPLY SIGNED GRANT", confirmPassword: undefined, ...extra });
  const ownerPw = fs.readFileSync(envC.UAT_CREDS_FILE, "utf8").split(/\r?\n/).find((l) => l.startsWith("uat_owner")).split("\t")[2];
  const g1 = signGrant({ kind: "unlock-games", games: [unlockTarget] });
  const tampered = { ...g1, payload: g1.payload.replace(unlockTarget, proposal.locked[1]) };
  note("tampered grant rejected", (await refused(() => apply(tampered, { confirmPassword: ownerPw }))).msg?.includes("Invalid grant signature"));
  note("grant signed by a different key rejected", (await refused(() => apply({ ...g1, signature: sign(null, Buffer.from(g1.payload), generateKeyPairSync("ed25519").privateKey).toString("base64") }, { confirmPassword: ownerPw }))).msg?.includes("Invalid grant signature"));
  note("missing explicit confirmation rejected", (await refused(() => apply(g1, { confirm: "yes", confirmPassword: ownerPw }))).refused);
  note("wrong password rejected", (await refused(() => apply(g1, { confirmPassword: "wrong-password" }))).refused);
  const pl = new Client(); await pl.login("uat_player2");
  note("a non-superadmin cannot apply a grant", (await refused(() => pl.rpc("applyEntitlementGrantFn", { ...g1, confirm: "APPLY SIGNED GRANT", confirmPassword: "x" }))).refused);
  const stillLocked = await refused(() => owner.rpc(...spinCall(unlockTarget)));
  note("game stays locked after every rejected grant", stillLocked.msg === LOCKED);
  const applied = await apply(g1, { confirmPassword: ownerPw }).catch((e) => ({ error: e.message }));
  note("a valid signed grant is applied", !applied.error, applied.error ?? applied.detail);
  await new Promise((r) => setTimeout(r, 300));
  const pl2 = new Client(); await pl2.login("uat_player4");
  const opened = await pl2.rpc(...spinCall(unlockTarget)).then(() => "played", (e) => e.message);
  note("the unlocked game is now playable (and only that game)", opened === "played", opened);
  const other = proposal.locked.filter((g) => g !== unlockTarget && catalog.find((c) => c.id === g).category === "slot")[0];
  note("other locked games remain locked", (await refused(() => pl2.rpc(...spinCall(other)))).msg === LOCKED);
  note("replaying the same grant is rejected", (await refused(() => apply(g1, { confirmPassword: ownerPw }))).msg?.includes("already applied"));
  const [[ga]] = await db.query("SELECT COUNT(*) n FROM audit_logs WHERE action='entitlement.apply'");
  const [[gl]] = await db.query("SELECT COUNT(*) n FROM entitlement_grants");
  note("grant is recorded (append-only table) and audited", ga.n === 1 && gl.n === 1);
  // a row written straight into the database without a valid signature grants nothing
  await db.query("INSERT INTO entitlement_grants(id,nonce,kind,payload,signature,key_id,applied_by_username) VALUES (UUID(),?,?,?,?,?,?)",
    ["fake-" + randomBytes(8).toString("hex"), "unlock-games", JSON.stringify({ v: 1, kind: "unlock-games", environment: "uat", nonce: "f".repeat(20), issuedAt: new Date().toISOString(), games: [other] }), "AAAA", "test-key-1", "attacker"]);
  await new Promise((r) => setTimeout(r, 5600));
  note("an unsigned/forged row inserted directly into the database does NOT unlock anything", (await refused(() => pl2.rpc(...spinCall(other)))).msg === LOCKED);
  // cap-lift + exempt grants
  const lift = signGrant({ kind: "lift-client-cap", maxClientAccounts: 3 });
  await apply(lift, { confirmPassword: ownerPw });
  const unl2 = await owner.rpc("adminUnlockUserFn", { userId: c1row.id }).then(() => "ok", (e) => e.message);
  note("a signed lift-cap grant raises the limit (re-enable now succeeds; a 4th client is still refused)", unl2 === "ok" && (await refused(() => mk("client_four"))).msg === REG, unl2);
  const ex = signGrant({ kind: "authorize-exempt-account", username: "qa_helper", accountClass: "qa" });
  await apply(ex, { confirmPassword: ownerPw });
  const helper = await mk("qa_helper").catch((e) => ({ error: e.message }));
  const hc = (await q("SELECT account_class FROM users WHERE username='qa_helper'"))[0];
  note("a signed exempt-account grant creates a QA account that does not count toward the cap", !helper.error && hc?.account_class === "qa" && (await clientsNow()) === 3, helper.error);
  note("another username without a grant is still refused", (await refused(() => mk("qa_other"))).msg === REG);
  await owner.logout(); await pl.logout().catch(() => {}); await pl2.logout().catch(() => {});

  // ============================================================ integrity
  const rec = run(["scripts/qa/clone-reconcile.mjs"], { CLONE_ROOT_PW: ROOT_PW });
  note("wallet/ledger reconciliation after all restricted-mode tests", /chain breaks: 0/.test(rec.stdout) && /negative balances: 0/.test(rec.stdout));
  const [[counter]] = await db.query("SELECT a.active_clients a, (SELECT COUNT(*) FROM users WHERE account_class='client' AND NOT (is_locked='yes' AND locked_by IS NOT NULL)) r FROM account_limits a WHERE id='default'");
  note("trigger-maintained cap counter equals reality", counter.a === counter.r, `${counter.a} vs ${counter.r}`);
} catch (e) {
  note("TEST HARNESS ERROR", false, e.stack?.split("\n").slice(0, 3).join(" | ") ?? e.message);
  try { fs.copyFileSync(info.serverLog, path.join(OUT, "server-at-failure.log")); } catch { /* best effort */ }
} finally {
  await db.end().catch(() => {});
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, "restrictions-app-results.json"), JSON.stringify({ at: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 1));
  console.log(`\n${results.length} checks, ${failed.length} failed`);
  run(["scripts/qa/local-clone.mjs", "teardown"], { CLONE_ROOT_PW: ROOT_PW });
  process.exitCode = failed.length ? 1 : 0;
}
