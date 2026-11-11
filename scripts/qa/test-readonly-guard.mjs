// Proves the read-only guard before any browser QA is trusted. Ground truth is a local HTTP server that logs every request that actually
// reaches it; the same attack battery runs once WITHOUT the guard (control: must leak, otherwise the test could not detect a failure)
// and once WITH it (must reach the server with nothing but the explicitly allowed reads).
//   PW_MODULE_DIR=<dir with node_modules/playwright-core> PW_CHROME=<chrome.exe> node scripts/qa/test-readonly-guard.mjs
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { GUARDED_CONTEXT_OPTIONS, installReadOnlyGuard } from "./lib/readonly-guard.mjs";

const { chromium } = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"))(
  "playwright-core",
);
const hex = (c) => c.repeat(64);
const READ = hex("a"),
  BUY = hex("b"),
  FAKE_GET = hex("c"),
  UNKNOWN = hex("d");
const idToName = new Map([
  [READ, "getBalanceFn"],
  [BUY, "goldenPantherBuyFeatureFn"],
  [FAKE_GET, "getFakeThingFn"],
]);
const readNames = new Set(["getBalanceFn"]); // getFakeThingFn matches get* but is not a declared read, so it must be refused

function startServer(log) {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      log.push({ method: req.method, path: req.url.split("?")[0], body: body.slice(0, 60) });
      if (req.url === "/" || req.url.startsWith("/?")) {
        res.setHeader("content-type", "text/html");
        res.end(PAGE);
        return;
      }
      if (req.url.startsWith("/asset.js")) {
        res.setHeader("content-type", "text/javascript");
        res.end("window.__asset=1");
        return;
      }
      res.setHeader("content-type", "application/json");
      res.end("{}");
    });
  });
  server.on("upgrade", (req, sock) => {
    log.push({ method: "UPGRADE", path: req.url, body: "" });
    sock.destroy();
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

const PAGE = `<!doctype html><meta charset=utf-8><script src="/asset.js"></script><body><iframe name=f style="display:none"></iframe><script>
const J = (u, o) => fetch(u, o).catch(() => "blocked");
window.run = async (O) => {
  const base = location.origin;
  await J(base + "/_serverFn/${READ}");                                                    // allowed read
  await J(base + "/_serverFn/${UNKNOWN}");                                                 // unknown id
  await J(base + "/_serverFn/${BUY}");                                                     // GET to a mutating function
  await J(base + "/_serverFn/${FAKE_GET}");                                                // get* name that is not a declared read
  await J(base + "/_serverFn/${BUY}", { method: "POST", body: JSON.stringify({ data: { bet: 5, mode: "normal" } }) });                 // Wild Panther shape: no "quantity" word
  await J(base + "/_serverFn/${BUY}", { method: "POST", body: JSON.stringify({ data: { bet: 5, mode: "normal", quantity: 3 } }) });
  await J(base + "/anything", { method: "PUT", body: "x" });
  await J(base + "/anything", { method: "PATCH", body: "x" });
  await J(base + "/anything", { method: "DELETE" });
  await J(base + "/anything", { method: "POST", body: "x", keepalive: true });
  await J(base + "/_serverFn/${READ}", { headers: { "X-HTTP-Method-Override": "POST" } }); // method smuggling on an allowed URL
  navigator.sendBeacon(base + "/beacon", "x");
  await new Promise((r) => { const x = new XMLHttpRequest(); x.open("POST", base + "/xhr"); x.onloadend = r; x.send("x"); });
  await J(O + "/other-origin", { method: "POST", body: "x", mode: "no-cors" });             // cross-origin post
  try { const w = new WebSocket("ws://" + location.host + "/ws"); await new Promise((r) => { w.onclose = r; w.onerror = r; setTimeout(r, 800); }); } catch {}
  try { await navigator.serviceWorker.register("/sw.js"); } catch {}
  const f = document.createElement("form"); f.method = "POST"; f.action = base + "/form"; f.target = "f"; document.body.append(f); f.submit();   // form post navigation
  await new Promise((r) => setTimeout(r, 800));
};
</script>`;

async function battery(guarded, opts = {}) {
  const log = [],
    otherLog = [];
  const app = await startServer(log),
    other = await startServer(otherLog);
  const origin = `http://127.0.0.1:${app.address().port}`,
    otherOrigin = `http://127.0.0.1:${other.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME });
  const ctx = await browser.newContext(guarded ? GUARDED_CONTEXT_OPTIONS : {});
  const guard = guarded
    ? await installReadOnlyGuard(ctx, {
        origins: [origin],
        idToName,
        readNames,
        allowThirdPartyGet: false,
        allowWebSocketHosts: opts.allowWs ? [new URL(origin).host] : [],
      })
    : null;
  const page = await ctx.newPage();
  await page.goto(origin + "/");
  await page.evaluate((o) => window.run(o), otherOrigin);
  await page.waitForTimeout(500);
  await browser.close();
  app.close();
  other.close();
  return { log, otherLog, guard };
}

// Control: without the guard the battery must leak, or the test proves nothing.
const control = await battery(false);
const leakedMethods = new Set(control.log.map((e) => e.method));
for (const m of ["POST", "PUT", "PATCH", "DELETE"])
  assert.ok(
    leakedMethods.has(m),
    `control run must reach the server with ${m}; the battery cannot detect leaks otherwise`,
  );
assert.ok(
  control.otherLog.some((e) => e.method === "POST"),
  "control: cross-origin POST must reach the other server",
);
console.log(
  `PASS control (no guard): ${control.log.length} requests reached the server, including ${[...leakedMethods].filter((m) => !["GET", "HEAD"].includes(m)).join(", ")}`,
);

// Guarded run: only the allowed reads may arrive at either server.
const g = await battery(true);
const seen = g.log.map((e) => `${e.method} ${e.path}`);
const allowedSeen = new Set([
  "GET /",
  "GET /asset.js",
  `GET /_serverFn/${READ}`,
  "GET /favicon.ico",
]);
for (const s of seen)
  assert.ok(allowedSeen.has(s), `guarded run: unexpected request reached the server: ${s}`);
assert.ok(seen.includes(`GET /_serverFn/${READ}`), "the declared read function must still work");
assert.ok(seen.includes("GET /"), "the page itself must load");
assert.equal(
  g.log.filter((e) => e.method === "UPGRADE").length,
  0,
  "no websocket may reach the server",
);
assert.equal(g.otherLog.length, 0, "nothing may reach a third-party origin");
assert.equal(
  seen.filter((s) => s === `GET /_serverFn/${READ}`).length,
  1,
  "the method-override request on the read URL must not reach the server",
);
g.guard.assertNothingMutating();
const rep = g.guard.report();
assert.ok(
  rep.blocked >= 14,
  `guard should have refused at least 14 requests, refused ${rep.blocked}`,
);
const whys = new Set(g.guard.blocked.map((b) => b.why));
for (const expect of ["non-GET method", "unknown server function id", "method override header"])
  assert.ok(whys.has(expect), `expected a refusal for: ${expect}`);
assert.ok(
  [...whys].some((w) => /not a declared read function/.test(w)),
  "a get*-named function that is not declared GET must be refused",
);
console.log(
  `PASS guarded: server saw only [${[...new Set(seen)].join(", ")}]; guard refused ${rep.blocked} requests (${[...whys].join("; ")}); no mutating response observed`,
);
// Opt-in WebSocket allowance (used only for the local harness hot-reload socket): the socket may connect, everything else stays refused.
const w = await battery(true, { allowWs: true });
assert.ok(
  w.log.some((e) => e.method === "UPGRADE"),
  "with the opt-in, the allowed host's websocket must reach the server",
);
assert.equal(
  w.log.filter((e) => !["GET", "UPGRADE"].includes(e.method)).length,
  0,
  "with the websocket opt-in, still no mutating request may reach the server",
);
assert.equal(w.otherLog.length, 0, "the opt-in must not open any third-party origin");
w.guard.assertNothingMutating();
console.log(
  "PASS websocket opt-in: only the allowed host's socket connects; all mutating requests still refused",
);
console.log("read-only guard verified");
