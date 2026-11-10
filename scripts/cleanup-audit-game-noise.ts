import { assertDisposableTarget } from "./lib/destructive-guard";
import "dotenv/config";
import mysql from "mysql2/promise";

/** Remove player bet/win noise that was wrongly mirrored into audit_logs. */
async function main() {
  assertDisposableTarget("cleanup-audit-game-noise");
  const c = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "maxhigh",
  });

  const [r] = await c.query(
    "DELETE FROM audit_logs WHERE action IN ('game.bet', 'game.win', 'game.adjust')",
  );
  console.log("deleted audit rows:", (r as { affectedRows?: number }).affectedRows ?? r);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
