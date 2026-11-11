import { currentTransaction } from "./transaction-context.server";
import "dotenv/config";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export type Db = MySql2Database<typeof schema>;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v)
    throw new Error(`Missing env ${name}. Copy .env.example to .env and set MariaDB credentials.`);
  return v;
}

function buildUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.MYSQL_HOST ?? "127.0.0.1";
  const port = process.env.MYSQL_PORT ?? "3306";
  const user = requireEnv("MYSQL_USER");
  const password = process.env.MYSQL_PASSWORD ?? "";
  const database = requireEnv("MYSQL_DATABASE");
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const globalForDb = globalThis as unknown as {
  __maxhighMysqlPool?: mysql.Pool;
  __maxhighDb?: Db;
  __maxhighDbClosing?: boolean;
};

function boundedSetting(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}

function getPool() {
  if (globalForDb.__maxhighDbClosing) throw new Error("Database is draining");
  if (!globalForDb.__maxhighMysqlPool) {
    globalForDb.__maxhighMysqlPool = mysql.createPool({
      uri: buildUrl(),
      connectionLimit: boundedSetting("DB_POOL_LIMIT", 6, 1, 10),
      queueLimit: boundedSetting("DB_POOL_QUEUE_LIMIT", 30, 1, 100),
      maxIdle: Math.min(
        boundedSetting("DB_POOL_MAX_IDLE", 3, 0, 10),
        boundedSetting("DB_POOL_LIMIT", 6, 1, 10),
      ),
      idleTimeout: boundedSetting("DB_POOL_IDLE_TIMEOUT_MS", 60000, 1000, 120000),
      waitForConnections: true,
      connectTimeout: 5000,
      enableKeepAlive: true,
      timezone: "Z",
    });
    globalForDb.__maxhighMysqlPool.pool.on("connection", (connection) => {
      // mysql2's date formatter does not set the server session timezone.
      connection.query("SET time_zone = '+00:00'", (error) => {
        if (error) connection.destroy();
      });
    });
  }
  return globalForDb.__maxhighMysqlPool;
}

export async function closeDatabasePool() {
  globalForDb.__maxhighDbClosing = true;
  const pool = globalForDb.__maxhighMysqlPool;
  globalForDb.__maxhighDb = undefined;
  globalForDb.__maxhighMysqlPool = undefined;
  if (pool) await pool.end();
}

export function poolMetrics() {
  const pool = globalForDb.__maxhighMysqlPool?.pool as unknown as
    | {
        _allConnections?: { length: number };
        _freeConnections?: { length: number };
        _connectionQueue?: { length: number };
      }
    | undefined;
  return {
    connections: pool?._allConnections?.length ?? 0,
    idle: pool?._freeConnections?.length ?? 0,
    queued: pool?._connectionQueue?.length ?? 0,
  };
}

export function getDb(): Db {
  const current = currentTransaction();
  if (current)
    return new Proxy(current, {
      get(target, key, receiver) {
        if (key === "transaction") return async (fn: (tx: Db) => unknown) => fn(current);
        const value = Reflect.get(target, key, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  if (!globalForDb.__maxhighDb) {
    globalForDb.__maxhighDb = drizzle(getPool(), { schema, mode: "default" });
  }
  return globalForDb.__maxhighDb;
}
