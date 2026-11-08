import "dotenv/config";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import mysql from "mysql2/promise";

export async function migrate(connection, { apply = false, directory = "drizzle" } = {}) {
  await connection.query("SET time_zone = '+00:00'");
  const [[database]] = await connection.query("SELECT DATABASE() AS name");
  const db = database.name;
  const [present] = await connection.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?",
    [db, "_maxhigh_migrations"],
  );
  const completed = present.length
    ? (await connection.query("SELECT version, checksum FROM _maxhigh_migrations"))[0]
    : [];
  const files = fs
    .readdirSync(directory)
    .filter((x) => /^\d{4}_.*\.sql$/.test(x))
    .sort();
  const pending = [];
  for (const file of files) {
    const sql = fs.readFileSync(`${directory}/${file}`, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const prior = completed.find((x) => x.version === file);
    if (prior && prior.checksum !== checksum)
      throw new Error(`Migration checksum mismatch: ${file}`);
    if (!prior) pending.push({ file, sql, checksum });
  }
  if (!apply) return pending.map((x) => x.file);
  if (pending.length === 0) return [];
  // No automatic account repair or orphan deletion. Invalid legacy data blocks upgrade.
  const [userTable] = await connection.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?",
    [db, "users"],
  );
  if (userTable.length) {
    const [users] = await connection.query("SELECT id, upline_id, balance FROM users");
    const graph = new Map(users.map((u) => [u.id, u.upline_id]));
    for (const user of users) {
      if (Number(user.balance) < 0)
        throw new Error("Negative legacy balances require operator review");
      const seen = new Set([user.id]);
      let parent = user.upline_id;
      while (parent) {
        if (!graph.has(parent)) throw new Error("Orphaned legacy uplines require operator review");
        if (seen.has(parent)) throw new Error("Cyclic legacy uplines require operator review");
        seen.add(parent);
        parent = graph.get(parent);
      }
    }
  }
  const [sessionColumns] = await connection.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='play_sessions'",
    [db],
  );
  const sessionNames = new Set(sessionColumns.map((row) => row.COLUMN_NAME));
  if (sessionNames.has("free_spins_left") && !sessionNames.has("base_credited")) {
    const [[legacy]] = await connection.query(
      "SELECT COUNT(*) AS n FROM play_sessions WHERE status='open' AND (free_spins_left>0" +
        (sessionNames.has("feature_state") ? " OR feature_state IS NOT NULL" : "") +
        ")",
    );
    if (Number(legacy.n) > 0)
      throw Error(
        "Open legacy features require reviewed base-credit reconciliation before upgrade; no feature or balance was changed",
      );
  }
  await connection.query(
    "CREATE TABLE IF NOT EXISTS _maxhigh_migrations (version varchar(255) PRIMARY KEY, checksum varchar(64) NOT NULL, applied_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  const exists = async (kind, table, name) => {
    const sql =
      kind === "column"
        ? "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?"
        : kind === "index"
          ? "SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?"
          : "SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND TABLE_NAME=? AND CONSTRAINT_NAME=?";
    return (await connection.query(sql, [db, table, name]))[0].length > 0;
  };
  for (const migration of pending) {
    for (let statement of migration.sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean)) {
      let m;
      if (
        (m = statement.match(/^ALTER TABLE `([^`]+)` ADD (?:COLUMN )?`([^`]+)`/i)) &&
        (await exists("column", m[1], m[2]))
      )
        continue;
      if (
        (m = statement.match(/^CREATE (?:UNIQUE )?INDEX `([^`]+)` ON `([^`]+)`/i)) &&
        (await exists("index", m[2], m[1]))
      )
        continue;
      if (
        (m = statement.match(/^ALTER TABLE `([^`]+)` ADD CONSTRAINT `([^`]+)`/i)) &&
        (await exists("constraint", m[1], m[2]))
      )
        continue;
      if (
        (m = statement.match(/^ALTER TABLE `([^`]+)` DROP FOREIGN KEY `([^`]+)`/i)) &&
        !(await exists("constraint", m[1], m[2]))
      )
        continue;
      statement = statement.replace(/^CREATE TABLE `/, "CREATE TABLE IF NOT EXISTS `");
      await connection.query(statement);
    }
    await connection.query("INSERT INTO _maxhigh_migrations (version,checksum) VALUES (?,?)", [
      migration.file,
      migration.checksum,
    ]);
  }
  return pending.map((x) => x.file);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const apply = process.argv.includes("--apply");
  const url =
    process.env.DATABASE_URL ??
    `mysql://${encodeURIComponent(process.env.MYSQL_USER ?? "")}:${encodeURIComponent(process.env.MYSQL_PASSWORD ?? "")}@${process.env.MYSQL_HOST ?? "127.0.0.1"}:${process.env.MYSQL_PORT ?? 3306}/${process.env.MYSQL_DATABASE ?? ""}`;
  const database = new URL(url).pathname.slice(1);
  if (apply && process.env.CONFIRM_SCHEMA_MIGRATIONS !== database)
    throw new Error(
      "Applying migrations requires CONFIRM_SCHEMA_MIGRATIONS equal to the target database name",
    );
  const connection = await mysql.createConnection(url);
  try {
    const pending = await migrate(connection, { apply });
    console.log(JSON.stringify({ apply, pending }));
    if (!apply && pending.length) process.exitCode = 2;
  } finally {
    await connection.end();
  }
}
