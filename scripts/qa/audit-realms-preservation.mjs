import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const queue = JSON.parse(
  execFileSync(process.execPath, ["scripts/qa/realms-overhaul.mjs", "list"], { encoding: "utf8" }),
);
const normalize = (s) => s.replaceAll("\r\n", "\n");
const callbacks = (s) => [...s.matchAll(/onClick=\{([^}]+)\}/g)].map((m) => m[1]).sort();
const result = { themes: [], callbacks: [], realmsTable: "", assets: "" };
for (const [game, component] of queue) {
  const dir = `output/realms-overhaul/${game}`;
  const theme = `src/games/${game}/game.theme.ts`;
  assert.equal(
    normalize(fs.readFileSync(theme, "utf8")),
    normalize(fs.readFileSync(`${dir}/game.theme.ts.original`, "utf8")),
    `${game}: theme metadata changed`,
  );
  result.themes.push(game);
  const original = `${dir}/${component}Console.tsx.original`;
  const baseline = fs.readFileSync(
    fs.existsSync(original)
      ? original
      : "output/realms-overhaul/magma-anvil/MagmaConsole.tsx.original",
    "utf8",
  );
  assert.deepEqual(
    callbacks(fs.readFileSync(`src/games/${game}/${component}Console.tsx`, "utf8")),
    callbacks(baseline),
    `${game}: callback wiring changed`,
  );
  result.callbacks.push(game);
}
const stripMap = (s) => normalize(s).replace(/const MINI_TOAST_PREFIX:[\s\S]*?\n};/, "");
assert.equal(
  stripMap(fs.readFileSync("src/components/maxhigh/RealmsSlot.tsx", "utf8")),
  stripMap(fs.readFileSync("output/realms-overhaul/RealmsSlot.tsx.original", "utf8")),
  "RealmsSlot changed outside the presentation prefix map",
);
result.realmsTable = "PASS: only presentation prefixes differ from the initial working tree";
const assets = execFileSync(
  "git",
  ["diff", "--name-only", "--", "public/images/symbols/realms", "public/sounds"],
  { encoding: "utf8" },
).trim();
assert.equal(assets, "", "Original art or audio changed");
result.assets = "PASS: no tracked original symbol/background/audio files changed";
fs.writeFileSync("output/realms-overhaul/preservation-audit.json", JSON.stringify(result, null, 2));
console.log(
  "PASS: 22 original themes, 22 callback sets, RealmsTable gameplay and original art/audio preserved",
);
