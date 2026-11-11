// One folder per catalogue game: exactly 100, ids match the catalogue, every folder has its entry point and theme, the registry resolves
// them all, assets referenced by themes exist, no folder imports another game's folder, shared never imports a game, and the
// presentation files contain no gameplay code. Routes/ids/locks are unchanged because only the lazy-import target moved.
import "./lib/stub-css";
import fs from "node:fs";
import path from "node:path";
import { slotGames } from "../src/lib/games";
import { REALMS_GAME_IDS } from "../src/lib/realms/identity";
import { DECKS, FRAMES, FXS, SPINS, VOICES, type GameSkin } from "../src/games/shared/themes/skin";
import { GAME_VIEW_LOADERS } from "../src/games/registry";
import { BUY_BONUS_MOTIFS } from "../src/components/maxhigh/buy-bonus/motifs";

const root = path.resolve(import.meta.dirname, "..");
const gamesDir = path.join(root, "src/games");
let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    failures++;
    console.error("FAIL", msg);
  }
};

const catalogue = slotGames.map((g) => g.id);
check(catalogue.length === 100, `catalogue has 100 games, found ${catalogue.length}`);
check(new Set(catalogue).size === catalogue.length, "no duplicate catalogue ids");
check(REALMS_GAME_IDS.length === 50, "50 Realms ids");

const folders = fs.readdirSync(gamesDir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "shared").map((d) => d.name);
check(folders.length === 100, `exactly 100 game folders, found ${folders.length}`);
check(JSON.stringify([...folders].sort()) === JSON.stringify([...catalogue].sort()), "game folders match the catalogue ids exactly");
check(Object.keys(GAME_VIEW_LOADERS).length === 100, "registry has 100 entries");
check(JSON.stringify(Object.keys(GAME_VIEW_LOADERS).sort()) === JSON.stringify([...catalogue].sort()), "registry keys match the catalogue");
for (const id of REALMS_GAME_IDS) check(id in GAME_VIEW_LOADERS, `Realms ${id} is registered`);

const signatures = new Map<string, string>();
const kinds: Record<string, number> = {};
for (const g of slotGames) {
  const dir = path.join(gamesDir, g.id);
  check(fs.existsSync(path.join(dir, "GameView.tsx")), `${g.id}: GameView.tsx`);
  check(fs.existsSync(path.join(dir, "game.theme.ts")), `${g.id}: game.theme.ts`);
  const mod = await import(`../src/games/${g.id}/game.theme.ts`);
  const t = mod.gameTheme;
  check(t.id === g.id && t.name === g.name, `${g.id}: theme id/name match the catalogue`);
  check(t.motif in BUY_BONUS_MOTIFS, `${g.id}: motif ${t.motif} is a known Buy Bonus motif (modal theme stays compatible)`);
  kinds[t.kind] = (kinds[t.kind] ?? 0) + 1;
  const view = fs.readFileSync(path.join(dir, "GameView.tsx"), "utf8");
  check(/export function GameView/.test(view), `${g.id}: exports GameView`);
  check(!/from "\.\.\/[a-z0-9-]+\/(?!\.)/.test(view.replace(/\.\.\/shared\//g, "")), `${g.id}: imports no other game folder`);
  check(!/fetch\(|createServerFn|useState|wallet|ledger|settle/i.test(view), `${g.id}: GameView holds no gameplay code`);
  if (t.skin) {
    const s = t.skin as GameSkin;
    check(FRAMES.includes(s.frame) && DECKS.includes(s.deck) && VOICES.includes(s.voice) && SPINS.includes(s.spin) && FXS.includes(s.fx), `${g.id}: skin values valid`);
    check(s.tune.corner >= 6 && s.tune.corner <= 24 && s.tune.ornament > 0.2 && s.tune.ornament < 0.8 && s.tune.spin >= 72 && s.tune.spin <= 110, `${g.id}: tune in range`);
    const sig = `${s.frame}/${s.deck}/${s.spin}`;
    check(!signatures.has(sig), `${g.id}: frame/deck/spin ${sig} also used by ${signatures.get(sig)}`);
    signatures.set(sig, g.id);
  } else check(t.kind === "table" || t.kind === "fishing", `${g.id}: only table/fishing games have no slot skin`);
}
check(Object.keys(kinds).length === 4 && kinds.realms === 50, `kinds ${JSON.stringify(kinds)}`);
check(signatures.size === 82, `82 skinned games with unique frame/deck/spin, found ${signatures.size}`);

// shared must never import a specific game; no circular import through the registry
for (const f of fs.readdirSync(path.join(gamesDir, "shared"), { recursive: true }) as string[]) {
  if (!/\.(tsx?|css)$/.test(f)) continue;
  const src = fs.readFileSync(path.join(gamesDir, "shared", f), "utf8");
  check(!/games\/[a-z0-9-]+\/(GameView|game\.theme)/.test(src), `shared/${f} must not import a game folder`);
  check(!/gamePlayRegistry/.test(src), `shared/${f} must not import the registry`);
}
const registryUsers = fs.readdirSync(gamesDir, { recursive: true }).filter((f) => /\.(tsx?)$/.test(String(f)) && !String(f).startsWith("registry"));
for (const f of registryUsers) {
  const src = fs.readFileSync(path.join(gamesDir, String(f)), "utf8");
  check(!/gamePlayRegistry|games\/registry/.test(src), `${f} must not import the registries (no cycle)`);
}

console.log(`game-folders: ${folders.length} folders, kinds ${JSON.stringify(kinds)}, ${signatures.size} unique skins`);
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("game-folders: OK");
