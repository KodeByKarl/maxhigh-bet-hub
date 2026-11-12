import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Compare the shared renderer with the committed baseline for every other skin.
const root = process.cwd();
const file = "src/components/maxhigh/SlotControlDeck.tsx";
const baseline = execFileSync("git", ["show", `f1cf31f9fe89f5755a8c0ce0cf0de6402eecfad0:${file}`], {
  encoding: "utf8",
});
const current = fs.readFileSync(file, "utf8");
const require = createRequire(import.meta.url);
const modules = [];
for (const [name, source] of [
  ["baseline", baseline],
  ["current", current],
]) {
  const outfile = path.join(root, "output", `tide-${name}.cjs`);
  await build({
    stdin: {
      contents: source + "\nexport { SLOT_CONTROL_SKINS };",
      resolveDir: path.join(root, "src/components/maxhigh"),
      loader: "tsx",
    },
    outfile,
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    loader: { ".css": "empty" },
    jsx: "automatic",
  });
  modules.push(require(outfile));
}
const [before, after] = modules;
const noop = () => {};
const props = {
  bet: 5,
  win: 10,
  balance: 1234,
  busy: false,
  turbo: false,
  autoSpin: false,
  onSpin: noop,
  onDecreaseBet: noop,
  onIncreaseBet: noop,
  onSelectBet: noop,
  onTurbo: noop,
  onAuto: noop,
  onInfo: noop,
};
const states = [
  {},
  { busy: true },
  { autoSpin: true, autoRemaining: 10 },
  { inFree: true, freeSpins: 5 },
  { spinDisabled: true },
  { turbo: true },
];
let comparisons = 0;
for (const gameId of Object.keys(before.SLOT_CONTROL_SKINS).filter(
  (id) => id !== "tidecaller-hoard",
)) {
  for (const state of states) {
    const render = (module) =>
      renderToStaticMarkup(
        React.createElement(module.SlotControlDeck, { ...props, gameId, ...state }),
      );
    assert.equal(render(after), render(before), `${gameId} ${JSON.stringify(state)}`);
    comparisons++;
  }
}
const tide = renderToStaticMarkup(
  React.createElement(after.SlotControlDeck, { ...props, gameId: "tidecaller-hoard" }),
);
assert(tide.includes('class="tide-navigation"'));
assert(tide.includes('aria-label="Turbo"'));
assert(tide.includes('aria-label="Spin"'));
console.log(`PASS Tidecaller routing and ${comparisons} unchanged shared-deck renders`);
