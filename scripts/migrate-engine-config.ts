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

  const [cols] = await c.query<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'game_controls' AND COLUMN_NAME = 'engine_config'`,
  );

  if (!cols.length) {
    await c.query(`ALTER TABLE game_controls ADD COLUMN engine_config LONGTEXT NULL`);
    console.log("added game_controls.engine_config");
  } else {
    console.log("game_controls.engine_config already exists");
  }

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
