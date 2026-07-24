import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const c = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "maxhigh",
  });
  await c.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('player','admin','superadmin') NOT NULL DEFAULT 'player'",
  );
  console.log("role enum updated");
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
