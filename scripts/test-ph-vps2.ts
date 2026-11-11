import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { encodeOperation, decodeOperation } from "../src/server/operation-codec.server";
import { retryTransaction } from "../src/server/transaction-retry.server";
import { startVisiblePolling } from "../src/lib/visible-poller";
import { publicReadCache } from "../src/server/public-cache.server";
import { retentionPlan } from "../deploy/retention.mjs";
import {
  artifactDigest,
  validateRelease,
  exportRelease,
  importRelease,
  switchRelease,
} from "../deploy/release-manager.mjs";
import { slotGames } from "../src/lib/games";
import { resolveLazyGame } from "../src/components/maxhigh/gamePlayRegistry";
fs.mkdirSync("audit/ph-vps-2/runtime", { recursive: true });
const runtime = fs.mkdtempSync("audit/ph-vps-2/runtime/profile-unit-");
let count = 0;
async function check(name: string, fn: () => unknown) {
  await fn();
  count++;
  console.log("PASS", name);
}
await check("versioned receipts preserve large and legacy JSON and reject corrupt streams", () => {
  const previous = process.env.OPERATION_COMPRESSION;
  const value = {
    unicode: "₱遊戲".repeat(10000),
    round: { nonce: 5, amount: 1.25 },
    rows: Array.from({ length: 100 }, (_, i) => ({ id: i, balance: 100 - i })),
  };
  process.env.OPERATION_COMPRESSION = "0";
  assert.ok(!encodeOperation(value).startsWith("gz1:"));
  process.env.OPERATION_COMPRESSION = "1";
  const encoded = encodeOperation(value);
  assert.ok(encoded.startsWith("gz1:"));
  assert.ok(encoded.length < JSON.stringify(value).length / 4);
  assert.deepEqual(decodeOperation(encoded), value);
  assert.deepEqual(decodeOperation(JSON.stringify(value)), value);
  assert.throws(() => decodeOperation("gz1:AAAA"));
  if (previous === undefined) delete process.env.OPERATION_COMPRESSION;
  else process.env.OPERATION_COMPRESSION = previous;
});
await check(
  "only confirmed transaction conflicts retry; unknown commit outcomes never retry",
  async () => {
    let attempts = 0;
    assert.equal(
      await retryTransaction(async () => {
        if (++attempts < 3) throw Object.assign(Error("conflict"), { cause: { errno: 1213 } });
        return 42;
      }),
      42,
    );
    assert.equal(attempts, 3);
    attempts = 0;
    await assert.rejects(
      retryTransaction(async () => {
        attempts++;
        throw Object.assign(Error("ambiguous transport"), { code: "ECONNRESET" });
      }),
    );
    assert.equal(attempts, 1);
    attempts = 0;
    await assert.rejects(
      retryTransaction(async () => {
        attempts++;
        throw Object.assign(Error("strict snapshot conflict"), { errno: 1020 });
      }),
    );
    assert.equal(attempts, 4);
  },
);
await check(
  "visible polling pauses, avoids overlap, resumes, and unsubscribes on unmount",
  async () => {
    const previous = globalThis.document;
    const events = new EventTarget();
    const doc = Object.assign(events, { hidden: false });
    Object.defineProperty(globalThis, "document", { value: doc, configurable: true });
    let calls = 0,
      release: () => void = () => {};
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const stop = startVisiblePolling(async () => {
      calls++;
      if (calls === 1) await new Promise<void>((r) => (release = r));
    }, 10);
    await sleep(35);
    assert.equal(calls, 1);
    doc.hidden = true;
    events.dispatchEvent(new Event("visibilitychange"));
    release();
    await sleep(35);
    assert.equal(calls, 1);
    doc.hidden = false;
    events.dispatchEvent(new Event("visibilitychange"));
    await sleep(270);
    assert.ok(calls >= 2);
    stop();
    const before = calls;
    await sleep(30);
    assert.equal(calls, before);
    Object.defineProperty(globalThis, "document", { value: previous, configurable: true });
  },
);
await check("public read cache coalesces load and recovers from failed reads", async () => {
  let calls = 0;
  const cache = publicReadCache(async () => {
    calls++;
    return 5;
  }, 10);
  await Promise.all(Array.from({ length: 20 }, () => cache()));
  assert.equal(calls, 1);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(await cache(), 5);
  assert.equal(calls, 2);
  let fail = true;
  const recovering = publicReadCache(async () => {
    if (fail) {
      fail = false;
      throw Error("offline");
    }
    return 7;
  }, 1000);
  await assert.rejects(recovering());
  assert.equal(await recovering(), 7);
});
await check("all 100 catalog titles resolve a lazy playable game", () => {
  assert.equal(slotGames.length, 100);
  for (const game of slotGames) assert.ok(resolveLazyGame(game.id), "No lazy game for " + game.id);
});
await check("PH-VPS-2 starts one ready-checked worker with bounded pool/restart settings", () => {
  const require = createRequire(import.meta.url);
  const config = require("../deploy/profiles/ph-vps-2/pm2.config.cjs");
  assert.equal(config.apps.length, 1);
  const app = config.apps[0];
  assert.equal(app.instances, 1);
  assert.equal(app.exec_mode, "fork");
  assert.equal(app.wait_ready, true);
  assert.equal(app.env.HOST, "127.0.0.1");
  assert.equal(app.env.NITRO_HOST,"127.0.0.1");
  assert.equal(app.env.NITRO_PORT,app.env.PORT);
  assert.equal(app.env.DB_POOL_LIMIT, "6");
  assert.ok(app.node_args.includes("--max-old-space-size=1024"));
  assert.ok(app.kill_timeout > Number(app.env.APP_DRAIN_TIMEOUT_MS));
  assert.ok(app.max_restarts <= 5);
});
await check(
  "retention protects active and rollback releases and refuses activation overlap",
  () => {
    const root = path.resolve(runtime, "retention");
    fs.mkdirSync(root);
    for (let i = 1; i <= 5; i++) {
      const sha = String(i).repeat(40),
        dir = path.join(root, sha);
      fs.mkdirSync(dir);
      fs.writeFileSync(
        path.join(dir, "release-validation.json"),
        JSON.stringify({
          sha,
          artifactFormat: "portable-v1",
          validatedAt: new Date(2026, 0, i).toISOString(),
        }),
      );
    }
    const active = path.join(root, "1".repeat(40)),
      previous = path.join(root, "2".repeat(40));
    fs.writeFileSync(path.join(root, "current.json"), JSON.stringify({ directory: active }));
    fs.writeFileSync(path.join(root, "previous.json"), JSON.stringify({ directory: previous }));
    const plan = retentionPlan(root);
    assert.deepEqual(plan.remove, [path.join(root, "3".repeat(40))]);
    assert.ok(plan.protected.includes(active));
    assert.ok(plan.protected.includes(previous));
    const incoming = path.join(
      root,
      ".incoming-" + "3".repeat(40) + "-00000000-0000-0000-0000-000000000000",
    );
    fs.mkdirSync(incoming);
    fs.writeFileSync(
      path.join(incoming, ".maxhigh-incoming.json"),
      JSON.stringify({ sha: "3".repeat(40), pid: 999999999, createdAt: new Date(0).toISOString() }),
    );
    assert.deepEqual(retentionPlan(root).removeTemporary, [incoming]);
    fs.writeFileSync(path.join(root, "activation.lock"), "test");
    assert.throws(() => retentionPlan(root), /lock present/);
  },
);
await check(
  "portable release rejects migration tampering, platform mismatch and unpinned import",
  () => {
    const directory = path.join(runtime, "artifact"),
      sha = "a".repeat(40);
    fs.mkdirSync(path.join(directory, ".output"), { recursive: true });
    fs.mkdirSync(path.join(directory, "drizzle"));
    fs.writeFileSync(path.join(directory, ".output", "migrate.mjs"), "// fixture migration runner");
    const sql = "SELECT 1;";
    fs.writeFileSync(path.join(directory, "drizzle", "0000_fixture.sql"), sql);
    const manifest = {
      sha,
      checks: ["typecheck", "lint", "test:unit", "build"],
      artifactFormat: "portable-v1",
      artifactDigest: artifactDigest(directory),
      migrationDigest: createHash("sha256")
        .update("0000_fixture.sql")
        .update("\0")
        .update(sql)
        .digest("hex"),
      platform: process.platform,
      arch: process.arch,
      nodeMajor: Number(process.versions.node.split(".")[0]),
    };
    const location = path.join(directory, "release-validation.json");
    fs.writeFileSync(location, JSON.stringify(manifest));
    assert.equal(validateRelease(directory).sha, sha);
    exportRelease(directory, path.join(runtime, "exported"));
    assert.throws(() => importRelease(directory, "0".repeat(64)), /hash mismatch/);
    fs.writeFileSync(path.join(directory, "drizzle", "0000_fixture.sql"), "SELECT 2;");
    assert.throws(() => validateRelease(directory), /Migration artifact/);
    fs.writeFileSync(path.join(directory, "drizzle", "0000_fixture.sql"), sql);
    fs.writeFileSync(location, JSON.stringify({ ...manifest, platform: "mismatched" }));
    assert.throws(() => validateRelease(directory), /platform/);
  },
);
await check("release quiesces the old worker before switching and before rollback", async () => {
  const pointer = path.join(runtime, "ordering.json"),
    events: string[] = [];
  fs.writeFileSync(pointer, JSON.stringify({ directory: "old" }));
  let checks = 0;
  await assert.rejects(
    switchRelease({
      pointer,
      directory: "new",
      quiesce: async () => {
        events.push("stop:" + JSON.parse(fs.readFileSync(pointer, "utf8")).directory);
      },
      reload: async () => {
        events.push("start:" + JSON.parse(fs.readFileSync(pointer, "utf8")).directory);
      },
      health: async () => {
        if (++checks === 1) throw Error("injected readiness failure");
      },
    }),
  );
  assert.deepEqual(events, ["stop:old", "start:new", "stop:new", "start:old"]);
  assert.equal(JSON.parse(fs.readFileSync(pointer, "utf8")).directory, "old");
});
await check("a failed pointer write restarts the unchanged healthy release",async()=>{
  const pointer=path.join(runtime,"blocked-pointer.json");
  fs.writeFileSync(pointer,JSON.stringify({directory:"healthy"}));fs.mkdirSync(pointer+".tmp");
  let restarted=0;
  await assert.rejects(switchRelease({pointer,directory:"candidate",quiesce:async()=>{},reload:async()=>{assert.equal(JSON.parse(fs.readFileSync(pointer,"utf8")).directory,"healthy");restarted++;},health:async()=>{}}));
  assert.equal(restarted,1);
  assert.equal(JSON.parse(fs.readFileSync(pointer,"utf8")).directory,"healthy");
});
console.log(`PASS ${count} PH-VPS-2 regression groups`);
