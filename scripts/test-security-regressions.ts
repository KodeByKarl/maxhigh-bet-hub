import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { createHmac, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { minorUnits, signedMinorUnits } from "../src/lib/money";
import { manilaDayBounds, manilaWeekStart } from "../src/lib/business-time";
import { assertCanEditAccount } from "../src/server/auth/target-policy.server";
import { redactAuditMeta } from "../src/server/admin/audit.server";
import { secureResponse } from "../src/server/security-headers.server";
import { roundRandom } from "../src/server/round-random.server";
import { gameRandom } from "../src/lib/game-random";
import { generateOutcomeFloat } from "../src/server/provably-fair/engine.server";
import { createWebhookHandler } from "../deploy/webhook.server.mjs";
import { switchRelease } from "../deploy/release-manager.mjs";
import { resolveSpin } from "../src/components/maxhigh/golden-panther/spinResolver";

let checks = 0;
const check = (name: string, fn: () => void) => {
  fn();
  checks++;
  console.log("PASS", name);
};
check("startup cannot seed/update source and production demo seed refuses execution", () => {
  const launcher = fs.readFileSync("MaxHigh.bat", "utf8");
  assert.ok(launcher.includes("deploy\\releases\\current.json"));
  assert.doesNotMatch(launcher, /call npm|git pull|git fetch|db:seed|db:sync/i);
  assert.doesNotMatch(
    fs.readFileSync("deploy/install.sh", "utf8"),
    /npm ci|npm install|npm run build|db:seed|db:sync/,
  );
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/seed.ts"], {
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: "mysql://audit:audit@127.0.0.1:1/audit",
      ALLOW_DEMO_SEED: "disposable-test-only",
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Demo seeding requires ALLOW_DEMO_SEED=disposable-test-only outside production/,
  );
});
check("minor units reject sub-cent, unsafe and non-finite financial values", () => {
  for (const value of [0, 0.001, NaN, Infinity, -1, 1e15]) assert.throws(() => minorUnits(value));
  assert.equal(minorUnits(0.29), 29);
  assert.equal(signedMinorUnits(-0.29), -29);
});
check("credential target hierarchy rejects staff escalation", () => {
  for (const role of ["player", "agent", "master_agent", "admin"] as const)
    assert.throws(() =>
      assertCanEditAccount({ id: "actor", role }, { id: "target", role: "superadmin" }),
    );
  assert.doesNotThrow(() =>
    assertCanEditAccount({ id: "actor", role: "admin" }, { id: "target", role: "player" }),
  );
});
check("audit boundary recursively redacts credential material", () => {
  const result = redactAuditMeta({
    passwordHash: "fixture",
    nested: { token: "fixture", serverSeed: "fixture", amount: 10 },
  }) as { passwordHash: string; nested: { token: string; serverSeed: string; amount: number } };
  assert.equal(result.passwordHash, "[REDACTED]");
  assert.equal(result.nested.token, "[REDACTED]");
  assert.equal(result.nested.serverSeed, "[REDACTED]");
  assert.equal(result.nested.amount, 10);
});
check("Manila calendar is independent of host timezone and DST", () => {
  assert.equal(
    manilaDayBounds(new Date("2026-11-01T16:00:00Z")).start.toISOString(),
    "2026-11-01T16:00:00.000Z",
  );
  assert.equal(
    manilaWeekStart(new Date("2026-11-01T16:00:00Z")).toISOString(),
    "2026-11-01T16:00:00.000Z",
  );
});
check("nonce CSP and financial cache policy", () => {
  const response = secureResponse(new Response("fixture"), "fixture-nonce");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.ok(response.headers.get("content-security-policy")?.includes("'nonce-fixture-nonce'"));
  assert.ok(
    !response.headers.get("content-security-policy")?.split(";")[1].includes("unsafe-inline"),
  );
  assert.equal(response.headers.get("x-frame-options"), "DENY");
});
check("round stream matches the public HMAC verifier and replays game math", () => {
  const seed = { serverSeed: "fixture-server", clientSeed: "fixture-client", nonce: 1, draws: 0 };
  const floats = roundRandom.run({ ...seed }, () =>
    Array.from({ length: 100 }, () => gameRandom()),
  );
  floats.forEach((value, i) => {
    assert.ok(value >= 0 && value < 1);
    assert.equal(value, generateOutcomeFloat({ ...seed, subroll: i }));
  });
  const opts = { bet: 5, ante: false, isFreeSpins: false };
  const first = roundRandom.run({ ...seed }, () => resolveSpin(opts));
  const second = roundRandom.run({ ...seed }, () => resolveSpin(opts));
  assert.equal(first.totalWin, second.totalWin);
  assert.equal(first.rawWin, second.rawWin);
  assert.equal(first.freeSpinsAwarded, second.freeSpinsAwarded);
  assert.deepEqual(
    first.initialBoard.map((c) => c.sym.id),
    second.initialBoard.map((c) => c.sym.id),
  );
});
fs.mkdirSync("audit/remediation/runtime", { recursive: true });
const runtime = fs.mkdtempSync("audit/remediation/runtime/security-");
const secret = "fixture-secret-with-at-least-thirty-two-characters";
assert.throws(() => createWebhookHandler({ secret: "", onTrigger: async () => {} }));
checks++;
let triggers = 0;
const options = {
  secret,
  onTrigger: async () => {
    triggers++;
  },
  deliveryFile: path.join(runtime, "deliveries.json"),
};
let handler = createWebhookHandler(options);
async function request(url: string, headers: Record<string, string> = {}, body = "") {
  const req = Object.assign(Readable.from([Buffer.from(body)]), { method: "POST", url, headers });
  let status = 0;
  const res = {
    writeHead(code: number) {
      status = code;
    },
    end() {},
  };
  await handler(req, res);
  return status;
}
assert.equal(await request("/hooks/deploy"), 401);
assert.equal(await request("/hooks/github"), 401);
assert.equal(
  await request("/hooks/deploy?token=fixture", { authorization: `Bearer ${secret}` }),
  401,
);
assert.equal(
  await request("/hooks/deploy", { authorization: `Bearer ${secret}`, "content-length": "65537" }),
  413,
);
checks += 4;
const body = JSON.stringify({ ref: "refs/heads/main" });
const signature = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
const headers = {
  "x-hub-signature-256": signature,
  "x-github-event": "push",
  "x-github-delivery": randomUUID(),
};
assert.equal(await request("/hooks/github", headers, body), 202);
assert.equal(triggers, 1);
handler = createWebhookHandler(options);
assert.equal(await request("/hooks/github", headers, body), 409);
assert.equal(triggers, 1);
checks += 2;
const pointer = path.join(runtime, "current.json");
fs.writeFileSync(pointer, JSON.stringify({ directory: "previous" }));
let reloads = 0,
  healths = 0;
await assert.rejects(
  switchRelease({
    pointer,
    directory: "candidate",
    reload: async () => {
      reloads++;
    },
    health: async () => {
      if (++healths === 1) throw Error("candidate unhealthy");
    },
  }),
);
assert.equal(JSON.parse(fs.readFileSync(pointer, "utf8")).directory, "previous");
assert.equal(reloads, 2);
checks++;
await switchRelease({
  pointer,
  directory: "validated",
  reload: async () => {},
  health: async () => {},
});
assert.equal(JSON.parse(fs.readFileSync(pointer, "utf8")).directory, "validated");
checks++;
console.log(`PASS ${checks} security, deterministic math and rollback regression groups`);
