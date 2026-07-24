import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";

const conn = process.env.DATABASE_URL
  ? await mysql.createConnection(process.env.DATABASE_URL)
  : await mysql.createConnection({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "maxhigh",
      multipleStatements: true,
    });

const sql = fs
  .readFileSync("scripts/migrate-play-sessions.sql", "utf8")
  .replace(/USE maxhigh;\s*/i, "");

await conn.query(sql);
const [rows] = await conn.query("SHOW TABLES LIKE 'play_sessions'");
console.log(Array.isArray(rows) && rows.length ? "OK: play_sessions exists" : "MISSING: play_sessions");
await conn.end();
