import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "../../src/server/db/client";
import { auditLogs, liveWins, users } from "../../src/server/db/schema";

const proofDir = process.env.PROOF_DIR ?? "output/client-proof-50-games-2026-10-28";

async function main() {
  const fixturePath = path.join(proofDir, "fixture.json");
  if (!fs.existsSync(fixturePath)) {
    console.log("No temporary proof session to clean up.");
    return;
  }

  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as { id: string };
  const db = getDb();
  await db.delete(liveWins).where(eq(liveWins.userId, fixture.id));
  await db.delete(auditLogs).where(eq(auditLogs.actorId, fixture.id));
  await db.delete(users).where(eq(users.id, fixture.id));
  fs.unlinkSync(fixturePath);
  console.log("Removed temporary proof player and session.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
