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
const root = process.cwd();
for (const p of [
  "src/components/maxhigh/realms/ReelGrid.tsx",
  "src/components/maxhigh/realms/ReelCell.tsx",
  "src/components/maxhigh/realms/SymbolIcon.tsx",
  "src/games/sirens-lagoon/game.theme.ts",
]) {
  assert.equal(
    fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"),
    execFileSync("git", ["show", `HEAD:${p}`], { encoding: "utf8" }).replace(/\r\n/g, "\n"),
    p + " unchanged",
  );
}
postcss
  .parse(fs.readFileSync("src/games/sirens-lagoon/sirens-console.css", "utf8"))
  .walkRules((rule) => {
    if (rule.parent.type === "atrule" && rule.parent.name === "keyframes") return;
    assert(
      rule.selectors.every(
        (selector) =>
          selector.startsWith(".sirens-console") ||
          selector.startsWith(".sirens-options") ||
          selector.includes('[data-game-view="sirens-lagoon"]'),
      ),
      "CSS stays scoped to Siren's Lagoon",
    );
  });
const out = path.join(root, "output");

const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright");
const auth = `export const useAuth = () => ({user:{id:'ui-fixture',balance:15491},setBalanceLocal:()=>{},refreshJackpot:()=>{}});`;
const api = `import {findRealmsGame,realmsDefaultConfig} from '@/lib/realms';import {createEngineCtx} from '@/components/maxhigh/realms/engine/types';import {initialBoard} from '@/components/maxhigh/realms/engine/gridState';
export const getRealmsEngineConfigFn=async({data})=>realmsDefaultConfig(data.gameId);
export const getRealmsSessionFn=async()=>({sessionId:null,freeSpinsLeft:0});
const spin=async({data})=>{window.rpcCalls=(window.rpcCalls||0)+1;const cfg=realmsDefaultConfig(data.gameId),ctx=createEngineCtx(cfg,findRealmsGame(data.gameId).board);return {session:{sessionId:null,freeSpinsLeft:0,fsSessionWin:0,fsSpinsPlayed:0,inFree:false},script:{initialBoard:initialBoard(ctx),steps:[],totalWin:0,rawWin:0,displayMult:1,scatters:0,scatterPay:0,freeSpinsAwarded:0,retriggerSpins:0,isFreeSpins:false,bombAccumulator:0}};};
export const realmsSpinFn=spin,realmsFreeSpinFn=spin,realmsBuyFeatureFn=spin;`;
const config = "";
fs.writeFileSync(
  path.join(out, "sirens-ui.html"),
  '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/sirens-fixture.css"><link rel="stylesheet" href="/sirens-utilities.css"></head><body><div id="root"></div><script src="/sirens-fixture.js"></script></body></html>',
);
await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{GameView}from'./src/games/sirens-lagoon/GameView';import{SirensConsole}from'./src/games/sirens-lagoon/SirensConsole';
document.body.style.margin='0';document.getElementById('root').style.cssText='height:100dvh;width:100%;';const app=createRoot(document.getElementById('root'));app.render(<GameView/>);
window.mountDeckState=(props)=>{window.calls={};const handler=name=>()=>{window.calls[name]=(window.calls[name]||0)+1;};const actions=Object.fromEntries(['onSpin','onDecreaseBet','onIncreaseBet','onSelectBet','onTurbo','onAuto','onInfo'].map(name=>[name,handler(name)]));app.render(<div data-game-view="sirens-lagoon" style={{height:'100%'}}><SirensConsole gameId="sirens-lagoon" balance={15491} bet={5} win={0} busy={false} turbo={false} autoSpin={false} {...actions} {...props}/></div>);};`,
    resolveDir: root,
    loader: "tsx",
  },
  bundle: true,
  external: ["/images/*"],
  outfile: path.join(out, "sirens-fixture.js"),
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "fixture",
      setup(b) {
        b.onResolve(
          { filter: /^@\/lib\/auth$|^@\/functions\/(realms|api|superadmin)$/ },
          (args) => ({
            path: args.path,
            namespace: "mock",
          }),
        );
        b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
          resolveDir: root,
          contents:
            args.path === "@/lib/auth" ? auth : args.path.endsWith("/realms") ? api : config,
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
fs.writeFileSync(path.join(out, "sirens-utilities.css"), compiler.build(scanner.scan()));
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = decodeURIComponent(url.pathname);
  const file =
    rel.startsWith("/images/") || rel.startsWith("/sounds/")
      ? path.join(root, "public", rel)
      : path.join(out, rel.endsWith("sirens-ui.html") ? "sirens-ui.html" : rel);
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
await new Promise((r) => server.listen(18783, "127.0.0.1", r));
console.log("UI fixture listening");
const browser = await chromium.launch({ headless: true });
console.log("Chromium launched");
const page = await browser.newPage({ hasTouch: true });
console.log("Browser page ready");
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = [];
try {
  // Read-only browser protection: static loopback fixture only, no real API or write requests.
  await page.route("**/*", (route) => {
    const request = route.request(),
      url = new URL(request.url());
    return url.origin === "http://127.0.0.1:18783" && ["GET", "HEAD"].includes(request.method())
      ? route.continue()
      : route.abort();
  });
  // Exactly two initial screenshot profiles: mobile and tablet.
  const profiles = [
    [400, 864, "mobile"],
    [768, 1024, "tablet"],
  ].filter((p) => !process.env.SIRENS_QA_VIEWPORT || p[2] === process.env.SIRENS_QA_VIEWPORT);
  for (const [width, height, label] of profiles) {
    await page.setViewportSize({ width, height });
    await page.goto("http://127.0.0.1:18783/sirens-ui.html");
    await page.waitForSelector("[data-gs-board] > :nth-child(25)");
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    });
    const metrics = await page.evaluate(() => {
      const rect = (el) => el.getBoundingClientRect();
      const board = document.querySelector("[data-gs-board]"),
        cells = [...board.children],
        b = rect(board),
        deck = rect(document.querySelector(".sirens-console"));
      const buttons = [...document.querySelectorAll(".sirens-console button")];
      return {
        cells: cells.length,
        geometry: cells.every((el, i) => {
          const r = rect(el),
            first = rect(cells[0]);
          return (
            Math.abs(r.width - first.width) < 1 &&
            Math.abs(r.height - first.height) < 1 &&
            Math.abs(r.left - first.left - (i % 5) * (rect(cells[1]).left - first.left)) < 1 &&
            Math.abs(r.top - first.top - Math.floor(i / 5) * (rect(cells[5]).top - first.top)) < 1
          );
        }),
        centered: Math.abs(b.left + b.width / 2 - innerWidth / 2) < 1,
        ratio: b.width / b.height,
        visible: cells.every((el) => {
          const r = rect(el);
          return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        }),
        images: cells.every((el) => {
          const img = el.querySelector("img");
          return (
            img?.complete && img.naturalWidth > 0 && getComputedStyle(img).objectFit === "contain"
          );
        }),
        controls: buttons.every((el) => {
          const r = rect(el);
          return (
            r.width >= 44 &&
            r.height >= 44 &&
            r.left >= 0 &&
            r.top >= 0 &&
            r.right <= innerWidth &&
            r.bottom <= innerHeight
          );
        }),
        overlap: buttons.some((a, i) =>
          buttons.slice(i + 1).some((c) => {
            const r = rect(a),
              s = rect(c);
            return (
              Math.min(r.right, s.right) > Math.max(r.left, s.left) + 1 &&
              Math.min(r.bottom, s.bottom) > Math.max(r.top, s.top) + 1
            );
          }),
        ),
        separated: b.bottom <= deck.top,
        scroll:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
      };
    });
    results.push({ width, height, ...metrics });
    await page.screenshot({
      path: path.join(out, `sirens-${label}-${process.env.SIRENS_QA_PASS ?? "initial"}.png`),
    });
  }
  for (const metrics of results) {
    assert.equal(metrics.cells, 25);
    assert(Math.abs(metrics.ratio - 1) < 0.01);
    assert(
      metrics.geometry &&
        metrics.centered &&
        metrics.visible &&
        metrics.images &&
        metrics.controls &&
        metrics.separated &&
        !metrics.overlap &&
        !metrics.scroll,
      JSON.stringify(metrics),
    );
  }
  await page.setViewportSize({ width: 400, height: 864 });
  const bet = page.getByRole("button", { name: "Select Bet Amount", exact: true }),
    initial = await bet.innerText();
  await page.getByRole("button", { name: "Increase Bet", exact: true }).tap();
  assert.notEqual(await bet.innerText(), initial);
  await page.getByRole("button", { name: "Decrease Bet", exact: true }).tap();
  assert.equal(await bet.innerText(), initial);
  const more = page.getByRole("button", { name: "More game settings" });
  await more.tap();
  const turbo = page.getByRole("menuitemcheckbox", { name: /Turbo/ });
  await turbo.tap();
  assert.equal(await turbo.getAttribute("aria-checked"), "true");
  await turbo.tap();
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "More game settings",
  );
  for (const name of ["Paytable Info", "Auto Spin Settings"]) {
    const count = await page.getByRole("button").count();
    await more.click();
    await page.getByRole("menuitem", { name }).click();
    assert((await page.getByRole("button").count()) > count, name + " opens original dialog");
    await page.reload();
    await page.waitForSelector("[data-gs-board]");
  }
  await page.getByRole("button", { name: /Buy Bonus/ }).tap();
  assert((await page.locator("body").innerText()).toUpperCase().includes("BUY BONUS"));
  assert.equal(await page.evaluate(() => window.rpcCalls || 0), 0);
  await page.reload();
  await page.waitForSelector("[data-gs-board]");
  await page.getByRole("button", { name: "Spin", exact: true }).tap();
  const skip = page.getByRole("button", { name: "Skip spin animation" });
  await skip.waitFor();
  assert(await bet.isDisabled());
  assert.equal(await page.evaluate(() => window.rpcCalls), 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await skip.evaluate((el) => getComputedStyle(el.querySelector("svg")).animationName),
    "none",
  );
  await skip.click();
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    JSON.stringify({
      targets: results.map((r) => `${r.width}x${r.height}`),
      geometry: "5x5 unchanged",
      controls: true,
      buyBonus: true,
      errors,
    }),
  );
} finally {
  fs.writeFileSync(
    path.join(out, "sirens-ui-results.json"),
    JSON.stringify({ results, errors, rpc: "mocked" }, null, 2),
  );
  await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
