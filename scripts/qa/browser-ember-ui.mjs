// Isolated UI fixture: real game/components/assets, mocked account and RPCs. No money is settled.
// PW_MODULE_DIR points to an installed playwright package's parent node_modules directory.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { build } from "esbuild";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { execFileSync } from "node:child_process";
import postcss from "postcss";
import ts from "typescript";

const root = process.cwd();
const slotFile = "src/components/maxhigh/EmberTigerSlot.tsx";
const baseline = execFileSync("git", ["show", `HEAD:${slotFile}`], { encoding: "utf8" });
const stripDeckImport = (source) =>
  source.replace(/^import .*SlotControlDeck.*;\r?\n/m, "").replace(/\r\n/g, "\n");
assert.equal(
  stripDeckImport(fs.readFileSync(slotFile, "utf8")),
  stripDeckImport(baseline),
  "gameplay handlers and math unchanged",
);
// Mapping, assets and all per-cell playback remain the original implementations.
for (const file of ["types.ts", "ReelCell.tsx", "PantherIcon.tsx", "theme.ts", "gridState.ts"]) {
  const source = `src/components/maxhigh/ember-tiger/${file}`;
  assert.equal(
    fs.readFileSync(source, "utf8").replace(/\r\n/g, "\n"),
    execFileSync("git", ["show", `HEAD:${source}`], { encoding: "utf8" }).replace(/\r\n/g, "\n"),
    source,
  );
}
const gridFile = "src/components/maxhigh/ember-tiger/ReelGrid.tsx";
const tokens = (source) => {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.JSX,
    source.replace(/\s+data-ember-formation/g, "").replace(/\s+data-ember-column=\{col\}/g, ""),
  );
  const result = [];
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) result.push(scanner.getTokenText());
  return result;
};
assert.deepEqual(
  tokens(fs.readFileSync(gridFile, "utf8")),
  tokens(execFileSync("git", ["show", `HEAD:${gridFile}`], { encoding: "utf8" })),
  "reel rendering unchanged except presentation attributes",
);
postcss
  .parse(fs.readFileSync("src/games/ember-tiger/ember-layout.css", "utf8"))
  .walkRules((rule) => {
    if (rule.parent.type === "atrule" && rule.parent.name === "keyframes") return;
    assert(
      rule.selectors.every((selector) => selector.includes('[data-game-view="ember-tiger"]')),
      "CSS stays scoped to Desert Riches",
    );
  });
const out = path.join(root, "output/ember-tiger-ui");
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright");
const auth = `export const useAuth = () => ({user:{id:'ui-fixture',balance:15491},setBalanceLocal:()=>{},refreshJackpot:()=>{}});`;
const api = `export const getEmberTigerSessionFn=async()=>({sessionId:null,freeSpinsLeft:0});
import { initialBoard } from '@/components/maxhigh/ember-tiger/gridState';
const spin=async()=>{window.rpcCalls=(window.rpcCalls||0)+1;return {session:{sessionId:null,freeSpinsLeft:0,fsSessionWin:0,fsSpinsPlayed:0,inFree:false},script:{initialBoard:initialBoard(),steps:[],totalWin:0,rawWin:0,displayMult:1,scatters:0,scatterPay:0,freeSpinsAwarded:0,retriggerSpins:0,isFreeSpins:false,bombAccumulator:0}};};
export const emberTigerSpinFn=spin,emberTigerFreeSpinFn=spin,emberTigerBuyFeatureFn=spin;`;
const config = `export const getEmberTigerEngineConfigFn=async()=>{throw new Error('UI fixture: use existing defaults');};`;
fs.writeFileSync(
  path.join(out, "index.html"),
  '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><link rel="stylesheet" href="/utilities.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
);
await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{GameView}from'./src/games/ember-tiger/GameView';import{EmberControls}from'./src/components/maxhigh/ember-tiger/EmberControls';
document.body.style.margin='0';document.getElementById('root').style.cssText='height:100dvh;width:100%;';const app=createRoot(document.getElementById('root'));app.render(<GameView/>);
window.mountDeckState=(props)=>{window.calls={};const handler=name=>()=>{window.calls[name]=(window.calls[name]||0)+1;};const actions=Object.fromEntries(['onSpin','onDecreaseBet','onIncreaseBet','onSelectBet','onTurbo','onAuto','onInfo'].map(name=>[name,handler(name)]));app.render(<div data-game-view="ember-tiger" style={{height:'100%'}}><EmberControls gameId="ember-tiger" balance={15491} bet={5} win={0} busy={false} turbo={false} autoSpin={false} {...actions} {...props}/></div>);};`,
    resolveDir: root,
    loader: "tsx",
  },
  bundle: true,
  outfile: path.join(out, "fixture.js"),
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "fixture",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/auth$|^@\/functions\/(api|superadmin)$/ }, (args) => ({
          path: args.path,
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
          resolveDir: root,
          contents: args.path === "@/lib/auth" ? auth : args.path.endsWith("/api") ? api : config,
          loader: "js",
        }));
      },
    },
  ],
});
const compiler = await compile(fs.readFileSync("src/styles.css", "utf8"), {
  base: path.join(root, "src"),
  onDependency: () => {},
});
const scanner = new Scanner({
  sources: [{ base: path.join(root, "src"), pattern: "**/*.{ts,tsx}", negated: false }],
});
fs.writeFileSync(path.join(out, "utilities.css"), compiler.build(scanner.scan()));
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = decodeURIComponent(url.pathname);
  const file =
    rel.startsWith("/images/") || rel.startsWith("/sounds/")
      ? path.join(root, "public", rel)
      : path.join(out, rel.endsWith("index.html") ? "index.html" : rel);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    file.endsWith(".js")
      ? "text/javascript"
      : file.endsWith(".css")
        ? "text/css"
        : file.endsWith(".html")
          ? "text/html"
          : "application/octet-stream",
  );
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(18773, "127.0.0.1", r));
console.log("UI fixture listening");
const browser = await chromium.launch({ headless: true });
console.log("Chromium launched");
const page = await browser.newPage();
console.log("Browser page ready");
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = [];
try {
  await page.goto("http://127.0.0.1:18773/output/ember-tiger-ui/index.html");
  console.log("Fixture loaded");
  await page.waitForSelector("[data-ember-column='2'] > :nth-child(5)");
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  for (const [width, height] of [
    [360, 640],
    [375, 667],
    [390, 844],
    [393, 852],
    [430, 932],
    [844, 390],
    [1366, 768],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    const metrics = await page.evaluate(() => {
      const board = document.querySelector("[data-ember-formation]");
      const columns = [...board.children];
      const cells = columns.flatMap((col) => [...col.children]);
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      };
      const buttons = [...document.querySelectorAll(".ember-console button")];
      const b = rect(board);
      const deck = rect(document.querySelector(".ember-console"));
      return {
        cells: cells.length,
        heights: columns.map((col) => col.children.length),
        symbolCenters: cells.every((el) => {
          const r = rect(el),
            i = rect(el.querySelector("img"));
          return (
            Math.abs(r.x + r.w / 2 - i.x - i.w / 2) < 1 &&
            Math.abs(r.y + r.h / 2 - i.y - i.h / 2) < 1
          );
        }),
        geometry: (() => {
          const first = rect(cells[0]);
          const pitch = rect(cells[1]).y - first.y;
          const center = rect(board).y + rect(board).h / 2;
          return columns.every((column, col) => {
            const r = rect(column);
            const firstCol = rect(columns[0]);
            return (
              Math.abs(r.x - firstCol.x - col * pitch) < 1 &&
              [...column.children].every((cell, row) => {
                const c = rect(cell),
                  height = column.children.length;
                return (
                  Math.abs(c.w - first.w) < 1 &&
                  Math.abs(c.h - c.w) < 1 &&
                  getComputedStyle(cell).clipPath === "circle(50% at 50% 50%)" &&
                  Math.abs(c.y + c.h / 2 - (center + (row - (height - 1) / 2) * pitch)) < 1
                );
              })
            );
          });
        })(),
        board: b,
        deck,
        overflow: document.documentElement.scrollWidth > innerWidth,
        verticalScroll: document.documentElement.scrollHeight > innerHeight,
        centered: Math.abs(b.x + b.w / 2 - innerWidth / 2) < 1,
        separated: b.bottom <= deck.y || b.right <= deck.x,
        spinCentered: (() => {
          const el = document.querySelector(".ember-console__spin");
          const r = rect(el);
          return [...el.children].every((child) => {
            const c = rect(child);
            return Math.abs(c.x + c.w / 2 - r.x - r.w / 2) < 1;
          });
        })(),
        visible: cells.every((el) => {
          const r = rect(el);
          let ancestor = el.parentElement;
          while (ancestor && ancestor !== document.body) {
            const cs = getComputedStyle(ancestor),
              a = rect(ancestor);
            if (/(hidden|clip)/.test(cs.overflowX) && (r.x < a.x - 1 || r.right > a.right + 1))
              return false;
            if (/(hidden|clip)/.test(cs.overflowY) && (r.y < a.y - 1 || r.bottom > a.bottom + 1))
              return false;
            ancestor = ancestor.parentElement;
          }
          return (
            r.w > 0 &&
            r.h > 0 &&
            r.x >= 0 &&
            r.y >= 0 &&
            r.right <= innerWidth &&
            r.bottom <= innerHeight
          );
        }),
        images: cells.every((el) => {
          const i = el.querySelector("img");
          return i?.complete && i.naturalWidth > 0 && getComputedStyle(i).objectFit === "contain";
        }),
        targets: buttons.every((el) => {
          const r = rect(el);
          return r.w >= 44 && r.h >= 44;
        }),
        controlsVisible: buttons.every((el) => {
          const r = rect(el);
          return r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        }),
        overlap: buttons.some((a, i) =>
          buttons.slice(i + 1).some((b) => {
            const r = a.getBoundingClientRect(),
              s = b.getBoundingClientRect();
            return (
              Math.min(r.right, s.right) > Math.max(r.left, s.left) + 1 &&
              Math.min(r.bottom, s.bottom) > Math.max(r.top, s.top) + 1
            );
          }),
        ),
        panel: getComputedStyle(document.querySelector(".ember-console")).backgroundColor,
      };
    });
    results.push({ width, height, ...metrics });

    assert.equal(metrics.cells, 19);
    assert(
      metrics.visible &&
        metrics.images &&
        metrics.targets &&
        metrics.controlsVisible &&
        !metrics.overflow &&
        !metrics.verticalScroll &&
        metrics.spinCentered &&
        metrics.separated &&
        (width === 844 || metrics.centered) &&
        !metrics.overlap,
      JSON.stringify(results.at(-1)),
    );
    assert.deepEqual(metrics.heights, [3, 4, 5, 4, 3], "exact honeycomb column heights");
    assert(metrics.geometry, "uniform circles, pitches and half-step stagger preserved");
    assert(metrics.symbolCenters, "every asset centered inside its circular frame");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  // A real modal reserves space for its header; container sizing must keep the game inside it.
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator("#root").evaluate((el) => {
    el.style.height = "468px";
  });
  const contained = await page.locator("[data-gs-col]").evaluate((el) =>
    [...el.querySelectorAll("button, [data-ember-formation] > *")].every((child) => {
      const r = child.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= 468;
    }),
  );
  assert(contained, "game fits a shorter modal container");

  await page.locator("#root").evaluate((el) => {
    el.style.height = "100dvh";
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const bet = page.getByRole("button", { name: "Select Bet Amount", exact: true });
  const before = await bet.innerText();
  await page.getByRole("button", { name: "Increase Bet", exact: true }).click();
  assert.notEqual(await bet.innerText(), before);
  await page.getByRole("button", { name: "Decrease Bet", exact: true }).click();
  assert.equal(await bet.innerText(), before);
  const turbo = page.getByRole("button", { name: "Turbo Fast Mode" });
  await turbo.click();
  assert.equal(await turbo.getAttribute("aria-pressed"), "true");
  await turbo.click();
  for (const [name, text] of [
    ["Paytable Info", "PAYTABLE"],
    ["Auto Spin Settings", "AUTO"],
    ["Select Bet Amount", "BET"],
  ]) {
    const count = await page.getByRole("button").count();
    await page.getByRole("button", { name, exact: true }).click();
    await page.waitForTimeout(100);
    assert((await page.locator("body").innerText()).toUpperCase().includes(text));
    assert((await page.getByRole("button").count()) > count, `${name} dialog opened`);
    // Reload between dialog checks so focus and animation cleanup use the actual unmount lifecycle.
    await page.reload();
    await page.waitForSelector("[data-ember-formation]");
  }
  await page.getByRole("button", { name: /Buy Bonus/ }).click();
  await page.waitForTimeout(200);

  assert((await page.locator("body").innerText()).toUpperCase().includes("BUY BONUS"));
  assert.equal(await page.evaluate(() => window.rpcCalls || 0), 0, "opening bonus must not buy");
  await page.reload();
  await page.waitForSelector("[data-ember-formation]");
  const spin = page.getByRole("button", { name: "Spin", exact: true });
  const initial = await spin.boundingBox();
  await spin.click();
  await page.getByRole("button", { name: "Skip spin animation" }).waitFor();
  const active = await page.getByRole("button", { name: "Skip spin animation" }).boundingBox();
  assert.equal(active.y, initial.y);
  assert(await bet.isDisabled());
  assert.equal(await page.evaluate(() => window.rpcCalls), 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".ember-console__spin")
      .evaluate((el) => getComputedStyle(el.querySelector("svg")).animationName),
    "none",
  );
  await page.getByRole("button", { name: "Skip spin animation" }).click();
  const mount = async (props) => {
    await page.evaluate((p) => window.mountDeckState(p), props);
    await page.waitForTimeout(25);
  };
  await mount({});
  for (const [label, event] of [
    ["Decrease Bet", "onDecreaseBet"],
    ["Increase Bet", "onIncreaseBet"],
    ["Select Bet Amount", "onSelectBet"],
    ["Turbo Fast Mode", "onTurbo"],
    ["Auto Spin Settings", "onAuto"],
    ["Paytable Info", "onInfo"],
    ["Spin", "onSpin"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    assert.equal(await page.evaluate((key) => window.calls[key], event), 1, label + " callback");
  }
  await mount({ busy: true });
  assert(await page.getByRole("button", { name: "Increase Bet", exact: true }).isDisabled());
  await page.getByRole("button", { name: "Skip spin animation" }).click();
  assert.equal(await page.evaluate(() => window.calls.onSpin), 1);
  await mount({ autoSpin: true, autoRemaining: 10 });
  assert((await page.getByRole("status").innerText()).includes("10 auto spins left"));
  await page.getByRole("button", { name: "Stop Game" }).click();
  assert.equal(await page.evaluate(() => window.calls.onAuto), 1);
  await mount({
    inFree: true,
    freeSpins: 8,
    freeSpinsProgress: { current: 2, total: 10 },
    freeSpinsPaused: true,
  });
  const freeStatus = await page.getByRole("status").innerText();
  assert(freeStatus.includes("2/10") && freeStatus.includes("paused"));
  await page.getByRole("button", { name: "Free spin", exact: true }).click();
  assert.equal(await page.evaluate(() => window.calls.onSpin), 1);
  await mount({ spinDisabled: true });
  assert(await page.getByRole("button", { name: "Spin", exact: true }).isDisabled());
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    JSON.stringify({
      viewports: results.length,
      controls: true,
      reducedMotion: true,
      rpc: "mocked",
      errors,
    }),
  );
} finally {
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify({ results, errors, rpc: "mocked" }, null, 2),
  );
  await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
