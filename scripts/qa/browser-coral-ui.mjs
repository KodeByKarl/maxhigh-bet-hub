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

const root = process.cwd();
const out = path.join(root, "output/coral-cobra-ui");
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright");
const auth = `export const useAuth = () => ({user:{id:'ui-fixture',balance:15491},setBalanceLocal:()=>{},refreshJackpot:()=>{}});`;
const api = `export const getCoralCobraSessionFn=async()=>({sessionId:null,freeSpinsLeft:0});
import { initialBoard } from '@/components/maxhigh/coral-cobra/gridState';
const spin=async()=>{window.rpcCalls=(window.rpcCalls||0)+1;return {session:{sessionId:null,freeSpinsLeft:0,fsSessionWin:0,fsSpinsPlayed:0,inFree:false},script:{initialBoard:initialBoard(),steps:[],totalWin:0,rawWin:0,displayMult:1,scatters:0,scatterPay:0,freeSpinsAwarded:0,retriggerSpins:0,isFreeSpins:false,bombAccumulator:0}};};
export const coralCobraSpinFn=spin,coralCobraFreeSpinFn=spin,coralCobraBuyFeatureFn=spin;`;
const config = `export const getCoralCobraEngineConfigFn=async()=>{throw new Error('UI fixture: use existing defaults');};`;
fs.writeFileSync(
  path.join(out, "index.html"),
  '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><link rel="stylesheet" href="/utilities.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
);
await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{GameView}from'./src/games/coral-cobra/GameView';document.body.style.margin='0';document.getElementById('root').style.cssText='height:100dvh;width:100%;';createRoot(document.getElementById('root')).render(<GameView/>);`,
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
await new Promise((r) => server.listen(18771, "127.0.0.1", r));
console.log("UI fixture listening");
const browser = await chromium.launch({ headless: true });
console.log("Chromium launched");
const page = await browser.newPage();
console.log("Browser page ready");
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = [];
try {
  await page.goto("http://127.0.0.1:18771/output/coral-cobra-ui/index.html");
  console.log("Fixture loaded");
  await page.waitForSelector("[data-gs-board] > :nth-child(25)");
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [375, 667],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1024, 768],
    [1366, 768],
    [568, 320],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    const metrics = await page.evaluate(() => {
      const board = document.querySelector("[data-gs-board]");
      const cells = [...board.children];
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      };
      const buttons = [...document.querySelectorAll(".slot-deck button")];
      const b = rect(board);
      const deck = rect(document.querySelector(".slot-deck"));
      return {
        cells: cells.length,
        board: b,
        deck,
        overflow: document.documentElement.scrollWidth > innerWidth,
        visible: cells.every((el) => {
          const r = rect(el);
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
        panel: getComputedStyle(document.querySelector(".slot-deck")).backgroundColor,
      };
    });
    results.push({ width, height, ...metrics });
    await page.screenshot({ path: path.join(out, `${width}x${height}.png`) });
    assert.equal(metrics.cells, 25);
    assert(
      metrics.visible &&
        metrics.images &&
        metrics.targets &&
        metrics.controlsVisible &&
        !metrics.overflow &&
        !metrics.overlap,
      JSON.stringify(results.at(-1)),
    );
    assert(Math.abs(metrics.board.w - metrics.board.h) < 1, "square board");
    assert.equal(metrics.panel, "rgba(0, 0, 0, 0)");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  // A real modal reserves space for its header; container sizing must keep the game inside it.
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator("#root").evaluate((el) => {
    el.style.height = "468px";
  });
  const contained = await page.locator("[data-gs-col]").evaluate((el) =>
    [...el.querySelectorAll("button, [data-gs-board] > *")].every((child) => {
      const r = child.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= 468;
    }),
  );
  assert(contained, "game fits a shorter modal container");
  await page.screenshot({ path: path.join(out, "320x568-modal.png") });
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
    await page.waitForSelector("[data-gs-board]");
  }
  await page.getByRole("button", { name: /Buy bonus/ }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, "buy-bonus.png") });
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
    await page.locator(".slot-deck__spin").evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
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
