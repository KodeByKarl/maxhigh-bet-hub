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
const LOCKED = "Game Locked. Please settle the remaining project payment to activate this game.";
const REG = "Account Limit Reached. Please settle the remaining project payment to add more client accounts.";
const ADMIN = REG;

// ---- clone up (restrictions OFF)
// The build now ships the approved configuration COMPILED IN (restrictions on). Phase A needs the "everything open" baseline, so it
// starts the app with an explicit test policy that switches both restrictions off (accepted only for a disposable loopback database).
fs.writeFileSync(path.join(OUT, "off-policy.json"), JSON.stringify({ version: 1, environment: "uat", gameLocks: { enforcement: "off", lockedGames: [] }, clientAccounts: { enforcement: "off", maxClientAccounts: 2 }, grantKeys: [] }));
const up = run(["scripts/qa/local-clone.mjs", "setup"], { CLONE_ROOT_PW: ROOT_PW, CLONE_POLICY_FILE: path.resolve(path.join(OUT, "off-policy.json")) });
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
  const clientsNow = async () => (await q("SELECT COUNT(*) n FROM users WHERE account_class='client' AND role<>'player' AND NOT (is_locked='yes' AND locked_by IS NOT NULL)"))[0].n;
  note("before: 0 active staff client accounts (1 admin + 5 qa preserved)", (await clientsNow()) === 0);
  const mk = (name, extra = {}) => owner.rpc("superCreateUserFn", { username: name, password: "Client-Pass-12345", role: "admin", balance: 0, displayName: name, ...extra });
  const mkPlayer = (name) => owner.rpc("superCreateUserFn", { username: name, password: "Client-Pass-12345", role: "player", balance: 0, displayName: name });
  const c1 = await mk("client_one", { accountClass: "qa" }).catch((e) => ({ error: e.message }));
  const c1row = (await q("SELECT id, account_class FROM users WHERE username='client_one'"))[0];
  note("first client account allowed; caller-supplied accountClass is ignored/refused (cannot self-assign exemption)", !!c1row && c1row.account_class === "client", c1.error ?? "created as client");
  const c2 = await mk("client_two").catch((e) => ({ error: e.message }));
  note("second client account allowed", !c2.error && (await clientsNow()) === 2, c2.error);
  const c3 = await refused(() => mk("client_three"));
  note("third client account REJECTED with the approved message", c3.refused && c3.msg === REG, c3.msg);
  // Regression for a connection-pool deadlock: with the grant cache COLD (> 5 s idle) every concurrent creator used to hold one pooled
  // connection and wait for a second one. 24 callers = 4x the default pool of 6; both creation paths. A hang is reported, not endured.
  const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + " TIMED OUT after " + ms + "ms (pool deadlock?)")), ms))]);
  const burst = async (label, make) => {
    await new Promise((r) => setTimeout(r, 5800));                       // let the 5 s grant cache expire
    const t0 = Date.now();
    const out = await withTimeout(Promise.allSettled(Array.from({ length: 24 }, (_, i) => make(i))), 90000, label);
    return { out, ms: Date.now() - t0 };
  };
  const b1 = await burst("super path", (i) => mk(`race_s_${i}`)).catch((e) => ({ error: e.message }));
  note("24 concurrent creations (superadmin path, cold grant cache) neither deadlock nor bypass the cap", !b1.error && b1.out.every((p) => p.status === "rejected" && /Account Limit Reached/.test(String(p.reason?.message))) && (await clientsNow()) === 2, b1.error ?? `all rejected in ${b1.ms}ms`);
  const b2 = await burst("admin path", (i) => owner.rpc("adminCreateUserFn", { username: `race_a_${i}`, password: "Client-Pass-12345", role: "admin", balance: 0 })).catch((e) => ({ error: e.message }));
  note("24 concurrent creations (admin path, cold grant cache) neither deadlock nor bypass the cap", !b2.error && b2.out.every((p) => p.status === "rejected" && /Account Limit Reached/.test(String(p.reason?.message))) && (await clientsNow()) === 2, b2.error ?? `all rejected in ${b2.ms}ms`);
  note("the app still answers after the bursts", (await withTimeout(fetch(envC.UAT_BASE + "/api/health").then((r) => r.ok), 10000, "health").catch(() => false)) === true);
  const [[rej]] = await db.query("SELECT COUNT(*) n FROM audit_logs WHERE action='account.create_rejected'");
  note("every rejected attempt is audited (1 + 24 + 24)", rej.n >= 49, `${rej.n} rows`);
  // ordinary players are NOT limited while the staff cap is full
  const pls = await Promise.all(["pl_extra_1", "pl_extra_2", "pl_extra_3"].map((n) => mkPlayer(n).then(() => null, (e) => e.message)));
  note("ordinary PLAYER accounts can still be created while the staff cap is full (they are not counted)", pls.every((x) => x === null) && (await clientsNow()) === 2, pls.filter(Boolean).join("; "));
  const plId = (await q("SELECT id FROM users WHERE username='pl_extra_1'"))[0].id;
  const promo = await refused(() => owner.rpc("superSetUserRoleFn", { userId: plId, role: "admin" }));
  note("promoting a player to a staff role while the cap is full is REJECTED with the approved message", promo.refused && promo.msg === REG && (await q("SELECT role FROM users WHERE username='pl_extra_1'"))[0].role === "player", promo.msg);
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
  // admin catalog: locked games are shown as Locked and cannot be switched on through the admin API
  const catalogRows = await owner.rpc("listSuperGamesFn", undefined, { method: "GET" });
  const lockedRows = catalogRows.filter((r) => r.locked), openRows = catalogRows.filter((r) => !r.locked);
  note("admin catalog marks every restricted game Locked and none of the available games", lockedRows.length > 0 && lockedRows.every((r) => lockedSet.has(r.gameId)) && openRows.every((r) => !lockedSet.has(r.gameId)), `${lockedRows.length} locked / ${openRows.length} open listed`);
  const actTarget = lockedRows[0]?.gameId;
  const act1 = await refused(() => owner.rpc("superUpdateGameFn", { gameId: actTarget, enabled: true }));
  note("manual activation of a locked game through the admin API is REJECTED with the approved message", act1.refused && act1.msg === LOCKED, act1.msg);
  const [[actAud]] = await db.query("SELECT COUNT(*) n FROM audit_logs WHERE action='game.activation_rejected'");
  note("the rejected activation is audited", actAud.n >= 1);
  const bulk = await owner.rpc("bulkApplyGameOutcomesFn", { scope: "all", deadSpinPct: 40, winChancePct: 60, maxMultiplier: 5000, rtp: 96 }).catch((e) => ({ error: e.message }));
  const [[lockedCtl]] = await db.query("SELECT COUNT(*) n FROM game_controls WHERE game_id IN (?)", [[...lockedSet]]);
  note("bulk admin actions do not create or enable controls for locked games", lockedCtl.n === 0, bulk.error ?? `${lockedCtl.n} control rows for locked games`);
  const stillClosed = await refused(() => owner.rpc(...spinCall(actTarget)));
  note("a locked game still refuses play after the activation attempt", stillClosed.msg === LOCKED, stillClosed.msg);
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

  // ============================================================ Phase C: the COMPILED configuration (no test policy file at all)
  const rcApp = run(["scripts/qa/local-clone.mjs", "restart-app"], { CLONE_ROOT_PW: ROOT_PW });
  note("C: app restarted with NO test policy (compiled configuration only)", rcApp.status === 0 && /without policy/.test(rcApp.stdout), rcApp.stdout.trim().slice(0, 100));
  const compiled = JSON.parse(fs.readFileSync("deploy/handoff/PROPOSED_GAME_ALLOCATION.json", "utf8"));
  const cp = new Client(); await cp.login("uat_player2");
  const cst = await cp.rpc("getAccessStatusFn", undefined, { method: "GET" });
  note("C: compiled build reports exactly 50 locked games, equal to the approved list", cst.lockedGames.length === 50 && [...cst.lockedGames].sort().join() === [...compiled.locked].sort().join(), `${cst.lockedGames.length} locked`);
  note("C: the lobby message is the approved game notice", cst.message === LOCKED, cst.message);
  note("C: Wild Panther is playable and Color Game Pro is locked in the compiled build", !cst.lockedGames.includes("wild-panther") && cst.lockedGames.includes("color-game-pro"));
  const wp = await cp.rpc("wildPantherSpinFn", { bet: 1, ante: false }).then(() => "played", (e) => e.message);
  note("C: Wild Panther spin works", wp === "played", wp);
  const cgp = await refused(() => cp.rpc("colorGameProDealFn", { bets: { red: 1 } }));
  note("C: Color Game Pro refuses with the approved message", cgp.refused && cgp.msg === LOCKED, cgp.msg);
  await cp.logout();
  const own2 = new Client(); await own2.login("uat_owner");
  const lockedCnt = (await own2.rpc("listSuperGamesFn", undefined, { method: "GET" })).filter((r) => r.locked).length;
  note("C: admin catalog (compiled build) shows the locked games as Locked", lockedCnt > 0 && lockedCnt <= 50, `${lockedCnt} locked rows listed`);
  // ---- account policy: the staff-account cap was REMOVED; ordinary role permissions apply
  // The real UAT keeps account_limits.enforced = 'no' (the activation script is NOT run with --enforce yes). Earlier phases switched it on.
  await db.query("UPDATE account_limits SET enforced='no' WHERE id='default'");
  const rejectedBefore = (await q("SELECT COUNT(*) n FROM audit_logs WHERE action='account.create_rejected'"))[0].n;
  const PW = "Client-Pass-12345";
  const ownerPw2 = fs.readFileSync(envC.UAT_CREDS_FILE, "utf8").split(/\r?\n/).find((l) => l.startsWith("uat_owner")).split("\t")[2];
  const ownerId = (await q("SELECT id FROM users WHERE username='uat_owner'"))[0].id;
  const mkAcc = (n, role) => own2.rpc("superCreateUserFn", { username: n, password: PW, role, balance: 0, displayName: n }).then(() => "ok", (e) => e.message);
  const created = [];
  for (const n of ["c_sa_one", "c_sa_two", "c_sa_three", "c_sa_four", "c_sa_five"]) created.push(await mkAcc(n, "superadmin"));
  note("C: NO staff-account cap: five client administrator accounts are created without any limit notice", created.every((x) => x === "ok"), created.join(","));
  const adm2 = await own2.rpc("getAdminLimitStatusFn", undefined, { method: "GET" });
  note("C: the admin screens show no account-limit notice", adm2.restricted === false && adm2.message === null, JSON.stringify(adm2));
  note("C: ordinary player accounts are created freely", (await mkAcc("c_player_x", "player")) === "ok");
  note("C: no 'account.create_rejected' audit rows were written while creating the accounts", (await q("SELECT COUNT(*) n FROM audit_logs WHERE action='account.create_rejected'"))[0].n === rejectedBefore);

  // ---- owner: all 100 games, QA play on locked games with synthetic credits, no effect on clients
  const adj = await own2.rpc("superAdjustBalanceFn", { userId: ownerId, delta: 100, note: "owner QA credits", confirmPassword: ownerPw2 }).then(() => "ok", (e) => e.message);
  note("C: owner receives synthetic QA credits through the audited flow", adj === "ok", adj);
  const ost = await own2.rpc("getAccessStatusFn", undefined, { method: "GET" });
  note("C: owner lobby has no locked games (QA mode); this is display only", ost.lockedGames.length === 0 && ost.ownerQa === true, JSON.stringify(ost).slice(0, 80));
  const ownerPlays = await own2.rpc("colorGameProDealFn", { bets: { red: 1 } }).then(() => "played", (e) => e.message);
  note("C: owner can play a CLIENT-LOCKED game (Color Game Pro) with synthetic credits", ownerPlays === "played", ownerPlays);
  const ownerPlays2 = await own2.rpc(...spinCall(lockedSet.has("constellation-keep") ? "constellation-keep" : [...lockedSet][0])).then(() => "played", (e) => e.message);
  note("C: owner can play a locked slot", ownerPlays2 === "played", ownerPlays2);
  const cat100 = await own2.rpc("listSuperGamesFn", undefined, { method: "GET" });
  note("C: owner sees all 100 games in the admin catalog; the locked ones are flagged for owner QA", cat100.length === 100 && cat100.filter((r) => r.ownerQa).length === 50 && cat100.filter((r) => r.locked).length === 50, `${cat100.length} listed`);
  const lockedId = cat100.find((r) => r.locked).gameId;
  const t1 = await own2.rpc("superUpdateGameFn", { gameId: lockedId, enabled: false }).then(() => "ok", (e) => e.message);
  const t2 = await own2.rpc("superUpdateGameFn", { gameId: lockedId, enabled: true }).then(() => "ok", (e) => e.message);
  note("C: owner can configure/enable/disable a locked game", t1 === "ok" && t2 === "ok", `${t1}/${t2}`);
  const cfg = await own2.rpc("getColorGameProEngineConfigFn", undefined, { method: "GET" }).then(() => "ok", (e) => e.message);
  note("C: owner can open the configuration of a locked game", cfg === "ok", cfg);
  const bulk2 = await own2.rpc("bulkApplyGameOutcomesFn", { scope: "all", deadSpinPct: 40, winChancePct: 60, maxMultiplier: 5000, rtp: 96 }).then((r) => r, (e) => ({ error: e.message }));
  note("C: owner bulk configuration covers all 100 games", !bulk2.error && bulk2.affectedCount === 100, bulk2.error ?? `affected ${bulk2.affectedCount}`);
  note("C: owner QA access is audited", (await q("SELECT COUNT(*) n FROM audit_logs WHERE action='game.owner_qa_access'"))[0].n >= 1);
  const plClient = new Client(); await plClient.login("uat_player2");
  const sl = await plClient.rpc("getAccessStatusFn", undefined, { method: "GET" });
  const slRefused = await refused(() => plClient.rpc("colorGameProDealFn", { bets: { red: 1 } }));
  note("C: owner QA did not unlock anything for clients (still 50 locked; Color Game Pro still refused)", sl.lockedGames.length === 50 && slRefused.refused && slRefused.msg === LOCKED, slRefused.msg);
  await plClient.logout();

  // ---- a CLIENT administrator (superadmin tier, not the owner)
  const csa = new Client(); await csa.login("c_sa_one", PW);
  const csaSt = await csa.rpc("getAccessStatusFn", undefined, { method: "GET" });
  note("C: client administrator sees exactly the 50 locked games in the lobby", csaSt.lockedGames.length === 50 && csaSt.ownerQa !== true);
  const csaPlay = await refused(() => csa.rpc("colorGameProDealFn", { bets: { red: 1 } }));
  note("C: client administrator cannot play a locked game", csaPlay.refused && csaPlay.msg === LOCKED, csaPlay.msg);
  const csaEnable = await refused(() => csa.rpc("superUpdateGameFn", { gameId: lockedId, enabled: true }));
  note("C: client administrator cannot activate a locked game through the admin API", csaEnable.refused && csaEnable.msg === LOCKED, csaEnable.msg);
  const csaCat = await csa.rpc("listSuperGamesFn", undefined, { method: "GET" });
  note("C: client administrator sees the locked games as Locked (not owner QA)", csaCat.filter((r) => r.locked).length === 50 && csaCat.every((r) => !r.ownerQa));
  const csaBulk = await csa.rpc("bulkApplyGameOutcomesFn", { scope: "all", deadSpinPct: 40, winChancePct: 60, maxMultiplier: 5000, rtp: 96 }).then((r) => r, (e) => ({ error: e.message }));
  note("C: client administrator bulk configuration covers only the 50 playable games", !csaBulk.error && csaBulk.affectedCount === 50, csaBulk.error ?? `affected ${csaBulk.affectedCount}`);
  const csaCfg = await csa.rpc("superUpdateGameFn", { gameId: availableIds[0], featured: true }).then(() => "ok", (e) => e.message);
  note("C: client administrator can configure a playable game", csaCfg === "ok", csaCfg);
  const protectedTries = {
    role: () => csa.rpc("superSetUserRoleFn", { userId: ownerId, role: "player" }),
    update: () => csa.rpc("superUpdateUserFn", { userId: ownerId, displayName: "hijacked" }),
    balance: () => csa.rpc("superAdjustBalanceFn", { userId: ownerId, delta: 1, confirmPassword: PW }),
    lock: () => csa.rpc("adminLockUserFn", { userId: ownerId, reason: "x" }),
    logout: () => csa.rpc("adminForceLogoutUserFn", { userId: ownerId }),
    adminUpdate: () => csa.rpc("adminUpdateUserFn", { userId: ownerId, displayName: "hijacked" }),
    adminBalance: () => csa.rpc("adminAdjustBalanceFn", { userId: ownerId, delta: 1, confirmPassword: PW }),
  };
  const blocked = [];
  for (const [k, fn] of Object.entries(protectedTries)) { const r = await refused(fn); if (!r.refused) blocked.push(`${k}:ALLOWED`); }
  note("C: client administrator cannot modify the owner account by any path (role, profile, balance, lock, logout)", blocked.length === 0, blocked.join(","));
  const ownerRow = (await q("SELECT role, display_name, is_locked FROM users WHERE username='uat_owner'"))[0];
  note("C: the owner account is unchanged", ownerRow.role === "superadmin" && ownerRow.is_locked === "no" && ownerRow.display_name !== "hijacked");
  const grantTry = await refused(() => csa.rpc("applyEntitlementGrantFn", { payload: "{}", signature: "AAAAAAAAAAAA", keyId: "none", confirm: "APPLY SIGNED GRANT", confirmPassword: PW }));
  note("C: client administrator cannot apply an unlock grant (no signing key exists)", grantTry.refused);
  const csaMakes = await csa.rpc("superCreateUserFn", { username: "c_sa_made_by_client", password: PW, role: "admin", balance: 0, displayName: "m" }).then(() => "ok", (e) => e.message);
  const csaMakesPl = await csa.rpc("superCreateUserFn", { username: "c_pl_made_by_client", password: PW, role: "player", balance: 0, displayName: "m" }).then(() => "ok", (e) => e.message);
  note("C: client administrator can create staff and player accounts", csaMakes === "ok" && csaMakesPl === "ok", `${csaMakes}/${csaMakesPl}`);
  note("C: no hidden owner-name collision: a client cannot create an account named like the owner", (await refused(() => csa.rpc("superCreateUserFn", { username: "uat_owner", password: PW, role: "superadmin", balance: 0, displayName: "x" }))).refused);
  await csa.logout();
  // staff-tier (role admin) administrators cannot escalate
  const stf = new Client(); await stf.login("c_sa_made_by_client", PW);
  const esc = {};
  for (const [k, fn] of Object.entries({
    createSuper: () => stf.rpc("adminCreateUserFn", { username: "c_esc_1", password: PW, role: "superadmin", balance: 0 }),
    createStaff: () => stf.rpc("adminCreateUserFn", { username: "c_esc_2", password: PW, role: "admin", balance: 0 }),
    setRole: () => stf.rpc("superSetUserRoleFn", { userId: ownerId, role: "player" }),
    enableLocked: () => stf.rpc("superUpdateGameFn", { gameId: lockedId, enabled: true }),
    grant: () => stf.rpc("applyEntitlementGrantFn", { payload: "{}", signature: "AAAAAAAAAAAA", keyId: "none", confirm: "APPLY SIGNED GRANT" }),
  })) { const r = await refused(fn); if (!r.refused) esc[k] = "ALLOWED"; }
  note("C: a staff-tier administrator (role admin) cannot escalate: no superadmin/staff creation, no role change, no game activation, no grants", Object.keys(esc).length === 0, JSON.stringify(esc));
  await stf.logout();
  await own2.logout();

  // ============================================================ integrity
  const rec = run(["scripts/qa/clone-reconcile.mjs"], { CLONE_ROOT_PW: ROOT_PW });
  note("wallet/ledger reconciliation after all restricted-mode tests", /chain breaks: 0/.test(rec.stdout) && /negative balances: 0/.test(rec.stdout));
  const [[counter]] = await db.query("SELECT a.active_clients a, (SELECT COUNT(*) FROM users WHERE account_class='client' AND role<>'player' AND NOT (is_locked='yes' AND locked_by IS NOT NULL)) r FROM account_limits a WHERE id='default'");
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
