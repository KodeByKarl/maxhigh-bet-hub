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

  const [cols] = await c.query<any[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'game'`,
    [process.env.MYSQL_DATABASE || "maxhigh"],
  );

  if (!cols.length) {
    await c.query(
      `ALTER TABLE transactions ADD COLUMN game VARCHAR(64) NULL AFTER balance_after`,
    );
    console.log("Added transactions.game");
  } else {
    console.log("transactions.game already exists");
  }

  try {
    await c.query(`CREATE INDEX tx_type_idx ON transactions (type)`);
  } catch {
    /* exists */
  }
  try {
    await c.query(`CREATE INDEX tx_game_idx ON transactions (game)`);
  } catch {
    /* exists */
  }

  console.log("transaction tracking ready");
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
