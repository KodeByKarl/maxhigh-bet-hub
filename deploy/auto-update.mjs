/**
 * MaxHigh auto-deploy core.
 *
 * Pulls latest from origin, installs deps, builds, restarts the app process.
 * Safe to call from the watcher (poll or webhook). Concurrent runs are locked.
 *
 * Usage:
 *   node deploy/auto-update.mjs              # run once if behind remote
 *   node deploy/auto-update.mjs --force      # deploy even if already up to date
 *   node deploy/auto-update.mjs --check      # print status only
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  appendFileSync,
  openSync,
  closeSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOG_DIR = join(ROOT, "deploy", "logs");
const LOCK_PATH = join(LOG_DIR, "auto-update.lock");
const STATE_PATH = join(LOG_DIR, "last-deploy.json");

const BRANCH = process.env.DEPLOY_BRANCH || "main";
const REMOTE = process.env.DEPLOY_REMOTE || "origin";
const APP_PM2_NAME = process.env.DEPLOY_PM2_APP || "maxhigh-app";
const RUN_DB_SYNC = process.env.DEPLOY_DB_SYNC === "1";
/** Default npm install — more forgiving than ci on Windows boxes. */
const INSTALL_CMD = process.env.DEPLOY_INSTALL_CMD || "npm install";
const RUN_DB_PUSH = process.env.DEPLOY_DB_PUSH !== "0";

function ensureLogDir() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
}

function stamp() {
  return new Date().toISOString();
}

function log(line) {
  ensureLogDir();
  const msg = `[${stamp()}] ${line}`;
  console.log(msg);
  appendFileSync(join(LOG_DIR, "auto-update.log"), msg + "\n");
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    log(`$ ${cmd} ${args.join(" ")}`);
    const child = spawn(cmd, args, {
      cwd: ROOT,
      env: { ...process.env, ...opts.env },
      // Windows needs shell for npm.cmd / pm2.cmd; Unix keeps shell off.
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr, code });
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}\n${stderr || stdout}`));
    });
  });
}

function acquireLock() {
  ensureLogDir();
  try {
    const fd = openSync(LOCK_PATH, "wx");
    writeFileSync(LOCK_PATH, JSON.stringify({ pid: process.pid, at: stamp() }));
    closeSync(fd);
    return true;
  } catch {
    try {
      const raw = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
      // Stale lock > 30 minutes → steal
      if (raw?.at && Date.now() - Date.parse(raw.at) > 30 * 60 * 1000) {
        unlinkSync(LOCK_PATH);
        return acquireLock();
      }
      log(`Deploy already running (lock pid=${raw?.pid ?? "?"}) — skip`);
    } catch {
      log("Deploy lock busy — skip");
    }
    return false;
  }
}

function releaseLock() {
  try {
    unlinkSync(LOCK_PATH);
  } catch {
    /* ignore */
  }
}

async function git(args) {
  return run("git", args);
}

async function localSha() {
  const { stdout } = await git(["rev-parse", "HEAD"]);
  return stdout.trim();
}

async function remoteSha() {
  await git(["fetch", REMOTE, BRANCH]);
  const { stdout } = await git(["rev-parse", `${REMOTE}/${BRANCH}`]);
  return stdout.trim();
}

/** Commits on remote that we do not have yet. */
async function commitsBehind() {
  await git(["fetch", REMOTE, BRANCH]);
  const { stdout } = await git(["rev-list", "--count", `HEAD..${REMOTE}/${BRANCH}`]);
  return Number(stdout.trim()) || 0;
}

/** Commits we have that remote does not (unpushed / diverged). */
async function commitsAhead() {
  const { stdout } = await git(["rev-list", "--count", `${REMOTE}/${BRANCH}..HEAD`]);
  return Number(stdout.trim()) || 0;
}

function writeState(state) {
  ensureLogDir();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function restartApp() {
  // Prefer PM2 graceful reload
  try {
    await run("pm2", ["reload", APP_PM2_NAME, "--update-env"]);
    log(`PM2 reloaded ${APP_PM2_NAME}`);
    return "pm2";
  } catch (err) {
    log(`PM2 reload failed (${err instanceof Error ? err.message : err}) — trying restart`);
  }
  try {
    await run("pm2", ["restart", APP_PM2_NAME, "--update-env"]);
    log(`PM2 restarted ${APP_PM2_NAME}`);
    return "pm2-restart";
  } catch (err) {
    log(`PM2 restart failed: ${err instanceof Error ? err.message : err}`);
  }

  // Fallback signal file for custom supervisors
  const signal = join(LOG_DIR, "restart.required");
  writeFileSync(
    signal,
    JSON.stringify({ at: stamp(), reason: "auto-update", sha: await localSha().catch(() => null) }, null, 2),
  );
  log(`Wrote restart signal ${signal} (no PM2 — restart the Node process manually or via supervisor)`);
  return "signal";
}

export async function checkUpdateStatus() {
  const local = await localSha();
  const remote = await remoteSha();
  const behindCount = await commitsBehind();
  const aheadCount = await commitsAhead();
  return {
    branch: BRANCH,
    local,
    remote,
    behindCount,
    aheadCount,
    /** True only when remote has commits we need to pull. */
    behind: behindCount > 0,
  };
}

export async function runAutoUpdate(opts = {}) {
  const force = !!opts.force;
  if (!acquireLock()) {
    return { ok: false, skipped: true, reason: "locked" };
  }

  const started = Date.now();
  try {
    const before = await localSha();
    const remote = await remoteSha();
    const behindCount = await commitsBehind();
    const aheadCount = await commitsAhead();

    if (!force && behindCount === 0) {
      log(
        aheadCount > 0
          ? `Local is ahead of ${REMOTE}/${BRANCH} by ${aheadCount} commit(s) — nothing to pull (${before.slice(0, 7)})`
          : `Already up to date (${before.slice(0, 7)})`,
      );
      writeState({ at: stamp(), sha: before, status: "up-to-date", aheadCount });
      return { ok: true, skipped: true, reason: "up-to-date", sha: before };
    }

    if (aheadCount > 0 && behindCount > 0) {
      const msg = `Diverged from ${REMOTE}/${BRANCH} (ahead ${aheadCount}, behind ${behindCount}) — refusing auto-deploy. Fix on server with a clean ff-only branch.`;
      log(msg);
      writeState({ at: stamp(), status: "diverged", error: msg });
      return { ok: false, error: msg };
    }

    log(`Updating ${before.slice(0, 7)} → ${remote.slice(0, 7)} on ${REMOTE}/${BRANCH}`);

    // Fast-forward only — refuses if local commits would be overwritten
    await git(["pull", "--ff-only", REMOTE, BRANCH]);

    // Install deps
    const installParts = INSTALL_CMD.split(/\s+/).filter(Boolean);
    await run(installParts[0], installParts.slice(1));

    if (RUN_DB_PUSH) {
      try {
        // Non-interactive additive sync — never drizzle-kit push (prompts / truncate).
        log("Ensuring DB schema (db:sync)…");
        await run("npm", ["run", "db:sync"]);
      } catch (err) {
        log(`db:sync warning (non-fatal): ${err instanceof Error ? err.message : err}`);
      }
    }

    if (RUN_DB_SYNC) {
      log("DEPLOY_DB_SYNC=1 — db:sync already attempted above when DEPLOY_DB_PUSH is on");
    }
    await run("npm", ["run", "build"], { env: { NODE_ENV: "production" } });

    const after = await localSha();
    const how = await restartApp();

    const result = {
      at: stamp(),
      status: "deployed",
      from: before,
      to: after,
      ms: Date.now() - started,
      restart: how,
    };
    writeState(result);
    log(`Deploy OK in ${result.ms}ms → ${after.slice(0, 7)} (${how})`);
    return { ok: true, ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Deploy FAILED: ${message}`);
    writeState({ at: stamp(), status: "failed", error: message });
    return { ok: false, error: message };
  } finally {
    releaseLock();
  }
}

// CLI when run directly: node deploy/auto-update.mjs
const invokedDirectly =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const args = new Set(process.argv.slice(2));
  if (args.has("--check")) {
    checkUpdateStatus()
      .then((s) => {
        console.log(JSON.stringify(s, null, 2));
        process.exit(s.behind ? 2 : 0);
      })
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  } else {
    runAutoUpdate({ force: args.has("--force") })
      .then((r) => process.exit(r.ok ? 0 : 1))
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  }
}
