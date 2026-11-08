import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const disk = fs.statfsSync(root),
  free = disk.bavail * disk.bsize,
  total = disk.blocks * disk.bsize;
let available = os.freemem(),
  swap = null,
  vmstat = null;
if (process.platform === "linux") {
  const memory = fs.readFileSync("/proc/meminfo", "utf8");
  const value = (name) =>
    Number(memory.match(new RegExp("^" + name + ":\\s+(\\d+)", "m"))?.[1] ?? 0) * 1024;
  available = value("MemAvailable");
  swap = { total: value("SwapTotal"), free: value("SwapFree") };
  const counters = fs.readFileSync("/proc/vmstat", "utf8");
  vmstat = {
    pswpin: Number(counters.match(/^pswpin (\d+)/m)?.[1] ?? 0),
    pswpout: Number(counters.match(/^pswpout (\d+)/m)?.[1] ?? 0),
  };
}
let app = null;
try {
  app = JSON.parse(fs.readFileSync(path.join(root, "deploy/logs/runtime-metrics.json"), "utf8"));
} catch {}
const alerts = [];
if (!app) alerts.push("WARNING application telemetry unavailable");
if (free < 2 * 1024 ** 3 || free / total < 0.1) alerts.push("CRITICAL disk headroom");
else if (free < 5 * 1024 ** 3 || free / total < 0.2) alerts.push("WARNING disk headroom");
if (available < 384 * 1024 ** 2) alerts.push("CRITICAL available RAM");
else if (available < 768 * 1024 ** 2) alerts.push("WARNING available RAM");
if (app && Date.now() - Date.parse(app.at) > 90000) alerts.push("WARNING stale app telemetry");
if (app?.pool.queued > 10) alerts.push("WARNING DB pool queue");
console.log(
  JSON.stringify(
    {
      at: new Date().toISOString(),
      platform: process.platform,
      disk: { total, free },
      memory: { total: os.totalmem(), available, swap, vmstat },
      app,
      alerts,
    },
    null,
    2,
  ),
);
if (alerts.length) process.exitCode = 2;
