import "dotenv/config";
import { cleanupPlaySessions } from "../src/server/play-sessions-cleanup.server";

/** Ops: npm run db:cleanup-play-sessions [-- --dry-run] */
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await cleanupPlaySessions({ dryRun });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
