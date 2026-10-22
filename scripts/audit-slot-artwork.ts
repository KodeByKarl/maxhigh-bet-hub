import type { PantherTheme } from "../src/components/maxhigh/panther-shared/theme";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const componentRoot = path.join(root, "src/components/maxhigh");
const baselineRoot = path.join(root, "public/images/symbols/coral-cobra");
const hash = (file: string) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const names = ["10", "J", "Q", "K", "A", "premium-a", "premium-b", "premium-c", "scatter", "wild"];
const baseline = new Set(names.map((name) => hash(path.join(baselineRoot, `${name}.png`))));
const baselineBg = hash(path.join(baselineRoot, "backdrop.webp"));
const rows: {
  game: string;
  id: string;
  duplicateSymbols: number;
  symbols: number;
  duplicateBackground: boolean;
  missing: string[];
  urls: string[];
}[] = [];
for (const entry of fs.readdirSync(componentRoot, { withFileTypes: true })) {
  const file = path.join(componentRoot, entry.name, "theme.ts");
  if (
    !entry.isDirectory() ||
    !fs.existsSync(file) ||
    entry.name === "panther-shared" ||
    entry.name === "realms"
  )
    continue;
  const exports = await import(pathToFileURL(file).href);
  const theme = Object.values(exports).find(
    (value: unknown): value is PantherTheme =>
      typeof value === "object" && value !== null && "id" in value && "assets" in value,
  ) as PantherTheme;
  if (!theme) continue;
  const symbols = Object.values(theme.assets.icons) as string[];
  const missing: string[] = [];
  let duplicateSymbols = 0;
  const local = (url: string) => path.join(root, "public", url.split("?")[0]);
  for (const url of symbols) {
    if (!fs.existsSync(local(url))) missing.push(url);
    else if (baseline.has(hash(local(url)))) duplicateSymbols++;
  }
  for (const url of [theme.assets.backdrop, theme.assets.loadingBg]) {
    if (!fs.existsSync(local(url))) missing.push(url);
  }
  const duplicateBackground =
    fs.existsSync(local(theme.assets.backdrop)) &&
    hash(local(theme.assets.backdrop)) === baselineBg;
  rows.push({
    game: theme.name,
    id: theme.id,
    duplicateSymbols,
    symbols: symbols.length,
    duplicateBackground,
    missing,
    urls: [...symbols, theme.assets.backdrop, theme.assets.loadingBg],
  });
}
rows.sort((a, b) => b.duplicateSymbols - a.duplicateSymbols || a.game.localeCompare(b.game));
const affected = rows.filter(
  (r) => r.id !== "coral-cobra" && (r.duplicateSymbols || r.duplicateBackground),
);
const report = [
  "# Active slot artwork audit",
  "",
  "Checks actual exported theme URLs, including versioned replacement assets. Compares SHA-256 file hashes against the underwater symbol/background pack currently used by Coral Cobra. Identical hashes prove exact duplicate files; a different hash does not by itself prove good visual quality. Retained, unused old files do not count as active duplicates.",
  "",
  `Audited ${rows.length} Panther-theme games. ${affected.length} games besides Coral Cobra still use part or all of the same underwater pack.`,
  "",
  "| Game | Identical underwater symbols | Same underwater background | Missing active files |",
  "| --- | ---: | --- | ---: |",
  ...rows.map(
    (r) =>
      `| ${r.game} | ${r.duplicateSymbols}/${r.symbols} | ${r.duplicateBackground ? "Yes" : "No"} | ${r.missing.length} |`,
  ),
  "",
  "Coral Cobra is the comparison baseline; its aquatic theme needs visual review rather than automatic classification as off-theme. The other games using this pack need individual themed replacements.",
  "",
  "Scope: shared Panther slot themes. Fishing games, card games, Realms games and standalone games with other asset loaders are not included in this table.",
  "",
  "## Active paths",
  "",
  ...rows.flatMap((r) => [
    `### ${r.game}`,
    "",
    ...r.urls.map((u) => `- \`${u}\``),
    ...r.missing.map((u) => `- MISSING: \`${u}\``),
    "",
  ]),
].join("\n");
fs.mkdirSync(path.join(root, "docs"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/slot-artwork-audit.md"), report + "\n");
console.log(
  JSON.stringify(
    {
      audited: rows.length,
      affected: affected.map((r) => r.game),
      missing: rows.filter((r) => r.missing.length),
      summary: rows.map(({ urls, ...r }) => r),
    },
    null,
    2,
  ),
);
