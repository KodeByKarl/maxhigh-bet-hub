import "dotenv/config";
import mysql from "mysql2/promise";

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

await conn.query(`
  ALTER TABLE play_sessions
  ADD COLUMN IF NOT EXISTS feature_state LONGTEXT NULL
`);

console.log("OK: play_sessions.feature_state");
await conn.end();
