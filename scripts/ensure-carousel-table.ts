import { getDb } from "../src/server/db/client";
import { sql } from "drizzle-orm";

async function ensureCarouselTable() {
  console.log("Ensuring carousel_slides table exists...");
  const db = getDb();

  const createTableStmt = `
    CREATE TABLE IF NOT EXISTS carousel_slides (
      id VARCHAR(36) PRIMARY KEY,
      badge VARCHAR(64) NOT NULL DEFAULT 'Promo',
      title VARCHAR(128) NOT NULL,
      headline VARCHAR(128) NOT NULL,
      sub VARCHAR(255) NULL,
      cta VARCHAR(64) NOT NULL DEFAULT 'Claim Now',
      link_url VARCHAR(512) NULL,
      image_url VARCHAR(512) NOT NULL,
      sort_order BIGINT NOT NULL DEFAULT 0,
      enabled ENUM('yes', 'no') NOT NULL DEFAULT 'yes',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await db.execute(sql.raw(createTableStmt));
  console.log("✅ carousel_slides table is ready!");
}

ensureCarouselTable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Table creation error:", err);
    process.exit(1);
  });
