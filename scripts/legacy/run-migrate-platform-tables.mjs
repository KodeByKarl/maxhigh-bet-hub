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
  await conn.query("ALTER TABLE users ADD COLUMN upline_id VARCHAR(36) NULL");
} catch {
  // Column already exists
}

try {
  await conn.query("ALTER TABLE users ADD COLUMN public_user_id VARCHAR(64) NULL");
} catch {
  // Column already exists
}

await conn.query(`
  UPDATE users
  SET public_user_id = username
  WHERE public_user_id IS NULL OR public_user_id = ''
`);

try {
  await conn.query("ALTER TABLE users MODIFY COLUMN public_user_id VARCHAR(64) NOT NULL");
} catch (err) {
  console.warn("public_user_id NOT NULL:", err?.message ?? err);
}

try {
  await conn.query("CREATE UNIQUE INDEX users_public_user_id_uq ON users (public_user_id)");
} catch {
  // Index already exists
}

try {
  await conn.query(
    "ALTER TABLE jackpot ADD COLUMN enabled ENUM('yes','no') NOT NULL DEFAULT 'yes'",
  );
} catch {
  // Column already exists
}

try {
  await conn.query(
    "ALTER TABLE jackpot ADD COLUMN display_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00",
  );
} catch {
  // Column already exists
}

await conn.query(`
  INSERT INTO jackpot (id, amount, enabled, display_amount)
  VALUES ('mega', 0.00, 'yes', 500000000.00)
  ON DUPLICATE KEY UPDATE id = id
`);

for (const table of ["platform_settings", "promotions", "risk_controls"]) {
  const [rows] = await conn.query(`SHOW TABLES LIKE '${table}'`);
  console.log(Array.isArray(rows) && rows.length ? `OK: ${table}` : `MISSING: ${table}`);
}

const [userCols] = await conn.query("SHOW COLUMNS FROM users LIKE 'public_user_id'");
console.log(
  Array.isArray(userCols) && userCols.length ? "OK: users.public_user_id" : "MISSING: users.public_user_id",
);
const [jpCols] = await conn.query("SHOW COLUMNS FROM jackpot LIKE 'enabled'");
console.log(Array.isArray(jpCols) && jpCols.length ? "OK: jackpot.enabled" : "MISSING: jackpot.enabled");
const [dispCols] = await conn.query("SHOW COLUMNS FROM jackpot LIKE 'display_amount'");
console.log(
  Array.isArray(dispCols) && dispCols.length ? "OK: jackpot.display_amount" : "MISSING: jackpot.display_amount",
);

await conn.end();
