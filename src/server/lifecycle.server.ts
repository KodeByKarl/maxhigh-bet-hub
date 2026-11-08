import fs from "node:fs";
import path from "node:path";
import { closeDatabasePool, poolMetrics } from "./db/client";

type RuntimeState = {
  active: number;
  accepted: number;
  rejected: number;
  draining: boolean;
  registered: boolean;
  waiters: Set<() => void>;
};
const runtime = globalThis as typeof globalThis & { __maxhighRuntime?: RuntimeState };
const state = (runtime.__maxhighRuntime ??= {
  active: 0,
  accepted: 0,
  rejected: 0,
  draining: false,
  registered: false,
  waiters: new Set(),
});
const setting = (name: string, fallback: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 60000) throw new Error(`Invalid ${name}`);
  return value;
};
const maxActive = setting("APP_MAX_ACTIVE_REQUESTS", 64);

export function admitRequest() {
  if (state.draining || state.active >= maxActive) {
    state.rejected++;
    return false;
  }
  state.active++;
  state.accepted++;
  return true;
}
export function finishRequest() {
  state.active--;
  if (state.active === 0) {
    for (const resolve of state.waiters) resolve();
    state.waiters.clear();
  }
}
export function runtimeMetrics() {
  return {
    at: new Date().toISOString(),
    pid: process.pid,
    draining: state.draining,
    activeRequests: state.active,
    accepted: state.accepted,
    rejected: state.rejected,
    memory: process.memoryUsage(),
    cpuMicroseconds: process.cpuUsage(),
    pool: poolMetrics(),
  };
}

if (!state.registered) {
  state.registered = true;
  let metricsTimer: ReturnType<typeof setInterval> | undefined;
  const metricsFile = process.env.RUNTIME_METRICS_FILE;
  if (metricsFile) {
    fs.mkdirSync(path.dirname(metricsFile), { recursive: true });
    const write = () => {
      const temp = metricsFile + ".tmp";
      fs.writeFileSync(temp, JSON.stringify(runtimeMetrics()), { mode: 0o600 });
      fs.renameSync(temp, metricsFile);
    };
    metricsTimer = setInterval(() => {
      try {
        write();
      } catch {
        console.error("Runtime metrics write failed");
      }
    }, 30000);
    metricsTimer.unref();
  }
  const stop = async () => {
    if (state.draining) return;
    state.draining = true;
    if (metricsTimer) clearInterval(metricsTimer);
    console.log(JSON.stringify({ event: "shutdown.draining", activeRequests: state.active }));
    const forced = setTimeout(
      () => {
        console.error(JSON.stringify({ event: "shutdown.timeout", activeRequests: state.active }));
        process.exit(1);
      },
      setting("APP_DRAIN_TIMEOUT_MS", 30000),
    );
    try {
      if (state.active) await new Promise<void>((resolve) => state.waiters.add(resolve));
      await closeDatabasePool();
      clearTimeout(forced);
      console.log(JSON.stringify({ event: "shutdown.drained", activeRequests: state.active }));
      // HTTP server shutdown is handled concurrently by srvx. All financial
      // handlers have completed before pool.end; uncertain clients replay keys.
      setTimeout(() => process.exit(Number(process.exitCode ?? 0)), 250).unref();
    } catch {
      clearTimeout(forced);
      process.exitCode = 1;
    }
  };
  process.on("SIGTERM", () => void stop());
  process.on("SIGINT", () => void stop());
  process.on("message", (message) => {
    if (message === "shutdown") process.emit("SIGTERM");
  });
}
