import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";

const conn = process.env.DATABASE_URL
  ? await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: true })
  : await mysql.createConnection({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "maxhigh",
      multipleStatements: true,
    });

const sql = fs.readFileSync("scripts/migrate-platform-tables.sql", "utf8");
await conn.query(sql);

try {
  await conn.query("ALTER TABLE platform_settings ADD COLUMN master_chip_pool DECIMAL(16,2) NOT NULL DEFAULT 1000000.00 AFTER max_withdraw");
} catch {
  // Column already exists
}

try {
  await conn.query("ALTER TABLE users ADD COLUMN upline_id VARCHAR(36) NULL");
} catch {
  // Column already exists
}

for (const table of ["platform_settings", "promotions", "risk_controls"]) {
  const [rows] = await conn.query(`SHOW TABLES LIKE '${table}'`);
  console.log(Array.isArray(rows) && rows.length ? `OK: ${table}` : `MISSING: ${table}`);
}

await conn.end();
