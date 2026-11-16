// Read-only local-demo inventory. Never calls dashboard APIs (some perform writes).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { config } from "dotenv";
import mysql from "mysql2/promise";

const source = path.resolve(process.argv[2] ?? process.cwd());
config({ path: path.join(source, ".env"), quiet: true });
if (
  process.env.DATABASE_URL ||
  process.env.MYSQL_DATABASE !== "maxhigh_demo" ||
  !["127.0.0.1", "localhost"].includes(process.env.MYSQL_HOST)
)
  throw Error("Requires explicitly configured local maxhigh_demo");
const out = path.resolve("output/spin-buttons");
fs.mkdirSync(out, { recursive: true });
await build({
  stdin: {
    contents: `import {slotGames} from './src/lib/games'; import {ACCESS_POLICY} from './src/server/policy/access-policy.config'; import {isAdminListedGame,isLobbyVisibleGame,isThumbnailOnlyGame} from './src/lib/playable-games'; import {REALMS_GAMES} from './src/lib/realms/catalog'; export {slotGames,ACCESS_POLICY,REALMS_GAMES}; export const listed=slotGames.filter(g=>isAdminListedGame(g.id)&&!isThumbnailOnlyGame(g.id)).map(g=>g.id); export const visible=slotGames.filter(g=>isLobbyVisibleGame(g.id)&&!isThumbnailOnlyGame(g.id)).map(g=>g.id);`,
    resolveDir: source,
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: path.join(out, "catalog.mjs"),
  tsconfig: path.join(source, "tsconfig.json"),
});
const {
  slotGames,
  ACCESS_POLICY: policy,
  REALMS_GAMES: realms,
  listed,
  visible,
} = await import(pathToFileURL(path.join(out, "catalog.mjs")).href);
if (policy.grantKeys.length)
  throw Error("Inventory must verify signed grants when keys are configured");
const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});
await connection.query("START TRANSACTION READ ONLY");
const [controls] = await connection.query(
  "SELECT game_id, enabled FROM game_controls ORDER BY game_id",
);
await connection.rollback();
await connection.end();
const locks = new Set(policy.gameLocks.enforcement === "on" ? policy.gameLocks.lockedGames : []);
const games = slotGames
  .filter((g) => listed.includes(g.id))
  .map((g) => {
    const definition = realms.find((r) => r.id === g.id);
    const view = `src/games/${g.id}/GameView.tsx`;
    const text = fs.readFileSync(path.join(source, view), "utf8");
    const engine = definition
      ? "RealmsSlot"
      : (text.match(/import \{ (\w+Slot|\w+Game) \}/)?.[1] ?? "See GameView");
    const enabled = controls.find((r) => r.game_id === g.id)?.enabled ?? "yes (catalog default)";
    const active = !locks.has(g.id) && !enabled.startsWith("no");
    const consoleFiles = fs
      .readdirSync(path.join(source, `src/games/${g.id}`))
      .filter((f) => /Console\.tsx$|Navigation\.tsx$/.test(f));
    const existingControl = consoleFiles.length
      ? consoleFiles.map((f) => `src/games/${g.id}/${f}`).join(", ")
      : "src/components/maxhigh/SlotControlDeck.tsx";
    return {
      name: g.name,
      slug: g.id,
      category: g.category,
      engine,
      active,
      locked: locks.has(g.id),
      databaseEnabled: enabled,
      lobbyVisible: visible.includes(g.id),
      view,
      existingControl,
      definition: definition ?? null,
      thumbnail: g.thumb,
      filesToModify:
        active && g.category === "slot"
          ? [
              "src/games/shared/layouts/SkinnedGame.tsx",
              "src/components/maxhigh/spin-button/game-spin-themes.ts",
              "src/components/maxhigh/spin-button/game-spin-button.css",
            ]
          : [],
    };
  });
const report = {
  checkedAt: new Date().toISOString(),
  source,
  policySha256: createHash("sha256")
    .update(fs.readFileSync(path.join(source, "src/server/policy/access-policy.config.ts")))
    .digest("hex"),
  database: "local maxhigh_demo",
  controls,
  semantics:
    "Client-active = admin-listed AND enabled(default yes) AND not policy-locked. Developer maintenance sees locked games as enabled too. Lobby visibility alone does not enforce policy locks.",
  counts: {
    total: games.length,
    active: games.filter((g) => g.active).length,
    activeSlots: games.filter((g) => g.active && g.category === "slot").length,
    activeNonSlots: games.filter((g) => g.active && g.category !== "slot").length,
  },
  games,
};
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/CODEX_SPIN_INVENTORY.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.counts));
