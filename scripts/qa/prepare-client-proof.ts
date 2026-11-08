import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { getDb } from "../../src/server/db/client";
import { sessions, users } from "../../src/server/db/schema";
import { REALMS_SLOT_GAMES } from "../../src/lib/realms";

const proofDir = process.env.PROOF_DIR ?? "output/client-proof-50-games-2026-10-28";

async function main() {
  const db = getDb();
  const id = randomUUID();
  const token = randomBytes(32).toString("hex");
  const stamp = Date.now();

  await db.insert(users).values({
    id,
    publicUserId: `proof_${stamp}`,
    username: `proof_${stamp}`,
    passwordHash: "disabled-client-proof-session",
    balance: "10000.00",
    role: "player",
  });
  await db.insert(sessions).values({
    id: randomUUID(),
    userId: id,
    token,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });

  fs.mkdirSync(proofDir, { recursive: true });
  fs.writeFileSync(
    path.join(proofDir, "fixture.json"),
    JSON.stringify(
      {
        id,
        token,
        viewport: { width: 412, height: 915, deviceScaleFactor: 1 },
        games: REALMS_SLOT_GAMES.map(({ id: gameId, name, thumb }) => ({
          id: gameId,
          name,
          thumb,
        })),
      },
      null,
      2,
    ),
  );

  console.log(`Prepared temporary proof session for ${REALMS_SLOT_GAMES.length} games.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
