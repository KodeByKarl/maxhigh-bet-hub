import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { hash, compare } from "bcryptjs";
import { toJSONAsync, fromCrossJSON } from "seroval";
import { createDefaultSerovalPlugins } from "@tanstack/router-core/ssr/client";
import { pathToFileURL } from "node:url";

/** Only the separately initialized loopback audit database can be touched. */
export async function runIntegration() {
  const evidenceDirectory = process.env.INTEGRATION_OUTPUT ?? "audit/remediation/evidence";
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const base = "http://127.0.0.1:18766";
  const db = await mysql.createConnection({
    host: "127.0.0.1",
    port: 19307,
    user: "root",
    password: "audit-local-only",
    database: "audit_remediation_fresh",
  });
  await db.query("SET time_zone = '+00:00'");
  const ids = new Map();
  for (const file of fs.readdirSync(".output/server/_ssr").filter((x) => x.endsWith(".mjs"))) {
    const text = fs.readFileSync(path.join(".output/server/_ssr", file), "utf8");
    for (const m of text.matchAll(/id:\s*"([a-f0-9]{64})",\s*name:\s*"([^"]+)"/g))
      ids.set(m[2], m[1]);
  }
  assert.ok(ids.has("loginFn"), "Build RPC manifest is required");
  const log = fs.openSync(evidenceDirectory + "/integration-server.txt", "w");
  const startServer = () =>
    spawn(process.execPath, [".output/server/index.mjs"], {
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "18766",
        DATABASE_URL: "mysql://root:audit-local-only@127.0.0.1:19307/audit_remediation_fresh",
      },
      stdio: ["ignore", log, log],
    });
  let server = startServer();
  async function ready() {
    for (let i = 0; i < 120; i++) {
      try {
        if ((await fetch(base + "/api/health")).ok) return;
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error("Isolated application did not become healthy");
  }
  class RpcRejection extends Error {}
  class TransportFailure extends Error {}
  async function denied(promise) {
    await assert.rejects(
      promise,
      (error) =>
        error instanceof RpcRejection && !/HTTPError|Failed query|SQL syntax/i.test(error.message),
    );
  }
  const results = [];
  const suffix = randomBytes(4).toString("hex");
  const password = "Audit-fixture-password-9!";
  const passwordHash = await hash(password, 4);
  async function user(name, role = "player", balance = 100, parent = null) {
    const id = randomUUID(),
      token = randomBytes(32).toString("hex"),
      username = `it_${suffix}_${name}`;
    await db.query(
      "INSERT INTO users(id,public_user_id,username,password_hash,balance,role,upline_id) VALUES (?,?,?,?,?,?,?)",
      [id, username, username, passwordHash, balance, role, parent],
    );
    await db.query(
      "INSERT INTO sessions(id,user_id,token,expires_at,last_seen_at,created_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 12 HOUR),UTC_TIMESTAMP(),UTC_TIMESTAMP())",
      [randomUUID(), id, token],
    );
    return { id, token, username, role };
  }
  async function rpc(name, data, actor, key = randomUUID(), method = "POST") {
    assert.ok(ids.has(name), `Missing built RPC ${name}`);
    const headers = {
      "content-type": "application/json",
      accept: "application/json",
      "x-tsr-serverFn": "true",
      Origin: base,
      "Sec-Fetch-Site": "same-origin",
      "Idempotency-Key": key,
    };
    if (actor) headers.Cookie = `mh_session=${actor.token}`;
    const payload = JSON.stringify(await toJSONAsync({ data }));
    const url =
      base +
      "/_serverFn/" +
      ids.get(name) +
      (method === "GET" ? "?payload=" + encodeURIComponent(payload) : "");
    const response = await fetch(url, {
      method,
      headers,
      body: method === "POST" ? payload : undefined,
    });
    const text = await response.text();
    let decoded;
    try {
      decoded = fromCrossJSON(JSON.parse(text), { plugins: createDefaultSerovalPlugins() });
    } catch (error) {
      throw new TransportFailure(
        `RPC ${name} invalid response (${response.status}): ${text.slice(0, 350)}`,
      );
    }
    if (decoded?.error) throw new RpcRejection(decoded.error.message ?? String(decoded.error));
    if (!response.ok) throw Error(`RPC ${name} status ${response.status}`);
    return decoded?.result;
  }
  const balance = async (actor) =>
    Number((await db.query("SELECT balance FROM users WHERE id=?", [actor.id]))[0][0].balance);
  async function test(name, fn) {
    const start = Date.now();
    try {
      await fn();
      results.push({ name, status: "PASSED", ms: Date.now() - start });
    } catch (error) {
      results.push({ name, status: "FAILED", error: error.message, ms: Date.now() - start });
    }
    console.log(JSON.stringify(results.at(-1)));
    fs.writeFileSync(evidenceDirectory + "/integration.json", JSON.stringify(results, null, 2));
  }
  try {
    await ready();
    await db.query(
      "INSERT INTO platform_settings(id,maintenance_mode,min_deposit,max_deposit,min_withdraw,max_withdraw) VALUES ('default','no',1,1000000,1,1000000) ON DUPLICATE KEY UPDATE maintenance_mode='no',min_withdraw=1,min_deposit=1",
    );
    await db.query(
      "INSERT INTO risk_controls(id,max_single_bet,max_daily_payout,max_weekly_limit,auto_flag_large_wins,large_win_threshold) VALUES ('default',10000,1000000,1000000,'yes',100) ON DUPLICATE KEY UPDATE max_single_bet=10000,max_daily_payout=1000000,max_weekly_limit=1000000,large_win_threshold=100",
    );
    await db.query(
      "INSERT INTO game_controls(game_id,enabled) VALUES ('golden-panther','yes') ON DUPLICATE KEY UPDATE enabled='yes',engine_config=NULL",
    );
    const admin = await user("admin", "admin"),
      superadmin = await user("super", "superadmin"),
      super2 = await user("super2", "superadmin");
    const master = await user("master", "master_agent"),
      agent = await user("agent", "agent", 100, master.id),
      agent2 = await user("agent2", "agent");
    const player = await user("player", "player", 100, agent.id),
      outsider = await user("outsider", "player", 100, agent2.id),
      superTarget = await user("target", "superadmin");
    const actors = [null, player, agent, master, admin, superadmin];
    await test("AUD-001 actual server-function role/target matrix", async () => {
      for (const actor of actors) {
        if (actor?.role === "superadmin") continue;
        await denied(
          rpc(
            "adminUpdateUserFn",
            { userId: superTarget.id, password: "fixture-reset-password" },
            actor,
          ),
        );
      }
      assert.equal(
        (await db.query("SELECT password_hash FROM users WHERE id=?", [superTarget.id]))[0][0]
          .password_hash,
        passwordHash,
      );
      await rpc(
        "adminUpdateUserFn",
        { userId: superTarget.id, password: "fixture-reset-password" },
        superadmin,
      );
      assert.equal(await rpc("getSessionFn", undefined, superTarget, randomUUID(), "GET"), null);
      assert.equal(
        await compare(
          "fixture-reset-password",
          (await db.query("SELECT password_hash FROM users WHERE id=?", [superTarget.id]))[0][0]
            .password_hash,
        ),
        true,
      );
      await denied(rpc("adminUpdateUserFn", { userId: player.id, displayName: "denied" }, agent));
      await rpc("adminUpdateUserFn", { userId: player.id, displayName: "allowed" }, admin);
    });
    await test("AUD-030/013 anonymous/cross-user seeds, concurrent rotation and uniqueness", async () => {
      for (const actor of actors.filter((a) => a?.id !== player.id))
        for (const name of [
          "getActiveSeedPairFn",
          "updateClientSeedFn",
          "rotateProvablyFairSeedPairFn",
        ])
          await denied(rpc(name, { userId: player.id, newClientSeed: "fixture" }, actor));
      await rpc("getActiveSeedPairFn", { userId: player.id }, player);
      await Promise.all(
        Array.from({ length: 4 }, () =>
          rpc("rotateProvablyFairSeedPairFn", { userId: player.id }, player),
        ),
      );
      const [[row]] = await db.query(
        "SELECT COUNT(*) AS count FROM provably_fair_seeds WHERE user_id=? AND status='active'",
        [player.id],
      );
      assert.equal(row.count, 1);
    });
    await test("AUD-002/026 concurrent transfer conservation, durable retry and key mismatch", async () => {
      const source = await user("funding", "agent", 100),
        a = await user("fund_a", "player", 0, source.id),
        b = await user("fund_b", "player", 0, source.id);
      const intents = [
        { target: a, key: randomUUID() },
        { target: b, key: randomUUID() },
      ];
      const output = await Promise.allSettled(
        intents.map((x) =>
          rpc("adminAdjustBalanceFn", { userId: x.target.id, delta: 60 }, source, x.key),
        ),
      );
      assert.equal(output.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal((await balance(source)) + (await balance(a)) + (await balance(b)), 100);
      const i = output.findIndex((x) => x.status === "fulfilled");
      const x = intents[i];
      const before = await balance(source);
      assert.deepEqual(
        await rpc("adminAdjustBalanceFn", { userId: x.target.id, delta: 60 }, source, x.key),
        output[i].value,
      );
      assert.equal(await balance(source), before);
      await denied(rpc("adminAdjustBalanceFn", { userId: x.target.id, delta: 1 }, source, x.key));
    });
    await test("AUD-006/024 concurrent reservations and once-only withdrawal approval", async () => {
      const holder = await user("holder", "player", 100);
      const output = await Promise.allSettled([
        rpc("createWalletRequestFn", { type: "withdraw", amount: 80 }, holder),
        rpc("createWalletRequestFn", { type: "withdraw", amount: 80 }, holder),
      ]);
      assert.equal(output.filter((x) => x.status === "fulfilled").length, 1);
      const request = output.find((x) => x.status === "fulfilled").value;
      await denied(rpc("goldenPantherSpinFn", { bet: 50, ante: false }, holder));
      assert.equal(await balance(holder), 100);
      await denied(rpc("reviewWalletRequestFn", { id: request.id, decision: "approve" }, agent));
      const approvals = await Promise.allSettled([
        rpc("reviewWalletRequestFn", { id: request.id, decision: "approve" }, admin),
        rpc("reviewWalletRequestFn", { id: request.id, decision: "approve" }, superadmin),
      ]);
      assert.equal(approvals.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal(await balance(holder), 20);
      const [[tx]] = await db.query(
        "SELECT COUNT(*) AS count FROM transactions WHERE user_id=? AND type='withdraw'",
        [holder.id],
      );
      assert.equal(tx.count, 1);
    });
    await test("AUD-004 weekly cap rejects approval atomically and preserves reservation", async () => {
      const holder = await user("weekly", "player", 100);
      const request = await rpc("createWalletRequestFn", { type: "withdraw", amount: 80 }, holder);
      await db.query("UPDATE risk_controls SET max_weekly_limit=1 WHERE id='default'");
      try {
        await denied(rpc("reviewWalletRequestFn", { id: request.id, decision: "approve" }, admin));
      } finally {
        await db.query("UPDATE risk_controls SET max_weekly_limit=1000000 WHERE id='default'");
      }
      assert.equal(await balance(holder), 100);
      const [[row]] = await db.query("SELECT status FROM wallet_requests WHERE id=?", [request.id]);
      assert.equal(row.status, "pending");
    });
    await test("AUD-033 durable fishing room survives restart, enforces ownership and rolls back failure", async () => {
      await db.query(
        "INSERT INTO game_controls(game_id,enabled) VALUES ('deep-bass','yes') ON DUPLICATE KEY UPDATE enabled='yes'",
      );
      const fisher = await user("fisher", "player", 1000);
      const other = await user("fisher_other", "player", 1000);
      const spawn = await rpc("deepBassSyncSpawnsFn", undefined, fisher);
      assert.ok(spawn.fish.length > 0);
      const fish = spawn.fish[0];
      const [[before]] = await db.query(
        "SELECT state FROM fishing_rooms WHERE game_id='deep-bass'",
      );
      await denied(
        rpc(
          "deepBassFireShotFn",
          { weaponId: "mini", target: { instanceId: fish.instanceId } },
          other,
        ),
      );
      assert.equal(await balance(other), 1000);
      const [[after]] = await db.query("SELECT state FROM fishing_rooms WHERE game_id='deep-bass'");
      assert.equal(after.state, before.state);
      await new Promise((resolve) => {
        server.once("exit", resolve);
        server.kill();
      });
      server = startServer();
      await ready();
      const result = await rpc(
        "deepBassFireShotFn",
        { weaponId: "mini", target: { instanceId: fish.instanceId } },
        fisher,
      );
      assert.ok(result);
      const [[persisted]] = await db.query(
        "SELECT state FROM fishing_rooms WHERE game_id='deep-bass'",
      );
      assert.ok(persisted.state.length > 2);
    });
    await test("AUD-012 actual paid HTTP round replays from committed seed and stored receipt", async () => {
      const player = await user("replay", "player", 10000);
      await rpc("getActiveSeedPairFn", { userId: player.id }, player);
      const result = await rpc("goldenPantherSpinFn", { bet: 5, ante: false }, player);
      const receipts = await rpc("listMyRoundReceiptsFn", undefined, player, randomUUID(), "GET");
      assert.equal(receipts.length, 1);
      assert.equal(receipts[0].revealedServerSeed, null);
      const revealed = await rpc("rotateProvablyFairSeedPairFn", { userId: player.id }, player);
      const fixture = "audit/remediation/runtime/round-replay.json";
      fs.writeFileSync(
        fixture,
        JSON.stringify({
          proof: receipts[0].proof,
          result,
          serverSeed: revealed.previousServerSeed,
        }),
      );
      const output = execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/test-round-replay.ts", fixture],
        {
          encoding: "utf8",
          windowsHide: true,
          env: { ...process.env, DATABASE_URL: "mysql://audit:audit@127.0.0.1:1/audit" },
        },
      );
      fs.writeFileSync(evidenceDirectory + "/round-replay.txt", output);
      const otherReceipts = await rpc(
        "listMyRoundReceiptsFn",
        undefined,
        outsider,
        randomUUID(),
        "GET",
      );
      assert.ok(otherReceipts.every((row) => row.id !== receipts[0].id));
    });
    await test("AUD-007/008 disabled games and fractional zero-cost wagers reject without debit", async () => {
      const bettor = await user("bettor", "player", 100);
      await db.query("UPDATE game_controls SET enabled='no' WHERE game_id='golden-panther'");
      await denied(rpc("goldenPantherSpinFn", { bet: 1, ante: false }, bettor));
      await db.query("UPDATE game_controls SET enabled='yes' WHERE game_id='golden-panther'");
      await denied(rpc("goldenPantherSpinFn", { bet: 0.001, ante: false }, bettor));
      assert.equal(await balance(bettor), 100);
    });
    await test("AUD-003/008 existing paid feature survives rejected buy and exposure limits apply", async () => {
      const buyer = await user("buyer", "player", 100000);
      const featureId = randomUUID();
      await db.query(
        "INSERT INTO play_sessions(id,user_id,game_id,status,bet,free_spins_left) VALUES (?,?,'golden-panther','open',5,10)",
        [featureId, buyer.id],
      );
      await denied(
        rpc("goldenPantherBuyFeatureFn", { bet: 5, mode: "normal", quantity: 10 }, buyer),
      );
      const [[feature]] = await db.query(
        "SELECT status,free_spins_left FROM play_sessions WHERE id=?",
        [featureId],
      );
      assert.equal(feature.status, "open");
      assert.equal(Number(feature.free_spins_left), 10);
      assert.equal(await balance(buyer), 100000);
      const other = await user("buy_exposure", "player", 100000);
      await db.query("UPDATE risk_controls SET max_single_bet=1 WHERE id='default'");
      try {
        await denied(
          rpc("goldenPantherBuyFeatureFn", { bet: 5, mode: "normal", quantity: 10 }, other),
        );
        assert.equal(await balance(other), 100000);
      } finally {
        await db.query("UPDATE risk_controls SET max_single_bet=10000 WHERE id='default'");
      }
    });
    await test("Buy Bonus awards exactly 10 free spins: any other quantity is refused with no debit and no session", async () => {
      const buyer = await user("fixed10", "player", 100000);
      for (const quantity of [1, 5, 9, 11, 25, 50, 0, -10]) {
        await denied(rpc("goldenPantherBuyFeatureFn", { bet: 5, mode: "normal", quantity }, buyer));
      }
      assert.equal(await balance(buyer), 100000);
      const [[open]] = await db.query("SELECT COUNT(*) AS n FROM play_sessions WHERE user_id=? AND status='open'", [buyer.id]);
      assert.equal(Number(open.n), 0);
      const [[tx]] = await db.query("SELECT COUNT(*) AS n FROM transactions WHERE user_id=?", [buyer.id]);
      assert.equal(Number(tx.n), 0); // the test user has no ledger rows: nothing was debited
    });
    await test("AUD-004/005 maintenance and absent financial controls fail closed", async () => {
      const bettor = await user("maintenance", "player", 100);
      await db.query("UPDATE platform_settings SET maintenance_mode='yes' WHERE id='default'");
      try {
        await denied(rpc("goldenPantherSpinFn", { bet: 1, ante: false }, bettor));
      } finally {
        await db.query("UPDATE platform_settings SET maintenance_mode='no' WHERE id='default'");
      }
      // Regression: a present table with the singleton row missing must also fail closed (no debit).
      const [[savedRisk]] = await db.query("SELECT * FROM risk_controls WHERE id='default'");
      await db.query("DELETE FROM risk_controls WHERE id='default'");
      try {
        const [[before]] = await db.query("SELECT COUNT(*) AS n FROM transactions WHERE user_id=?", [bettor.id]);
        await denied(rpc("goldenPantherSpinFn", { bet: 1, ante: false }, bettor));
        assert.equal(await balance(bettor), 100);
        const [[after]] = await db.query("SELECT COUNT(*) AS n FROM transactions WHERE user_id=?", [bettor.id]);
        assert.equal(after.n, before.n);
      } finally {
        await db.query("INSERT INTO risk_controls SET ?", [savedRisk]);
      }
      await db.query("RENAME TABLE risk_controls TO audit_risk_paused");
      try {
        await denied(rpc("goldenPantherSpinFn", { bet: 1, ante: false }, bettor));
        assert.equal(await balance(bettor), 100);
      } finally {
        await db.query("RENAME TABLE audit_risk_paused TO risk_controls");
      }
    });
    await test("AUD-004/025/036 actual feature settlement honors combined cap, risk limit and rollback", async () => {
      const bettor = await user("cap", "player", 10),
        featureId = randomUUID();
      await db.query("UPDATE game_controls SET engine_config=? WHERE game_id='golden-panther'", [
        JSON.stringify({ maxWinMult: 10, maxFsSessionSpins: 1 }),
      ]);
      await db.query(
        "INSERT INTO play_sessions(id,user_id,game_id,status,bet,free_spins_left,fs_session_win,base_credited) VALUES (?,?,'golden-panther','open',5,1,1000,10)",
        [featureId, bettor.id],
      );
      await db.query("UPDATE risk_controls SET max_daily_payout=1 WHERE id='default'");
      const poolBefore = Number(
        (await db.query("SELECT amount FROM jackpot WHERE id='mega'"))[0][0]?.amount ?? 0,
      );
      await denied(rpc("goldenPantherFreeSpinFn", { sessionId: featureId }, bettor));
      assert.equal(await balance(bettor), 10);
      assert.equal(
        Number((await db.query("SELECT amount FROM jackpot WHERE id='mega'"))[0][0]?.amount ?? 0),
        poolBefore,
      );
      await db.query("UPDATE risk_controls SET max_daily_payout=1000000 WHERE id='default'");
      const result = await rpc("goldenPantherFreeSpinFn", { sessionId: featureId }, bettor);
      assert.equal(result.fsPayout.amount, 40);
      assert.equal(await balance(bettor), 50);
      await db.query("UPDATE game_controls SET engine_config=NULL WHERE game_id='golden-panther'");
    });
    await test("AUD-032 jackpot awards claim pool once across different superadmins", async () => {
      const a = await user("jackpot_a", "player", 0),
        b = await user("jackpot_b", "player", 0);
      await db.query(
        "INSERT INTO jackpot(id,amount,enabled,display_amount) VALUES('mega',500,'yes',0) ON DUPLICATE KEY UPDATE amount=500,enabled='yes'",
      );
      const output = await Promise.allSettled([
        rpc("assignJackpotToPlayerFn", { username: a.username, resetAmount: 0 }, superadmin),
        rpc("assignJackpotToPlayerFn", { username: b.username, resetAmount: 0 }, super2),
      ]);
      assert.equal(output.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal((await balance(a)) + (await balance(b)), 500);
      const [[flag]] = await db.query(
        "SELECT COUNT(*) AS n FROM audit_logs WHERE action='risk.large_win' AND target_id IN (?,?)",
        [a.id, b.id],
      );
      assert.equal(Number(flag.n), 1);
    });
    await test("AUD-011 reward ownership and concurrent durable redemption", async () => {
      const claimant = await user("reward", "player", 0);
      const id = randomUUID();
      await db.query("INSERT INTO reward_entitlements(id,user_id,title,amount) VALUES (?,?,?,10)", [
        id,
        claimant.id,
        "Fixture reward",
      ]);
      await denied(rpc("claimRewardFn", { id }, outsider));
      const output = await Promise.allSettled([
        rpc("claimRewardFn", { id }, claimant),
        rpc("claimRewardFn", { id }, claimant),
      ]);
      assert.equal(output.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal(await balance(claimant), 10);
    });
    await test("AUD-015 support scope and resolved conversation retention", async () => {
      const ticket = await rpc(
        "createPlayerTicketFn",
        { playerName: "Fixture", concern: "Private fixture concern" },
        outsider,
      );
      for (const name of [
        "getAdminTicketMessagesFn",
        "sendAdminMessageFn",
        "resolveSupportTicketFn",
      ])
        await denied(rpc(name, { ticketId: ticket.ticketId, text: "unauthorized" }, agent));
      await rpc("resolveSupportTicketFn", { ticketId: ticket.ticketId }, superadmin);
      const [[row]] = await db.query("SELECT status FROM support_tickets WHERE id=?", [
        ticket.ticketId,
      ]);
      assert.equal(row.status, "resolved");
      const [[messages]] = await db.query(
        "SELECT COUNT(*) AS count FROM support_messages WHERE ticket_id=?",
        [ticket.ticketId],
      );
      assert.ok(messages.count > 0);
    });
    await test("AUD-010 persisted carousel CRUD and permission boundary", async () => {
      const input = {
        title: "Fixture banner",
        headline: "Fixture headline",
        imageUrl: "/games/home-v20261101/golden-panther.webp",
        linkUrl: "/slots",
      };
      for (const actor of [null, player, agent, master, admin])
        await denied(rpc("createCarouselSlideFn", input, actor));
      const created = await rpc("createCarouselSlideFn", input, superadmin);
      assert.equal(
        (await db.query("SELECT title FROM carousel_slides WHERE id=?", [created.id]))[0][0].title,
        input.title,
      );
      await rpc("toggleCarouselSlideFn", { id: created.id, enabled: false }, superadmin);
      assert.equal(
        (await db.query("SELECT enabled FROM carousel_slides WHERE id=?", [created.id]))[0][0]
          .enabled,
        "no",
      );
      await rpc("deleteCarouselSlideFn", { id: created.id }, superadmin);
      assert.equal(
        (await db.query("SELECT id FROM carousel_slides WHERE id=?", [created.id]))[0].length,
        0,
      );
    });
    await test("AUD-014 login cooldown is bounded and does not revoke existing sessions", async () => {
      const fixture = await user("login", "player", 100);
      for (let i = 0; i < 3; i++) {
        await denied(
          rpc("loginFn", { username: fixture.username, password: "wrong-password" }, null),
        );
        await db.query(
          "UPDATE users SET locked_until=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE id=?",
          [fixture.id],
        );
      }
      const [[row]] = await db.query("SELECT is_locked,failed_attempts FROM users WHERE id=?", [
        fixture.id,
      ]);
      assert.equal(row.is_locked, "no");
      assert.equal(Number(row.failed_attempts), 3);
      assert.equal(
        (await rpc("getSessionFn", undefined, fixture, randomUUID(), "GET")).id,
        fixture.id,
      );
      assert.equal(
        (await rpc("loginFn", { username: fixture.username, password }, null)).id,
        fixture.id,
      );
    });
    await test("AUD-016/029 password reset revokes sessions and never exposes password hashes in audit", async () => {
      const fixture = await user("password", "player", 100);
      await rpc(
        "changePasswordFn",
        { oldPassword: password, newPassword: "Changed-fixture-password-9!" },
        fixture,
      );
      assert.equal(await rpc("getSessionFn", undefined, fixture, randomUUID(), "GET"), null);
      const [logs] = await db.query("SELECT meta FROM audit_logs WHERE target_id=?", [
        superTarget.id,
      ]);
      assert.ok(logs.every((x) => !String(x.meta).includes("$2")));
    });
    await test("AUD-017 sensitive RPC responses use no-store and CSP and cross-site requests reject", async () => {
      const response = await fetch(base);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.ok(response.headers.get("content-security-policy")?.includes("frame-ancestors"));
      const denied = await fetch(base + "/_serverFn/" + ids.get("loginFn"), {
        method: "POST",
        headers: {
          Origin: "https://untrusted.invalid",
          "Sec-Fetch-Site": "cross-site",
          "content-type": "application/json",
        },
        body: JSON.stringify(
          await toJSONAsync({ data: { username: player.username, password: "wrong" } }),
        ),
      });
      assert.equal(denied.status, 403);
    });
  } finally {
    server.kill();
    fs.closeSync(log);
    await db.end();
  }
  if (results.some((x) => x.status !== "PASSED"))
    throw Error(`${results.filter((x) => x.status !== "PASSED").length} integration groups failed`);
  return results;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await runIntegration();
