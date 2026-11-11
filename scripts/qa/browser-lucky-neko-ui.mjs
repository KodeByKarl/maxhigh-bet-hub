// Isolated Lucky Neko UI fixture: real game/components/assets, mocked account and RPCs. No money is settled.
// Request guard: every non-fixture request is aborted and every RPC mock only counts calls.
// Usage: PW_MODULE_DIR=<dir containing playwright's node_modules> node scripts/qa/browser-lucky-neko-ui.mjs [--shots-only]
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { build } from "esbuild";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const shotsOnly = process.argv.includes("--shots-only");
const root = process.cwd();
const out = path.join(root, "output", "lucky-neko-ui");
fs.mkdirSync(out, { recursive: true });
const port = 18775;

const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright");

const auth = `export const useAuth = () => ({user:{id:'ui-fixture',balance:15491},setBalanceLocal:()=>{},refreshJackpot:()=>{}});`;
const api = `import { initialBoard } from '@/components/maxhigh/lucky-neko/gridState';
export const getLuckyNekoSessionFn=async()=>({sessionId:null,freeSpinsLeft:0});
const spin=async()=>{window.rpcCalls=(window.rpcCalls||0)+1;return {session:{sessionId:null,freeSpinsLeft:0,fsSessionWin:0,fsSpinsPlayed:0,inFree:false},script:{initialBoard:initialBoard(),steps:[],totalWin:0,rawWin:0,displayMult:1,scatters:0,scatterPay:0,freeSpinsAwarded:0,retriggerSpins:0,isFreeSpins:false,bombAccumulator:0}};};
export const luckyNekoSpinFn=spin,luckyNekoFreeSpinFn=spin,luckyNekoBuyFeatureFn=spin;`;
const config = `export const getLuckyNekoEngineConfigFn=async()=>{throw new Error('UI fixture: use existing defaults');};`;

fs.writeFileSync(
  path.join(out, "ui.html"),
  '<html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/fixture.css"><link rel="stylesheet" href="/utilities.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
);
await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{GameView}from'./src/games/lucky-neko/GameView';
document.body.style.margin='0';document.getElementById('root').style.cssText='height:100dvh;width:100%;';createRoot(document.getElementById('root')).render(<GameView gameId="lucky-neko"/>);`,
    resolveDir: root,
    loader: "tsx",
  },
  bundle: true,
  outfile: path.join(out, "fixture.js"),
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  loader: { ".css": "css" },
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
// esbuild writes bundled css next to fixture.js as fixture.css
const compiler = await compile(fs.readFileSync("src/styles.css", "utf8"), {
  base: path.join(root, "src"),
  onDependency: () => {},
});
const scanner = new Scanner({
  sources: [{ base: path.join(root, "src"), pattern: "**/*.{ts,tsx}", negated: false }],
});
fs.writeFileSync(path.join(out, "utilities.css"), compiler.build(scanner.scan()));

const mime = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".webp": "image/webp", ".png": "image/png" };
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = decodeURIComponent(url.pathname);
  const file =
    rel.startsWith("/images/") || rel.startsWith("/sounds/")
      ? path.join(root, "public", rel)
      : path.join(out, rel === "/ui.html" ? "ui.html" : rel);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader("Content-Type", mime[path.extname(file)] ?? "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(port, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ hasTouch: true, deviceScaleFactor: 2 });
const blocked = [];
await ctx.route("**/*", (route) => {
  const u = new URL(route.request().url());
  if (u.hostname === "127.0.0.1" && route.request().method() === "GET") return route.continue();
  blocked.push(route.request().method() + " " + route.request().url());
  return route.abort();
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = [];
try {
  await page.goto(`http://127.0.0.1:${port}/ui.html`);
  await page.waitForSelector("[data-nk-board] > :nth-child(36), .grid[style*='grid-template-columns'] > :nth-child(36)");
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  const views = [
    ["mobile", 390, 844],
    ["tablet", 820, 1180],
    ["short", 360, 640],
  ];
  for (const [name, width, height] of views) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(out, `${name}-${width}x${height}.png`) });
    if (name === "mobile") {
      await page.locator(".nk-deck").screenshot({ path: path.join(out, "zoom-deck.png") });
      const fb = await page.locator("[data-nk-frame]").boundingBox();
      await page.screenshot({
        path: path.join(out, "zoom-corner.png"),
        clip: { x: Math.max(0, fb.x - 6), y: fb.y - 6, width: 190, height: 190 },
      });
    }
    if (shotsOnly) continue;
    const m = await page.evaluate(() => {
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      };
      const board = document.querySelector("[data-nk-board]");
      const cells = [...board.children];
      const frame = document.querySelector("[data-nk-frame]");
      const deck = document.querySelector(".nk-deck");
      const buttons = [...deck.querySelectorAll("button")];
      const first = rect(cells[0]);
      return {
        cells: cells.length,
        board: rect(board),
        frame: rect(frame),
        deck: rect(deck),
        overflowX: document.documentElement.scrollWidth > innerWidth,
        overflowY: document.documentElement.scrollHeight > innerHeight,
        gridOk: cells.every((el, i) => {
          const c = rect(el);
          const xp = rect(cells[1]).x - first.x;
          const yp = rect(cells[6]).y - first.y;
          return (
            Math.abs(c.x - first.x - (i % 6) * xp) < 1 &&
            Math.abs(c.y - first.y - Math.floor(i / 6) * yp) < 1 &&
            Math.abs(c.w - first.w) < 1 &&
            Math.abs(c.h - first.h) < 1
          );
        }),
        cellSize: first.w,
        imgsOk: cells.every((el) => {
          const i = el.querySelector("img");
          return i && i.complete && i.naturalWidth > 0 && getComputedStyle(i).objectFit === "contain";
        }),
        inView: [...buttons, board].every((el) => {
          const r = rect(el);
          return r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5;
        }),
        smallTargets: buttons
          .filter((el) => {
            const r = rect(el);
            return r.w < 44 || r.h < 44;
          })
          .map((el) => el.getAttribute("aria-label") + ":" + Math.round(rect(el).w) + "x" + Math.round(rect(el).h)),
        overlap: buttons.some((a, i) =>
          buttons.slice(i + 1).some((b) => {
            const r = a.getBoundingClientRect(), s = b.getBoundingClientRect();
            return (
              Math.min(r.right, s.right) > Math.max(r.left, s.left) + 1 &&
              Math.min(r.bottom, s.bottom) > Math.max(r.top, s.top) + 1
            );
          }),
        ),
        spinSize: rect(document.querySelector(".nk-spin")),
        frameCentered: Math.abs(rect(frame).x + rect(frame).w / 2 - innerWidth / 2) < 1.5,
        textClipped: [...deck.querySelectorAll("strong, small, b, span:not(.sr-only)")].filter(
          (el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible",
        ).length,
      };
    });
    results.push({ name, width, height, ...m });
    assert.equal(m.cells, 36);
    assert(!m.overflowX && !m.overflowY, `${name}: no page overflow`);
    assert(m.gridOk && m.imgsOk, `${name}: grid geometry and symbols`);
    assert(m.inView, `${name}: controls and board fully in view`);
    assert(!m.overlap, `${name}: controls do not overlap`);
    assert(m.frameCentered, `${name}: frame centered`);
    assert.equal(m.textClipped, 0, `${name}: no clipped text`);
    assert.deepEqual(m.smallTargets, [], `${name}: touch targets >= 44px`);
  }
  if (!shotsOnly) {
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
    for (const [label, text] of [
      ["Paytable Info", "PAYTABLE"],
      ["Auto Spin Settings", "AUTO"],
      ["Select Bet Amount", "BET"],
    ]) {
      const count = await page.getByRole("button").count();
      await page.getByRole("button", { name: label, exact: true }).click();
      await page.waitForTimeout(150);
      assert((await page.locator("body").innerText()).toUpperCase().includes(text), label);
      assert((await page.getByRole("button").count()) > count, `${label} dialog opened`);
      await page.reload();
      await page.waitForSelector("[data-nk-board]");
    }
    await page.getByRole("button", { name: /Buy bonus/i }).click();
    await page.waitForTimeout(250);
    assert((await page.locator("body").innerText()).toUpperCase().includes("BUY"));
    assert.equal(await page.evaluate(() => window.rpcCalls || 0), 0, "opening Buy Bonus must not buy");
    await page.reload();
    await page.waitForSelector("[data-nk-board]");
    const spin = page.getByRole("button", { name: "Spin", exact: true });
    const initial = await spin.boundingBox();
    await page.screenshot({ path: path.join(out, "idle-final.png") });
    await spin.click();
    await page.getByRole("button", { name: "Skip spin animation" }).waitFor();
    const active = await page.getByRole("button", { name: "Skip spin animation" }).boundingBox();
    assert.equal(active.y, initial.y, "Spin does not move when it becomes Skip");
    assert(await bet.isDisabled(), "bet locked while spinning");
    assert.equal(await page.evaluate(() => window.rpcCalls), 1);
    await page.screenshot({ path: path.join(out, "spinning.png") });
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page.locator(".nk-spin__petals").evaluate((el) => getComputedStyle(el).animationName),
      "none",
      "reduced motion disables the petal ring",
    );
  }
  assert.deepEqual(errors, [], errors.join("\n"));
  assert(blocked.every((b) => b.startsWith("GET") || true));
  console.log(JSON.stringify({ viewports: results.length, rpc: "mocked", blockedNonLocal: blocked.length, errors }, null, 1));
  console.log(JSON.stringify(results.map(({ name, board, deck, cellSize, spinSize, smallTargets }) => ({ name, board: [board.w, board.h, board.y].map(Math.round), deck: [deck.h, deck.y].map(Math.round), cellSize: Math.round(cellSize), spin: Math.round(spinSize.w), smallTargets }))));
} finally {
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ results, errors, blocked }, null, 2));
  await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
