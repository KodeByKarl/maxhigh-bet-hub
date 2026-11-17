// Real GameViews and Realms engine, synthetic RPC boundary, local assets only.
// This is UI/handler regression evidence, not a live wallet/RNG certification.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { build } from "esbuild";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const root = process.cwd();
const source = path.resolve(process.argv[2] ?? root);
const out = path.join(root, "output/spin-buttons/browser");
fs.mkdirSync(out, { recursive: true });
const snapshot = path.join(out, "snapshot");
fs.cpSync(path.join(source, "src"), path.join(snapshot, "src"), { recursive: true });
// Overlay only Codex's three presentation files into the immutable UI snapshot.
for (const file of [
  "src/games/shared/layouts/SkinnedGame.tsx",
  "src/components/maxhigh/spin-button/game-spin-themes.ts",
  "src/components/maxhigh/spin-button/game-spin-button.css",
]) {
  fs.mkdirSync(path.dirname(path.join(snapshot, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(snapshot, file));
}
const inventory = JSON.parse(fs.readFileSync("docs/CODEX_SPIN_INVENTORY.json", "utf8"));
const games = inventory.games.filter(
  (g) =>
    g.active &&
    g.category === "slot" &&
    (!process.env.SPIN_QA_GAME || g.slug === process.env.SPIN_QA_GAME),
);
const auth = `import {useSyncExternalStore} from 'react'; const listeners=new Set();let balance=25000;export const useAuth=()=>{const value=useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>balance);return{user:{id:'local-ui-fixture',balance:value},setBalanceLocal:v=>{balance=v;listeners.forEach(fn=>fn())},refreshJackpot:async()=>{}}};`;
const rpc = `import{realmsDefaultConfig,findRealmsGame}from'@/lib/realms';import{initialBoard}from'@/components/maxhigh/realms/engine/gridState';import{createEngineCtx}from'@/components/maxhigh/realms/engine/types';
let sequence=0,active=0,wallet=25000;window.__spinQA={calls:[],maxConcurrent:0};const q=window.__spinQA;const empty=()=>({sessionId:null,freeSpinsLeft:0,fsSessionWin:0,fsSpinsPlayed:0,inFree:false,bet:5,ante:false});
export const getRealmsEngineConfigFn=async({data})=>realmsDefaultConfig(data.gameId);
export const getRealmsSessionFn=async()=>{await new Promise(r=>setTimeout(r,650));return empty()};
async function spin({data}){q.calls.push({...data});active++;q.maxConcurrent=Math.max(q.maxConcurrent,active);await new Promise(r=>setTimeout(r,300));active--;wallet-=data.bet;const cfg=realmsDefaultConfig(data.gameId),def=findRealmsGame(data.gameId);return{script:{initialBoard:initialBoard(createEngineCtx(cfg,def.board,()=>((++sequence*.61803398875)%1))),steps:[],totalWin:0,rawWin:0,displayMult:1,scatters:0,scatterPay:0,freeSpinsAwarded:0,retriggerSpins:0,isFreeSpins:false,bombAccumulator:0},balance:wallet,session:empty()}};
export const realmsSpinFn=spin;export const realmsFreeSpinFn=()=>{throw Error('Free spin outside this fixture')};export const realmsBuyFeatureFn=()=>{throw Error('Buy outside this fixture')};`;
const entry = `import React from'react';import{createRoot}from'react-dom/client';${games.map((g, i) => `import{GameView as G${i}}from'./src/games/${g.slug}/GameView';`).join("")}
const views={${games.map((g, i) => `${JSON.stringify(g.slug)}:G${i}`).join(",")}};const id=new URLSearchParams(location.search).get('game')??${JSON.stringify(games[0].slug)};const View=views[id];createRoot(document.getElementById('root')).render(<div data-game-modal={id} role="dialog" aria-label="Local game fixture" className="fixed inset-0 flex flex-col overflow-hidden"><div style={{height:'100%',minHeight:0}}><View/></div></div>);`;
const buildResult = await build({
  stdin: { contents: entry, resolveDir: snapshot, loader: "tsx" },
  bundle: true,
  outfile: path.join(out, "fixture.js"),
  jsx: "automatic",
  metafile: true,
  define: { "process.env.NODE_ENV": '"development"' },
  tsconfigRaw: { compilerOptions: { baseUrl: snapshot, paths: { "@/*": ["src/*"] } } },
  plugins: [
    {
      name: "synthetic-rpc-only",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/auth$|^@\/functions\/realms$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents: a.path.endsWith("/auth") ? auth : rpc,
          resolveDir: snapshot,
          loader: "js",
        }));
      },
    },
  ],
});
fs.writeFileSync(
  path.join(out, "build-inputs.json"),
  JSON.stringify(Object.keys(buildResult.metafile.inputs), null, 2),
);
const compiler = await compile(fs.readFileSync(path.join(snapshot, "src/styles.css"), "utf8"), {
  base: path.join(snapshot, "src"),
  onDependency: () => {},
});
const scanner = new Scanner({
  sources: [{ base: path.join(snapshot, "src"), pattern: "**/*.{ts,tsx}", negated: false }],
});
fs.writeFileSync(
  path.join(out, "utilities.css"),
  compiler.build([...scanner.scan(), "fixed", "inset-0", "flex", "flex-col", "overflow-hidden"]),
);
fs.writeFileSync(
  path.join(out, "index.html"),
  '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><link rel="stylesheet" href="/utilities.css"><style>html,body,#root{margin:0;width:100%;height:100%;background:#101018}body{font-family:Arial,sans-serif}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
);
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
  const asset = /^\/(images|sounds|games)\//.test(pathname);
  const base = asset ? path.join(source, "public") : out;
  const file = path.resolve(base, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".webp": "image/webp",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
    }[path.extname(file)] ?? "application/octet-stream",
  );
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(18149, "127.0.0.1", r));
const playwrightPath =
  process.env.PLAYWRIGHT_MODULE ??
  "D:/Porjects/maxhigh-bet-hub/output/production-browser-tools/node_modules/playwright/index.mjs";
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const browser = await chromium.launch({ headless: true });
const report = {
  source,
  fixture: "Actual GameViews + actual Realms engine; synthetic zero-win RPC, no database writes",
  viewports: [
    [360, 800],
    [390, 844],
    [412, 915],
    [844, 390],
    [768, 1024],
    [1366, 768],
  ],
  games: [],
};
const spinSelector = 'button.slot-deck__spin,button[class$="-spin"]';
async function geometry(page) {
  return page.locator(spinSelector).evaluate((b) => {
    const r = b.getBoundingClientRect(),
      css = getComputedStyle(b),
      before = getComputedStyle(b, "::before"),
      after = getComputedStyle(b, "::after");
    const hiddenBy = [];
    for (const p of [
      [0.5, 0.5],
      [0.25, 0.5],
      [0.75, 0.5],
      [0.5, 0.75],
    ]) {
      const hit = document.elementFromPoint(r.x + r.width * p[0], r.y + r.height * p[1]);
      if (!b.contains(hit)) hiddenBy.push(p);
    }
    const overlaps = [...document.querySelectorAll("[data-slot-deck] button")]
      .filter((e) => e !== b && e.getBoundingClientRect().width > 0)
      .filter((e) => {
        const o = e.getBoundingClientRect();
        return (
          Math.min(o.right, r.right) - Math.max(o.x, r.x) > 1 &&
          Math.min(o.bottom, r.bottom) - Math.max(o.y, r.y) > 1
        );
      })
      .map((e) => e.getAttribute("aria-label") ?? e.textContent);
    return {
      rect: { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom },
      hiddenBy,
      overlaps,
      frame: css.backgroundImage,
      crest: after.backgroundImage,
      color: css.color,
      disabled: b.disabled,
      label: b.getAttribute("aria-label"),
      theme: b.closest("[data-spin-treatment]")?.getAttribute("data-spin-treatment"),
      animation: before.animationName,
    };
  });
}
const previous =
  process.env.SPIN_QA_RESUME && fs.existsSync(path.join(out, "report.json"))
    ? JSON.parse(fs.readFileSync(path.join(out, "report.json"), "utf8")).games.filter(
        (g) => g.status === "VERIFIED",
      )
    : [];
report.games.push(...previous);
const completed = new Set(previous.map((g) => g.slug));
async function verifyGame(g, index) {
  const result = { slug: g.slug, name: g.name, layouts: [], checks: {}, errors: [] };
  report.games.push(result);
  try {
    for (const [width, height] of report.viewports) {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: width < 900,
        serviceWorkers: "block",
      });
      await context.route("**/*", (r) =>
        r.request().url().startsWith("http://127.0.0.1:18149/") &&
        ["GET", "HEAD"].includes(r.request().method())
          ? r.continue()
          : r.abort(),
      );
      const page = await context.newPage();
      page.setDefaultTimeout(9000);
      page.on("pageerror", (e) => result.errors.push(e.message));
      page.on("console", (e) => {
        if (e.type() === "error") console.log("BROWSER", e.text().slice(0, 400));
      });
      try {
        await page.goto(`http://127.0.0.1:18149/?game=${g.slug}`);
        await page.locator(spinSelector).waitFor();
        if (width === 390) {
          result.checks.loadingDisabled = await page.locator(spinSelector).isDisabled();
        }
        await page.waitForFunction(
          (selector) => !document.querySelector(selector)?.disabled,
          spinSelector,
        );
        await page.waitForTimeout(180);
        const geo = await geometry(page);
        geo.viewport = [width, height];
        geo.pass =
          geo.rect.w >= 44 &&
          geo.rect.h >= 44 &&
          geo.rect.x >= -1 &&
          geo.rect.y >= -1 &&
          geo.rect.right <= width + 1 &&
          geo.rect.bottom <= height + 1 &&
          geo.hiddenBy.length === 0 &&
          geo.overlaps.length === 0 &&
          geo.theme &&
          geo.frame.includes("data:image/svg+xml") &&
          geo.crest.includes(g.slug);
        result.layouts.push(geo);
        await page.screenshot({ path: path.join(out, `${g.slug}-${width}x${height}.png`) });
        if (width === 390) {
          await page
            .locator(spinSelector)
            .screenshot({ path: path.join(out, `${g.slug}-button.png`) });
          await page.locator(spinSelector).focus();
          result.checks.keyboardFocus = await page
            .locator(spinSelector)
            .evaluate(
              (b) => b === document.activeElement && getComputedStyle(b).outlineStyle !== "none",
            );
          await page.keyboard.press("Enter");
          await page.waitForFunction(() => window.__spinQA.calls.length === 1);
          result.checks.keyboardSingleAction = await page.evaluate(
            () => window.__spinQA.calls.length === 1,
          );
          await page.waitForFunction(
            () => document.querySelector("[data-slot-deck]").dataset.busy === "true",
          );
          await page.waitForFunction(
            () => document.querySelector("[data-slot-deck]").dataset.busy === "false",
          );
          await page.locator(spinSelector).tap();
          await page.waitForFunction(() => window.__spinQA.calls.length === 2);
          await page.waitForFunction(
            () => document.querySelector("[data-slot-deck]").dataset.busy === "true",
          );
          result.checks.touchSingleAction = true;
          const busy = await geometry(page);
          result.checks.busyLabel = /skip|spinning/i.test(busy.label);
          await page.screenshot({ path: path.join(out, `${g.slug}-busy.png`) });
          await page.waitForFunction(
            () => document.querySelector("[data-slot-deck]").dataset.busy === "false",
          );
          await page.locator(spinSelector).evaluate((b) => {
            b.click();
            b.click();
          });
          await page.waitForFunction(() => window.__spinQA.calls.length >= 3);
          result.checks.rapidDoubleSingleAction = await page.evaluate(
            () => window.__spinQA.calls.length === 3 && window.__spinQA.maxConcurrent === 1,
          );
          await page.waitForFunction(
            () => document.querySelector("[data-slot-deck]").dataset.busy === "true",
          );
          await page.waitForFunction(
            () => document.querySelector("[data-slot-deck]").dataset.busy === "false",
          );
          const openSettings = async () => {
            const turbo = page.getByRole("button", { name: "Turbo Fast Mode", exact: true });
            if (!(await turbo.isVisible())) {
              await page.getByRole("button", { name: "Game settings", exact: true }).click();
            }
          };
          await openSettings();
          const turbo = page.getByRole("button", { name: "Turbo Fast Mode", exact: true });
          await turbo.click();
          result.checks.turbo = await page.evaluate(
            () =>
              !!document.querySelector(
                '[aria-label="Turbo Fast Mode"][aria-pressed="true"], [data-slot-deck] [data-turbo="on"]',
              ),
          );
          // Settings popovers may close after selecting Turbo.
          let auto = page.getByRole("button", { name: "Auto Spin Settings", exact: true });
          if (!(await auto.isVisible())) {
            await page.getByRole("button", { name: "Game settings", exact: true }).click();
          }
          await auto.click();
          const modal = page.getByRole("dialog", { name: "Auto Spin Configuration" });
          await modal.getByRole("button", { name: "10", exact: true }).click();
          await modal.getByRole("button", { name: "Start", exact: true }).click();
          await page.waitForFunction(() => window.__spinQA.calls.length >= 4);
          await page.getByRole("button", { name: "Stop Game", exact: true }).click();
          await page.waitForFunction(
            () => document.querySelector("[data-slot-deck]").dataset.busy === "false",
          );
          const stopped = await page.evaluate(() => window.__spinQA.calls.length);
          await page.waitForTimeout(600);
          result.checks.autoStartStop =
            stopped === (await page.evaluate(() => window.__spinQA.calls.length));
          result.checks.maxConcurrent = await page.evaluate(() => window.__spinQA.maxConcurrent);
          await page.emulateMedia({ reducedMotion: "reduce" });
          result.checks.reducedMotion = await page
            .locator(spinSelector)
            .evaluate(
              (b) =>
                [b, ...b.querySelectorAll("*")].every(
                  (e) => getComputedStyle(e).animationName === "none",
                ) && getComputedStyle(b, "::before").animationName === "none",
            );
        }
      } catch (error) {
        console.log(
          "DEBUG",
          await page.evaluate(() => ({
            calls: window.__spinQA,
            decks: [...document.querySelectorAll("[data-slot-deck]")].map((e) => ({
              html: e.outerHTML.slice(0, 350),
              busy: e.dataset.busy,
            })),
            buttons: [...document.querySelectorAll("button")].map((e) => ({
              label: e.getAttribute("aria-label"),
              display: getComputedStyle(e).display,
              visibility: getComputedStyle(e).visibility,
              box: { w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height },
            })),
          })),
        );
        await page.screenshot({ path: path.join(out, `${g.slug}-failure.png`) });
        throw error;
      } finally {
        await context.close();
      }
    }
    result.status =
      result.layouts.every((r) => r.pass) &&
      Object.entries(result.checks).every(([key, value]) =>
        key === "maxConcurrent" ? value === 1 : value === true,
      ) &&
      !result.errors.length
        ? "VERIFIED"
        : "BLOCKED";
  } catch (e) {
    result.status = "BLOCKED";
    result.errors.push(e.message);
  }
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
  console.log(
    `${index + 1}/${games.length} ${g.slug} ${result.status} ${result.errors.join(";").slice(0, 160)}`,
  );
}
try {
  for (let start = 0; start < games.length; start += 10) {
    const queue = games
      .slice(start, start + 10)
      .map((g, i) => ({ g, index: start + i }))
      .filter(({ g }) => !completed.has(g.slug));
    async function worker() {
      while (queue.length) {
        const { g, index } = queue.shift();
        await verifyGame(g, index);
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    console.log(`BATCH ${Math.floor(start / 10) + 1} complete`);
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
console.log(
  JSON.stringify({
    verified: report.games.filter((g) => g.status === "VERIFIED").length,
    blocked: report.games.filter((g) => g.status === "BLOCKED").length,
  }),
);
if (report.games.some((g) => g.status !== "VERIFIED")) process.exitCode = 1;
