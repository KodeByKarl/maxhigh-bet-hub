// Isolated UI fixture: real Prosperity Lion game/components/assets, mocked account and RPCs. No money is settled.
// PW_MODULE_DIR points to the node_modules directory that contains the playwright package.
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

const git = (p) =>
  execFileSync("git", ["show", `HEAD:${p}`], { encoding: "utf8" }).replace(/\r\n/g, "\n");
for (const file of [
  "types.ts",
  "ReelGrid.tsx",
  "ReelCell.tsx",
  "PantherIcon.tsx",
  "gridState.ts",
  "theme.ts",
]) {
  const p = `src/components/maxhigh/prosperity-lion/${file}`;
  assert.equal(fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"), git(p), p + " unchanged");
}
const root = process.cwd();
const slotFile = "src/components/maxhigh/ProsperityLionSlot.tsx";
const stripDeckImport = (s) =>
  s.replace(/^import .*SlotControlDeck.*;\r?\n/m, "").replace(/\r\n/g, "\n");
assert.equal(
  stripDeckImport(fs.readFileSync(slotFile, "utf8")),
  stripDeckImport(git(slotFile)),
  "gameplay handlers and math unchanged",
);
postcss
  .parse(fs.readFileSync("src/games/prosperity-lion/lion-layout.css", "utf8"))
  .walkRules((rule) => {
    if (rule.parent.type === "atrule" && rule.parent.name === "keyframes") return;
    assert(
      rule.selectors.every((s) => s.includes('[data-game-view="prosperity-lion"]')),
      "CSS stays scoped to Prosperity Lion: " + rule.selector,
    );
  });
const out = path.join(root, "output");
fs.mkdirSync(out, { recursive: true });

const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright");
const auth = `export const useAuth = () => ({user:{id:'ui-fixture',balance:15491},setBalanceLocal:()=>{},refreshJackpot:()=>{}});`;
const api = `export const getProsperityLionSessionFn=async()=>({sessionId:null,freeSpinsLeft:0});
import { initialBoard } from '@/components/maxhigh/prosperity-lion/gridState';
const spin=async()=>{window.rpcCalls=(window.rpcCalls||0)+1;return {session:{sessionId:null,freeSpinsLeft:0,fsSessionWin:0,fsSpinsPlayed:0,inFree:false},script:{initialBoard:initialBoard(),steps:[],totalWin:0,rawWin:0,displayMult:1,scatters:0,scatterPay:0,freeSpinsAwarded:0,retriggerSpins:0,isFreeSpins:false,bombAccumulator:0}};};
export const prosperityLionSpinFn=spin,prosperityLionFreeSpinFn=spin,prosperityLionBuyFeatureFn=spin;`;
const config = `export const getProsperityLionEngineConfigFn=async()=>{throw new Error('UI fixture: use existing defaults');};`;
fs.writeFileSync(
  path.join(out, "lion-ui.html"),
  '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/lion-fixture.css"><link rel="stylesheet" href="/lion-utilities.css"></head><body><div id="root"></div><script src="/lion-fixture.js"></script></body></html>',
);
await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{GameView}from'./src/games/prosperity-lion/GameView';import{LionAltar}from'./src/components/maxhigh/prosperity-lion/LionAltar';
document.body.style.margin='0';document.getElementById('root').style.cssText='height:100dvh;width:100%;';const app=createRoot(document.getElementById('root'));app.render(<GameView/>);
window.mountDeckState=(props)=>{window.calls={};const handler=name=>()=>{window.calls[name]=(window.calls[name]||0)+1;};const actions=Object.fromEntries(['onSpin','onDecreaseBet','onIncreaseBet','onSelectBet','onTurbo','onAuto','onInfo'].map(name=>[name,handler(name)]));app.render(<div data-game-view="prosperity-lion" style={{height:'100%'}}><LionAltar gameId="prosperity-lion" balance={15491} bet={5} win={0} busy={false} turbo={false} autoSpin={false} {...actions} {...props}/></div>);};`,
    resolveDir: root,
    loader: "tsx",
  },
  bundle: true,
  outfile: path.join(out, "lion-fixture.js"),
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
fs.writeFileSync(path.join(out, "lion-utilities.css"), compiler.build(scanner.scan()));
const MIME = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".webp": "image/webp",
  ".png": "image/png",
};
const server = createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file =
    rel.startsWith("/images/") || rel.startsWith("/sounds/")
      ? path.join(root, "public", rel)
      : path.join(out, rel.endsWith("lion-ui.html") ? "lion-ui.html" : rel);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader("Content-Type", MIME[path.extname(file)] ?? "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(18775, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PW_CHROME || undefined,
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = [];
try {
  await page.goto("http://127.0.0.1:18775/lion-ui.html");
  await page.waitForSelector("[data-gs-board] > :nth-child(12)");
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  // Symbol padding audit: alpha bounding box of every symbol image.
  const padding = await page.evaluate(async () => {
    const res = {};
    const srcs = new Set([...document.querySelectorAll("[data-gs-board] img")].map((i) => i.src));
    for (const src of srcs) {
      const im = new Image();
      im.src = src;
      await im.decode();
      const c = document.createElement("canvas");
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const g = c.getContext("2d");
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width,
        y0 = c.height,
        x1 = 0,
        y1 = 0;
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++)
          if (d[(y * c.width + x) * 4 + 3] > 24) {
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
          }
      res[src.split("/").pop().split("?")[0]] = {
        size: c.width + "x" + c.height,
        artW: +((x1 - x0 + 1) / c.width).toFixed(2),
        artH: +((y1 - y0 + 1) / c.height).toFixed(2),
        offX: +((x0 + x1) / 2 / c.width - 0.5).toFixed(3),
        offY: +((y0 + y1) / 2 / c.height - 0.5).toFixed(3),
      };
    }
    return res;
  });
  console.log("symbol padding", JSON.stringify(padding));
  for (const [width, height] of [
    [400, 864],
    [768, 1024],
    [360, 640],
    [1366, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      };
      const board = document.querySelector("[data-gs-board]");
      const cells = [...board.children];
      const b = rect(board),
        first = rect(cells[0]),
        deck = rect(document.querySelector(".lion-altar")),
        well = rect(document.querySelector("[data-gs-well]"));
      const xP = rect(cells[1]).x - first.x,
        yP = rect(cells[4]).y - first.y;
      const buttons = [...document.querySelectorAll(".lion-altar button")];
      const imgFill = cells.map((el) => rect(el.querySelector("img")).w / rect(el).w);
      return {
        cells: cells.length,
        board: b,
        well,
        deck,
        geometry: cells.every((el, i) => {
          const c = rect(el);
          return (
            Math.abs(c.x - first.x - (i % 4) * xP) < 1 &&
            Math.abs(c.y - first.y - Math.floor(i / 4) * yP) < 1 &&
            Math.abs(c.w - c.h) < 1 &&
            getComputedStyle(el).borderRadius.includes("50%")
          );
        }),
        centered: Math.abs(b.x + b.w / 2 - innerWidth / 2) < 1,
        imgBox: [Math.min(...imgFill), Math.max(...imgFill)],
        cellSize: first.w,
        assetsCentered: cells.every((el) => {
          const c = rect(el),
            i = rect(el.querySelector("img"));
          return (
            Math.abs(c.x + c.w / 2 - i.x - i.w / 2) < 1 &&
            Math.abs(c.y + c.h / 2 - i.y - i.h / 2) < 1
          );
        }),
        overflow: document.documentElement.scrollWidth > innerWidth,
        groupTop: well.y,
        groupBottom: innerHeight - deck.bottom,
        targets: buttons.every((el) => {
          const r = rect(el);
          return r.w >= 44 && r.h >= 44;
        }),
        inView: buttons.every((el) => {
          const r = rect(el);
          return r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        }),
        overlap: buttons.some((a, i) =>
          buttons.slice(i + 1).some((c) => {
            const r = a.getBoundingClientRect(),
              s = c.getBoundingClientRect();
            return (
              Math.min(r.right, s.right) > Math.max(r.left, s.left) + 1 &&
              Math.min(r.bottom, s.bottom) > Math.max(r.top, s.top) + 1
            );
          }),
        ),
        separated: b.bottom <= deck.y,
        spinCentered: (() => {
          const r = rect(document.querySelector(".lion-altar__seal")),
            f = rect(document.querySelector(".lion-altar__face"));
          return (
            Math.abs(f.x + f.w / 2 - r.x - r.w / 2) < 1 &&
            Math.abs(f.y + f.h / 2 - r.y - r.h / 2) < 1
          );
        })(),
      };
    });
    results.push({ width, height, ...m });
    console.log(
      width + "x" + height,
      JSON.stringify({
        cell: Math.round(m.cellSize),
        board: [Math.round(m.board.w), Math.round(m.board.h)],
        top: Math.round(m.groupTop),
        bottom: Math.round(m.groupBottom),
        deckH: Math.round(m.deck.h),
        img: m.imgBox.map((v) => +v.toFixed(2)),
      }),
    );
    if (width === 400 || width === 768)
      await page.screenshot({ path: path.join(out, `lion-${width}.png`) });
    assert.equal(m.cells, 12);
    assert(
      m.geometry &&
        m.assetsCentered &&
        m.targets &&
        m.inView &&
        !m.overflow &&
        m.spinCentered &&
        m.separated &&
        !m.overlap &&
        (width !== 400 || m.centered),
      JSON.stringify(results.at(-1)),
    );
    assert(Math.abs(m.board.w / m.board.h - 4 / 3) < 0.02, "4 by 3 board");
  }
  await page.setViewportSize({ width: 400, height: 864 });
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
    await page.waitForTimeout(150);
    assert((await page.locator("body").innerText()).toUpperCase().includes(text));
    assert((await page.getByRole("button").count()) > count, `${name} dialog opened`);
    await page.reload();
    await page.waitForSelector("[data-gs-board]");
  }
  await page.getByRole("button", { name: /Buy Bonus/ }).click();
  await page.waitForTimeout(250);
  assert((await page.locator("body").innerText()).toUpperCase().includes("BUY BONUS"));
  assert.equal(await page.evaluate(() => window.rpcCalls || 0), 0, "opening bonus must not buy");
  await page.reload();
  await page.waitForSelector("[data-gs-board]");
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
      .locator(".lion-altar__seal .lion-altar__jade")
      .evaluate((el) => getComputedStyle(el).animationName),
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
    assert.equal(await page.evaluate((k) => window.calls[k], event), 1, label + " callback");
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
    path.join(out, "lion-ui-results.json"),
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
