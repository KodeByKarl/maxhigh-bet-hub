/**
 * PM2 process file — MaxHigh app + continuous GitHub auto-updater.
 *
 * From the repo root (with .env present):
 *   npm run build
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

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
        PORT: process.env.PORT || "8080",
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
        DEPLOY_BRANCH: process.env.DEPLOY_BRANCH || "main",
        DEPLOY_POLL_SECONDS: process.env.DEPLOY_POLL_SECONDS || "90",
        DEPLOY_WEBHOOK_PORT: process.env.DEPLOY_WEBHOOK_PORT || "9090",
        DEPLOY_WEBHOOK_ENABLED: process.env.DEPLOY_WEBHOOK_ENABLED || "1",
        DEPLOY_PM2_APP: "maxhigh-app",
      },
      error_file: path.join(ROOT, "deploy/logs/updater-error.log"),
      out_file: path.join(ROOT, "deploy/logs/updater-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
