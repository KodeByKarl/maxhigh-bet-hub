import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ts from "typescript";
import { REALMS_GAMES } from "../src/lib/realms/catalog";
import { LOBBY_VISIBLE_GAME_IDS } from "../src/lib/playable-games";

const root = "src/components/maxhigh";
const read = (p: string) => fs.readFileSync(p, "utf8");
const hash = (p: string) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const registry = ts.createSourceFile(
  "registry.ts",
  read(`${root}/gamePlayRegistry.ts`),
  ts.ScriptTarget.Latest,
  true,
);
const ids: string[] = [];
function visit(n: ts.Node) {
  if (
    ts.isVariableDeclaration(n) &&
    n.name.getText(registry) === "GAME_LAZY" &&
    n.initializer &&
    ts.isObjectLiteralExpression(n.initializer)
  ) {
    for (const p of n.initializer.properties)
      if (p.name) ids.push(p.name.getText(registry).replaceAll('"', ""));
  }
  ts.forEachChild(n, visit);
}
visit(registry);
const synthKeys = [
  "startSpinLoop",
  "playUiClick",
  "playReelStop",
  "playCascadeTick",
  "playWin",
  "playScatterTrigger",
  "playFreespinIntro",
  "endFreespins",
];
type Row = {
  id: string;
  source: string;
  mode: string;
  events: string[];
  files: string[];
  bgm: number;
  lobby: boolean;
  missing: string[];
};
const rows: Row[] = [];
for (const id of ids) {
  const source = [`${root}/${id}/audio.ts`, `${root}/games/${id}/audio.ts`].find(fs.existsSync);
  if (!source) throw Error(`No audio module for registered game: ${id}`);
  const s = read(source);
  let events: string[] = [],
    files: string[] = [],
    bgm = 0,
    mode = "sample";
  if (s.includes("createSoftPeryaAudio")) {
    events = synthKeys;
    bgm = 1;
    mode = "Web Audio";
  } else if (id === "wild-panther") {
    events = [
      "startSpinLoop",
      "playReelStop",
      "playCascadeTick",
      "playWin",
      "playScatterTrigger",
      "playFreespinIntro",
    ];
    bgm = 1;
    mode = "Web Audio (custom)";
  } else if (id === "color-game" || id === "color-game-pro") {
    const union = s.match(/export type \w+SoundKey\s*=([\s\S]*?);/)![1];
    events = [...union.matchAll(/"([^"]+)"/g)].map((m) => m[1]).concat("wheelSpin");
    mode = "Web Audio";
  } else if (id === "lucky-drop") {
    events = ["chip", "flip", "start", "skip", "bust", "cashout", "summit", "tick", "climb"];
    files = [...events.slice(0, 8), ...Array.from({ length: 10 }, (_, i) => `climb${i + 1}`)].map(
      (f) => `/sounds/royal-climb/${f}.wav`,
    );
  } else {
    const mapping = s.match(/const FILES[^=]*=\s*\{([\s\S]*?)\};/)?.[1];
    if (!mapping) throw Error(`Unresolved sound map ${source}`);
    const config = path.join(path.dirname(source), "animationConfig.ts");
    const dir =
      s.match(/const SOUND_DIR = "([^"]+)"/)?.[1] ??
      (fs.existsSync(config) ? read(config).match(/soundDir:\s*"([^"]+)"/)?.[1] : undefined);
    if (!dir) throw Error(`Unresolved sound directory ${source}`);
    for (const m of mapping.matchAll(/(\w+):\s*"([^"]+)"/g)) {
      events.push(m[1]);
      files.push(`${dir}/${m[2]}`);
    }
  }
  rows.push({
    id,
    source,
    mode,
    events,
    files,
    bgm,
    lobby: (LOBBY_VISIBLE_GAME_IDS as readonly string[]).includes(id),
    missing: files.filter((f) => !fs.existsSync(`public${f}`)),
  });
}
for (const game of REALMS_GAMES)
  rows.push({
    id: game.id,
    source: `${root}/realms/audio.ts`,
    mode: "Web Audio (Realms)",
    events: synthKeys,
    files: [],
    bgm: 1,
    lobby: false,
    missing: [],
  });
const gentleManifestPath = "docs/gentle-sfx-manifest.json";
const ambientPaths: string[] = [];
if (fs.existsSync(gentleManifestPath)) {
  const manifest: { game: string; event: string; file: string }[] = JSON.parse(
    read(gentleManifestPath),
  );
  for (const row of rows) {
    const pack = manifest.filter((m) => m.game === row.id);
    if (!pack.length) throw Error(`Missing gentle pack ${row.id}`);
    row.mode = "sample";
    if (row.id === "wild-panther") row.events = synthKeys;
    row.files = pack.filter((m) => m.event !== "ambient").map((m) => m.file.replace(/^public/, ""));
    const ambient = pack
      .filter((m) => m.event === "ambient")
      .map((m) => m.file.replace(/^public/, ""));
    ambientPaths.push(...ambient);
    row.bgm = ambient.length;
    row.missing = [...row.files, ...ambient].filter((f) => !fs.existsSync(`public${f}`));
  }
}
const activePaths = [...new Set([...rows.flatMap((r) => r.files), ...ambientPaths])];
const byHash = new Map<string, string[]>();
for (const p of activePaths)
  if (fs.existsSync(`public${p}`)) {
    const h = hash(`public${p}`);
    byHash.set(h, [...(byHash.get(h) ?? []), p]);
  }
const inventory = (fs.readdirSync("public", { recursive: true }) as string[])
  .filter((f) => /\.(wav|mp3|ogg|m4a|aac|flac)$/i.test(f))
  .map((f) => "/" + f.replaceAll("\\", "/"));
const summary = {
  games: rows.length,
  visibleGames: rows.filter((r) => r.lobby).length,
  synthGames: rows.filter((r) => r.mode.startsWith("Web Audio")).length,
  sampledGames: rows.filter((r) => r.mode === "sample").length,
  configuredEvents: rows.reduce((n, r) => n + r.events.length, 0),
  sampledEvents: rows.filter((r) => r.mode === "sample").reduce((n, r) => n + r.events.length, 0),
  synthesizedEvents: rows
    .filter((r) => r.mode.startsWith("Web Audio"))
    .reduce((n, r) => n + r.events.length, 0),
  ambientProfiles: rows.reduce((n, r) => n + r.bgm, 0),
  referencedFilePaths: activePaths.length,
  existingReferencedFiles: activePaths.filter((p) => fs.existsSync(`public${p}`)).length,
  uniqueReferencedRecordings: byHash.size,
  filesOnDisk: inventory.length,
  missing: [...new Set(rows.flatMap((r) => r.missing))],
};
const result = {
  summary,
  rows,
  duplicateRecordings: [...byHash.values()].filter((g) => g.length > 1),
  notReferencedByRegisteredGameMaps: inventory.filter((p) => !activePaths.includes(p)),
};
fs.mkdirSync("output/sfx-audit", { recursive: true });
fs.writeFileSync("output/sfx-audit/audit.json", JSON.stringify(result, null, 2));
const lines = [
  "# Game SFX audit - 2026-10-13",
  "",
  "Static audit of all registered playable games. Counts describe configured SFX event types, not playback frequency or proof that every event fires during gameplay. Sample paths are resolved from each game's audio.ts and animationConfig.ts. Synthesized sounds are Web Audio code, not files. One win event may produce multiple melodies according to payout; one climb event selects ten recordings. Ambient music is counted separately. Ace High Web Speech announcements are additional voice output, excluded from SFX counts.",
  "",
  "## Totals",
  "",
  ...Object.entries(summary)
    .filter(([k]) => k !== "missing")
    .map(([k, v]) => `- ${k}: ${v}`),
  "",
  "The 100 registered games include 50 hidden Realms titles and Fire Spike/Coin Volcano outside the current lobby-visible list. Lobby visibility is a source-code configuration, not a database availability check. Old or non-registered game audio files on disk do not count as active registered-game SFX.",
  "",
  "## Missing referenced files",
  "",
  ...summary.missing.map((p) => `- ${p}`),
  "",
  "## Per-game configuration",
  "",
  "| Game | Mode | SFX events | Sample paths | Ambient | Missing | Lobby visible |",
  "| --- | --- | ---: | ---: | ---: | ---: | --- |",
  ...rows.map(
    (r) =>
      `| ${r.id} | ${r.mode} | ${r.events.length} | ${r.files.length} | ${r.bgm} | ${r.missing.length} | ${r.lobby ? "Yes" : "No"} |`,
  ),
  "",
  "## Duplicate recordings (identical SHA-256)",
  "",
  ...result.duplicateRecordings.map((g) => `- ${g.join("; ")}`),
  "",
  "## Evidence and limits",
  "",
  "[Complete event keys, resolved paths, missing files and retained inventory](../output/sfx-audit/audit.json). Re-run with `npx tsx scripts/audit-game-sfx.ts`.",
  "",
  "No sound playback, perceptual comparison, mobile audio-unlock or browser runtime test was performed. Hash equality proves byte-identical files; different hashes do not prove perceptually different sound. Shared synthesis code can sound related despite distinct voice settings. No source or audio assets were changed.",
  "",
];
fs.writeFileSync("docs/game-sfx-audit.md", lines.join("\n"));
console.log(JSON.stringify(summary, null, 2));
