/**
 * PM2 process file — MaxHigh app + continuous GitHub auto-updater.
 *
 * Started by MaxHigh.bat (Windows) or deploy/install.sh (Linux).
 * Updater polls origin/main and reloads maxhigh-app on new commits.
 */
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");

/** Lightweight .env loader so PORT / DEPLOY_* work under PM2. */
function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

const PORT = process.env.PORT || "8080";
const POLL = process.env.DEPLOY_POLL_SECONDS || "60";
const HOOK_PORT = process.env.DEPLOY_WEBHOOK_PORT || "9090";
const BRANCH = process.env.DEPLOY_BRANCH || "main";

module.exports = {
  apps: [
    {
      name: "maxhigh-app",
      cwd: ROOT,
      script: ".output/server/index.mjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT,
      },
      error_file: path.join(ROOT, "deploy/logs/app-error.log"),
      out_file: path.join(ROOT, "deploy/logs/app-out.log"),
      merge_logs: true,
      time: true,
    },
    {
      name: "maxhigh-updater",
      cwd: ROOT,
      script: "deploy/watcher.mjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      env: {
        NODE_ENV: "production",
        DEPLOY_BRANCH: BRANCH,
        DEPLOY_POLL_SECONDS: POLL,
        DEPLOY_WEBHOOK_PORT: HOOK_PORT,
        DEPLOY_WEBHOOK_ENABLED: process.env.DEPLOY_WEBHOOK_ENABLED || "1",
        DEPLOY_WEBHOOK_SECRET: process.env.DEPLOY_WEBHOOK_SECRET || "",
        DEPLOY_PM2_APP: "maxhigh-app",
        DEPLOY_REMOTE: process.env.DEPLOY_REMOTE || "origin",
      },
      error_file: path.join(ROOT, "deploy/logs/updater-error.log"),
      out_file: path.join(ROOT, "deploy/logs/updater-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
