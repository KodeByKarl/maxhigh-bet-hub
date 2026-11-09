import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { slotGames } from "../../src/lib/games";
import { isLobbyVisibleGame, isThumbnailOnlyGame } from "../../src/lib/playable-games";
import { getDb } from "../../src/server/db/client";
import { gameControls } from "../../src/server/db/schema";

async function main() {
  let controls: (typeof gameControls.$inferSelect)[] = [];
  let databaseVerified = false;
  let databaseError: string | null = null;
  try {
    controls = await getDb().select().from(gameControls);
    databaseVerified = true;
  } catch (error) {
    const failure = error as { code?: string; cause?: { code?: string; errors?: { code?: string }[] } };
    databaseError = failure.code ?? failure.cause?.code ?? failure.cause?.errors?.[0]?.code ?? "Database unavailable; active flags unverified";
  }
  const byId = new Map(controls.map(c => [c.gameId, c]));
  const rows = await Promise.all(slotGames.map(async game => {
    const control = byId.get(game.id);
    const lobbyAllowed = isLobbyVisibleGame(game.id) && !isThumbnailOnlyGame(game.id);
    const enabled = control?.enabled !== "no";
    const localPath = game.thumb?.startsWith("/") ? path.join(process.cwd(), "public", game.thumb) : null;
    let thumbnailStatus = !game.thumb ? "missing-reference" : localPath ? "missing-file" : "remote-unverified";
    let dimensions: string | null = null;
    if (localPath && fs.existsSync(localPath)) {
      try {
        const metadata = await sharp(localPath).metadata();
        await sharp(localPath).stats();
        dimensions = `${metadata.width}x${metadata.height}`;
        thumbnailStatus = "ok";
      } catch { thumbnailStatus = "invalid-image"; }
    }
    return { id: game.id, name: game.name, category: game.category, databaseEnabled: control?.enabled ?? "default-yes", lobbyAllowed, playerVisible: lobbyAllowed && enabled, hasCardDefinition: true, thumbnail: game.thumb, thumbnailStatus, dimensions };
  }));
  const catalogIds = new Set(slotGames.map(g => g.id));
  const orphanControls = controls.filter(c => !catalogIds.has(c.gameId)).map(c => ({ id: c.gameId, enabled: c.enabled, missingCardDefinition: true }));
  const visible = rows.filter(r => r.playerVisible);
  const report = { checkedAt: new Date().toISOString(), databaseVerified, databaseError, summary: { catalog: rows.length, controlRows: databaseVerified ? controls.length : null, visible: databaseVerified ? visible.length : null, fallbackVisible: visible.length, hidden: databaseVerified ? rows.length - visible.length : null, visibleMissingThumbnails: visible.filter(r => r.thumbnailStatus !== "ok").length, enabledMissingCardDefinitions: databaseVerified ? orphanControls.filter(r => r.enabled === "yes").length : null }, visibleMissingThumbnails: visible.filter(r => r.thumbnailStatus !== "ok"), orphanControls, games: rows };
  fs.mkdirSync("output/player-catalog-audit", { recursive: true });
  fs.writeFileSync("output/player-catalog-audit/report.json", JSON.stringify(report, null, 2));
  const lines = ["# Player game card and thumbnail audit", "", `Database verified: ${databaseVerified}.`, "", JSON.stringify(report.summary), "", "| Game | ID | Category | Active / Show | Thumbnail |", "| --- | --- | --- | --- | --- |", ...rows.map(r => `| ${r.name} | ${r.id} | ${r.category} | ${r.playerVisible ? "True" : "False"}${databaseVerified ? "" : " (unverified default)"} | ${r.thumbnailStatus}: ${r.thumbnail} |`), "", "## Database controls without catalog cards", "", ...orphanControls.map(r => `- ${r.id}: enabled=${r.enabled}`)];
  fs.writeFileSync("output/player-catalog-audit/report.md", lines.join("\n"));
  console.log(JSON.stringify({ databaseVerified, databaseError, summary: report.summary, visibleMissingThumbnails: report.visibleMissingThumbnails, orphanControls, visibleByCategory: Object.fromEntries(["slot", "cards", "fishing"].map(category => [category, visible.filter(r => r.category === category).length])) }, null, 2));
}
main().then(() => process.exit(0)).catch(() => { console.error("Catalog audit failed"); process.exit(1); });
