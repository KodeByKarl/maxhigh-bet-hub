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
const baseline = execFileSync("git", ["show", `2165b5f6a029e1a461142b0e2d0ca315254877e7:${file}`], {
  encoding: "utf8",
});
const current = fs.readFileSync(file, "utf8");
const require = createRequire(import.meta.url);
const modules = [];
for (const [name, source] of [
  ["baseline", baseline],
  ["current", current],
]) {
  const outfile = path.join(root, "output", `sirens-${name}.cjs`);
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
  (id) => id !== "sirens-lagoon",
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
const sirens = renderToStaticMarkup(
  React.createElement(after.SlotControlDeck, { ...props, gameId: "sirens-lagoon" }),
);
assert(sirens.includes('class="sirens-console"'));
assert(sirens.includes('aria-label="More game settings"'));
assert(sirens.includes('aria-label="Spin"'));
console.log(`PASS Sirens routing and ${comparisons} unchanged shared-deck renders`);
