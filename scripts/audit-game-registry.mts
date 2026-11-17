/**
 * Read-only 100-game registry audit (no database, no network, no writes).
 * Run: node --import tsx scripts/audit-game-registry.mts [--json out.json]
 * Verifies, per catalogue game: lobby visibility, locked state under the compiled policy, a registered GameView
 * loader whose module file exists, and that its thumbnail file exists under public/.
 */
import fs from "node:fs";
import path from "node:path";
import { slotGames } from "../src/lib/games.ts";
import { isLobbyVisibleGame, isThumbnailOnlyGame } from "../src/lib/playable-games.ts";
import { GAME_VIEW_LOADERS } from "../src/games/registry.ts";
import { ACCESS_POLICY } from "../src/server/policy/access-policy.config.ts";

const root = process.cwd();
const locked = new Set(ACCESS_POLICY.gameLocks.lockedGames);
const rows = slotGames.map((g) => {
  const loader = GAME_VIEW_LOADERS[g.id];
  const viewFile = ["GameView.tsx", "GameView.ts"].map((f) => path.join(root, "src/games", g.id, f)).find((p) => fs.existsSync(p));
  const thumbPath = path.join(root, "public", g.thumb.replace(/^\//, ""));
  return {
    id: g.id,
    name: g.name,
    category: g.category,
    visible: isLobbyVisibleGame(g.id),
    thumbnailOnly: isThumbnailOnlyGame(g.id),
    locked: locked.has(g.id),
    hasLoader: !!loader,
    hasViewFile: !!viewFile,
    hasThumb: fs.existsSync(thumbPath),
  };
});
const ids = rows.map((r) => r.id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
const orphanLoaders = Object.keys(GAME_VIEW_LOADERS).filter((id) => !ids.includes(id));
const problems = rows.filter((r) => !r.visible || r.thumbnailOnly || r.locked || !r.hasLoader || !r.hasViewFile || !r.hasThumb);
const byCat: Record<string, number> = {};
for (const r of rows) byCat[r.category] = (byCat[r.category] ?? 0) + 1;
const summary = {
  total: rows.length,
  uniqueIds: new Set(ids).size,
  duplicates: dup,
  byCategory: byCat,
  visible: rows.filter((r) => r.visible).length,
  locked: rows.filter((r) => r.locked).length,
  thumbnailOnly: rows.filter((r) => r.thumbnailOnly).length,
  withLoader: rows.filter((r) => r.hasLoader).length,
  withViewFile: rows.filter((r) => r.hasViewFile).length,
  withThumb: rows.filter((r) => r.hasThumb).length,
  orphanLoaders,
  problems: problems.map((p) => ({ id: p.id, ...p })),
};
console.log(JSON.stringify(summary, null, 2));
const out = process.argv.indexOf("--json");
if (out > 0) fs.writeFileSync(process.argv[out + 1]!, JSON.stringify({ summary, rows }, null, 2));
process.exitCode = problems.length || dup.length || orphanLoaders.length ? 1 : 0;
