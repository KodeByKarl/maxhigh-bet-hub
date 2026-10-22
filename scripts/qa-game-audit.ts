/**
 * Static whole-catalog audit: every game must be registered, have a thumbnail,
 * a mounted engine file, a server spin handler, and audio (SFX + music/ambient)
 * whose referenced files exist on disk.
 *   npx tsx scripts/qa-game-audit.ts
 */
import fs from "node:fs";
import path from "node:path";
import { slotGames } from "../src/lib/games";
import { resolveLazyGame } from "../src/components/maxhigh/gamePlayRegistry";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (p: string) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
const registrySrc = read(path.join(ROOT, "src/components/maxhigh/gamePlayRegistry.ts"));
const realmsServer = read(path.join(ROOT, "src/server/games/realms.server.ts"));
const apiSrc = fs
  .readdirSync(path.join(ROOT, "src/functions"))
  .map((f) => read(path.join(ROOT, "src/functions", f)))
  .join("\n");

type Row = { id: string; problems: string[]; notes: string[] };
const rows: Row[] = [];

/** Collect every file reachable from `entry` through relative imports (depth-limited). */
function reach(entry: string, seen = new Set<string>(), depth = 0): Set<string> {
  if (depth > 3 || seen.has(entry) || !fs.existsSync(entry)) return seen;
  seen.add(entry);
  const src = read(entry);
  for (const m of src.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const base = path.resolve(path.dirname(entry), m[1]);
    for (const c of [
      base + ".ts",
      base + ".tsx",
      path.join(base, "index.ts"),
      path.join(base, "index.tsx"),
    ]) {
      if (fs.existsSync(c)) reach(c, seen, depth + 1);
    }
  }
  return seen;
}

for (const g of slotGames) {
  const problems: string[] = [];
  const notes: string[] = [];
  const thumbPath = path.join(ROOT, "public", g.thumb.replace(/^\//, ""));
  if (!fs.existsSync(thumbPath)) problems.push(`thumbnail missing: ${g.thumb}`);
  if (!resolveLazyGame(g.id)) {
    problems.push("not registered in gamePlayRegistry");
    rows.push({ id: g.id, problems, notes });
    continue;
  }
  // locate engine entry
  const m = registrySrc.match(
    new RegExp(String.raw`"${g.id}":\s*lazyNamed\(\(\) => import\("\./([^"]+)"\)`),
  );
  const entry = m
    ? path.join(ROOT, "src/components/maxhigh", m[1])
    : path.join(ROOT, "src/components/maxhigh/RealmsSlot");
  const entryFile = [
    entry + ".tsx",
    entry + ".ts",
    path.join(entry, "index.tsx"),
    path.join(entry, "index.ts"),
  ].find((f) => fs.existsSync(f));
  if (!entryFile) {
    problems.push(`engine file missing: ${entry}`);
    rows.push({ id: g.id, problems, notes });
    continue;
  }
  const files = reach(entryFile);
  const all = [...files].map(read).join("\n");
  const hasAudio =
    /\.(startSpinLoop|playReelStop|playSpin|playWin|play[A-Z]\w*|startAmbient|startMusic)\(|sounds\./.test(
      all,
    ) && /audio|sounds|Audio/.test(all);
  const audioFiles = [...files].filter((f) => /audio|sounds/i.test(path.basename(f)));
  if (g.category === "slot" && !hasAudio) problems.push("NO audio wired into engine");
  if (g.category !== "slot" && audioFiles.length === 0 && !/new Audio|AudioContext/.test(all))
    problems.push("NO audio module");
  // referenced static audio files must exist
  for (const f of files) {
    for (const s of read(f).matchAll(/["'`](\/sounds\/[^"'`]+?\.(?:wav|mp3|ogg|m4a))["'`]/g)) {
      const p = path.join(ROOT, "public", decodeURIComponent(s[1]));
      if (!fs.existsSync(p)) problems.push(`sound file missing: ${s[1]}`);
    }
    for (const s of read(f).matchAll(
      /["'`](\/(?:images|games)\/[^"'`${}]+?\.(?:png|webp|jpg|jpeg|svg))["'`]/g,
    )) {
      const p = path.join(ROOT, "public", decodeURIComponent(s[1]));
      if (!fs.existsSync(p)) problems.push(`image missing: ${s[1]}`);
    }
  }
  // music / ambient presence for slots
  if (g.category === "slot" && !/startAmbient|startMusic|ambient|bgm|music/i.test(all))
    notes.push("no background music/ambient");
  // server handler
  const serverFile = path.join(ROOT, "src/server/games", `${g.id}.server.ts`);
  const isRealm = /RealmsSlot/.test(entryFile);
  if (!fs.existsSync(serverFile) && !isRealm) problems.push("no server handler file");
  if (isRealm && !realmsServer) problems.push("realms server missing");
  rows.push({ id: g.id, problems, notes });
}

const bad = rows.filter((r) => r.problems.length);
for (const r of rows) {
  const tag = r.problems.length ? "FAIL" : r.notes.length ? "WARN" : "OK  ";
  if (tag !== "OK  " || process.argv.includes("-v"))
    console.log(
      `${tag} ${r.id}${r.problems.length ? " :: " + r.problems.join("; ") : ""}${r.notes.length ? " [" + r.notes.join("; ") + "]" : ""}`,
    );
}
console.log(
  `\n${rows.length} games, ${rows.length - bad.length} clean, ${bad.length} with problems`,
);
process.exit(bad.length ? 1 : 0);
