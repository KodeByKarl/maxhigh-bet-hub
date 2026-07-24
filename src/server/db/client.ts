import "dotenv/config";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export type Db = MySql2Database<typeof schema>;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}. Copy .env.example to .env and set MariaDB credentials.`);
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
};

function getPool() {
  if (!globalForDb.__maxhighMysqlPool) {
    globalForDb.__maxhighMysqlPool = mysql.createPool(buildUrl());
  }
  return globalForDb.__maxhighMysqlPool;
}

export function getDb(): Db {
  if (!globalForDb.__maxhighDb) {
    globalForDb.__maxhighDb = drizzle(getPool(), { schema, mode: "default" });
  }
  return globalForDb.__maxhighDb;
}
