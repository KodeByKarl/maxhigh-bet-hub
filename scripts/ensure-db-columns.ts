import { getDb } from "../src/server/db/client";
import { sql } from "drizzle-orm";

async function ensureDbColumns() {
  console.log("Ensuring database columns exist...");
  const db = getDb();

  const alterStatements = [
    `ALTER TABLE users ADD COLUMN locked_at TIMESTAMP NULL;`,
    `ALTER TABLE users ADD COLUMN locked_by VARCHAR(36) NULL;`,
    `ALTER TABLE users ADD COLUMN lock_reason TEXT NULL;`,
    `ALTER TABLE users ADD COLUMN unlocked_at TIMESTAMP NULL;`,
    `ALTER TABLE users ADD COLUMN unlocked_by VARCHAR(36) NULL;`,
  ];

  for (const stmt of alterStatements) {
    try {
      await db.execute(sql.raw(stmt));
      console.log(`Executed: ${stmt}`);
    } catch (err) {
      const code = typeof err === "object" && err !== null && "code" in err ? err.code : undefined;
      const message = err instanceof Error ? err.message : String(err);
      if (code === "ER_DUP_FIELDNAME" || message.includes("Duplicate column name")) {
        console.log(`Column already exists: ${stmt.slice(0, 45)}...`);
      } else {
        console.warn(`Notice running statement "${stmt}":`, message);
      }
    }
  }

  console.log("Database column check complete!");
}

ensureDbColumns()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
