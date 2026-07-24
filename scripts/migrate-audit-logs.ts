import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const c = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "maxhigh",
    multipleStatements: true,
  });

  await c.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(36) PRIMARY KEY,
      actor_id VARCHAR(36) NULL,
      actor_username VARCHAR(64) NOT NULL,
      action VARCHAR(64) NOT NULL,
      target_type VARCHAR(64) NULL,
      target_id VARCHAR(64) NULL,
      summary VARCHAR(512) NOT NULL,
      meta TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX audit_created_idx (created_at),
      INDEX audit_actor_idx (actor_id),
      INDEX audit_action_idx (action),
      CONSTRAINT audit_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  console.log("audit_logs table ready");
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
