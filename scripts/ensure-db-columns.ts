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
    } catch (err: any) {
      if (err?.code === "ER_DUP_FIELDNAME" || err?.message?.includes("Duplicate column name")) {
        console.log(`Column already exists: ${stmt.slice(0, 45)}...`);
      } else {
        console.warn(`Notice running statement "${stmt}":`, err?.message ?? err);
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
