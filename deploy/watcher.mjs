/**
 * MaxHigh continuous auto-update watcher.
 *
 * - Polls GitHub (git fetch) every DEPLOY_POLL_SECONDS (default 90)
 * - Optional HTTP webhook on DEPLOY_WEBHOOK_PORT (default 9090) for instant push deploys
 *
 * Keep this process running on the server (PM2 recommended). When you push to
 * origin/main, the box pulls, builds, and reloads the app without SSH.
 *
 *   node deploy/watcher.mjs
 *   pm2 start deploy/ecosystem.config.cjs
 */
import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { checkUpdateStatus, runAutoUpdate } from "./auto-update.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "..", ".env") });

const POLL_SECONDS = Math.max(30, Number(process.env.DEPLOY_POLL_SECONDS || 90));
const WEBHOOK_PORT = Number(process.env.DEPLOY_WEBHOOK_PORT || 9090);
const WEBHOOK_ENABLED = process.env.DEPLOY_WEBHOOK_ENABLED !== "0";
const WEBHOOK_SECRET = process.env.DEPLOY_WEBHOOK_SECRET || "";
const BRANCH = process.env.DEPLOY_BRANCH || "main";

let deploying = false;
let lastPoll = null;

function log(msg) {
  console.log(`[watcher ${new Date().toISOString()}] ${msg}`);
}

async function maybeDeploy(reason) {
  if (deploying) {
    log(`Skip (${reason}) — deploy already in progress`);
    return;
  }
  deploying = true;
  try {
    log(`Checking for updates (${reason})…`);
    const status = await checkUpdateStatus();
    lastPoll = { at: new Date().toISOString(), ...status };
    if (!status.behind) {
      log(`Up to date @ ${status.local.slice(0, 7)}`);
      return;
    }
    log(`Behind remote — deploying ${status.local.slice(0, 7)} → ${status.remote.slice(0, 7)}`);
    const result = await runAutoUpdate();
    log(result.ok ? `Deploy finished: ${JSON.stringify(result)}` : `Deploy failed: ${JSON.stringify(result)}`);
  } catch (err) {
    log(`Error: ${err instanceof Error ? err.message : err}`);
  } finally {
    deploying = false;
  }
}

function verifyGithubSignature(rawBody, signatureHeader) {
  if (!WEBHOOK_SECRET) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  const got = signatureHeader.slice("sha256=".length);
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(got, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function startWebhookServer() {
  if (!WEBHOOK_ENABLED) {
    log("Webhook disabled (DEPLOY_WEBHOOK_ENABLED=0)");
    return;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          service: "maxhigh-auto-update",
          branch: BRANCH,
          pollSeconds: POLL_SECONDS,
          lastPoll,
          deploying,
        }),
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/hooks/github") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks);

      if (WEBHOOK_SECRET) {
        const sig = req.headers["x-hub-signature-256"];
        if (!verifyGithubSignature(raw, typeof sig === "string" ? sig : "")) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "invalid signature" }));
          return;
        }
      } else {
        log("WARNING: DEPLOY_WEBHOOK_SECRET not set — accepting unsigned webhook");
      }

      let payload = {};
      try {
        payload = JSON.parse(raw.toString("utf8") || "{}");
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "invalid json" }));
        return;
      }

      const event = req.headers["x-github-event"];
      const ref = payload.ref; // refs/heads/main
      const wanted = `refs/heads/${BRANCH}`;

      if (event === "ping") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, pong: true }));
        return;
      }

      if (event === "push" && ref === wanted) {
        res.writeHead(202, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, accepted: true, branch: BRANCH }));
        void maybeDeploy(`webhook push ${payload.after?.slice?.(0, 7) || ""}`);
        return;
      }

      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, ignored: true, event, ref }));
      return;
    }

    // Manual trigger (protect with secret query if configured)
    if (req.method === "POST" && url.pathname === "/hooks/deploy") {
      const token = url.searchParams.get("token") || "";
      if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
        return;
      }
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, accepted: true }));
      void maybeDeploy("manual /hooks/deploy");
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not found" }));
  });

  server.listen(WEBHOOK_PORT, "0.0.0.0", () => {
    log(`Webhook listening on :${WEBHOOK_PORT}  POST /hooks/github  GET /health`);
  });
}

log(`MaxHigh auto-update watcher starting (branch=${BRANCH}, poll=${POLL_SECONDS}s)`);
startWebhookServer();

// Initial check shortly after boot, then interval
setTimeout(() => void maybeDeploy("startup"), 5_000);
setInterval(() => void maybeDeploy("poll"), POLL_SECONDS * 1000);

// Keep process alive
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
