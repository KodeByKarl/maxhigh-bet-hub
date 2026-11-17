// Local, deterministic UI fixture. RPCs are replaced in the bundle: no wallet or database writes.
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { build } from "esbuild";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { chromium } from "../../output/production-browser-tools/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";

const root = process.cwd();
const out = path.join(root, "output/persian-mobile");
fs.mkdirSync(out, { recursive: true });
const auth = `import {useSyncExternalStore} from 'react';
const listeners=new Set();let balance=25000;
export const useAuth=()=>{const value=useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>balance);return {user:{id:'local-ui-fixture',balance:value},setBalanceLocal:v=>{balance=v;listeners.forEach(fn=>fn())},refreshJackpot:async()=>{}}};`;
const rpc = `import {realmsDefaultConfig,findRealmsGame,realmsBuyPricePerSpin} from '@/lib/realms';
import {initialBoard} from '@/components/maxhigh/realms/engine/gridState';
import {createEngineCtx} from '@/components/maxhigh/realms/engine/types';
const id='persian-peacock', cfg=realmsDefaultConfig(id),def=findRealmsGame(id);
let wallet=25000, sequence=0, active=0;
const empty=()=>({sessionId:null,freeSpinsLeft:0,fsSessionWin:0,fsSpinsPlayed:0,inFree:false,bet:5,ante:false});let session=empty();
window.__ppQA={calls:[],maxConcurrent:0,win:0,session:()=>session};
const q=window.__ppQA;
export const getRealmsEngineConfigFn=async()=>cfg;
export const getRealmsSessionFn=async()=>({...session});
async function perform(kind,data){q.calls.push({kind,data});active++;q.maxConcurrent=Math.max(q.maxConcurrent,active);await new Promise(r=>setTimeout(r,150));active--;
if(kind==='buy'){wallet-=data.bet*realmsBuyPricePerSpin(id,cfg,data.quantity)*data.quantity;session={...empty(),sessionId:'local-fixture-feature',freeSpinsLeft:data.quantity,inFree:true,bet:data.bet};return {balance:wallet,session:{...session}};}
const free=kind==='free',win=q.win;if(!free)wallet-=data.bet;
if(free){session={...session,freeSpinsLeft:Math.max(0,session.freeSpinsLeft-1),fsSpinsPlayed:session.fsSpinsPlayed+1,fsSessionWin:session.fsSessionWin+win};session.inFree=session.freeSpinsLeft>0;if(!session.inFree)session.sessionId=null;}else wallet+=win;
const script={initialBoard:initialBoard(createEngineCtx(cfg,def.board,()=>((++sequence*0.61803398875)%1))),steps:[],totalWin:win,rawWin:win,displayMult:1,scatters:0,scatterPay:0,freeSpinsAwarded:0,retriggerSpins:0,isFreeSpins:free,bombAccumulator:0};
return {script,balance:wallet,session:{...session},fsPayout:free&&!session.inFree?{amount:session.fsSessionWin,baseEarn:session.fsSessionWin,multiplier:1,spinsPlayed:session.fsSpinsPlayed}:null};}
export const realmsSpinFn=({data})=>perform('spin',data);
export const realmsFreeSpinFn=({data})=>perform('free',data);
export const realmsBuyFeatureFn=({data})=>perform('buy',data);`;
const entry = `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{X}from'lucide-react';import{Toaster}from'sonner';import{GameView}from'./src/games/persian-peacock/GameView';
function Fixture(){const[open,setOpen]=useState(true);return <><button id="reopen" onClick={()=>setOpen(true)}>Open Persian Peacock</button>{open&&<div data-game-modal="persian-peacock" role="dialog" aria-label="Persian Peacock game" className="fixed inset-0 flex flex-col overflow-hidden"><div className="absolute right-[calc(env(safe-area-inset-right)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.75rem)] z-[10001] sm:right-[calc(env(safe-area-inset-right)+1.25rem)] sm:top-[calc(env(safe-area-inset-top)+1.25rem)]"><button aria-label="Close game" onClick={()=>setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/50 text-white"><X size={20}/></button></div><div style={{height:'100%',minHeight:0}}><GameView/></div></div>}<Toaster/></>};createRoot(document.getElementById('root')).render(<Fixture/>);`;
await build({
  stdin: { contents: entry, resolveDir: root, loader: "tsx" },
  bundle: true,
  outfile: path.join(out, "fixture.js"),
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "local-only-rpc",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/auth$|^@\/functions\/realms$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents: a.path.endsWith("/auth") ? auth : rpc,
          resolveDir: root,
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
fs.writeFileSync(
  path.join(out, "utilities.css"),
  compiler.build(
    [...scanner.scan(), ...entry.matchAll(/className="([^"]+)"/g)].flatMap((v) =>
      typeof v === "string" ? [v] : v[1].split(" "),
    ),
  ),
);
fs.writeFileSync(
  path.join(out, "index.html"),
  '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><link rel="stylesheet" href="/utilities.css"><style>html,body,#root{margin:0;width:100%;height:100%;background:#100907}body{font-family:Arial,sans-serif}#reopen{padding:20px;color:white}button{cursor:pointer}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
);
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
  const file =
    pathname.startsWith("/images/") || pathname.startsWith("/sounds/")
      ? path.join(root, "public", pathname)
      : path.join(out, pathname === "/" ? "index.html" : pathname);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
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
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
    }[path.extname(file)] ?? "application/octet-stream",
  );
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(19140, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true });
const errors = [];
const evidence = [];
const phase = process.argv[2] ?? "before";
const checks = [];
async function check(name, run) {
  await run();
  checks.push({ name, status: "passed" });
  console.log("PASS", name);
}
try {
  const viewports = [
    ["android-360", 360, 800],
    ["android-412", 412, 915],
    ["desktop", 1366, 768],

    ["mobile", 390, 844],
    ["small-mobile", 320, 568],
    ["tablet", 768, 1024],
    ["landscape", 844, 390],
    ["short-landscape", 667, 375],
  ];
  if (phase !== "before")
    viewports.push(
      ["short-mobile", 390, 667],
      ["android", 360, 640],

      ["small-landscape", 568, 320],
      ["square", 600, 600],
    );
  for (const [name, width, height] of viewports) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 900,
      serviceWorkers: "block",
    });
    await context.route("**/*", (route) => {
      if (
        !route.request().url().startsWith("http://127.0.0.1:19140/") ||
        !["GET", "HEAD"].includes(route.request().method())
      )
        return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push({ name, error: e.message }));
    await page.goto("http://127.0.0.1:19140/");
    await page.waitForSelector(".realms-reel-grid img");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `${phase}-${name}.png`) });
    const geometry = await page.evaluate(
      ({ name, width, height }) => {
        const rect = (e) => {
          const b = e.getBoundingClientRect();
          return { x: b.x, y: b.y, w: b.width, h: b.height, right: b.right, bottom: b.bottom };
        };
        const box = (s) => {
          const e = document.querySelector(s);
          return e ? rect(e) : null;
        };
        const buttons = [
          ...document.querySelectorAll(
            '[data-slot-deck] button,[data-realms-game]>button,button[aria-label="Close game"]',
          ),
        ].map((e) => ({ label: e.getAttribute("aria-label") ?? e.textContent, box: rect(e) }));
        const overlaps = [];
        for (let i = 0; i < buttons.length; i++)
          for (let j = i + 1; j < buttons.length; j++) {
            const a = buttons[i],
              b = buttons[j];
            if (
              Math.min(a.box.right, b.box.right) - Math.max(a.box.x, b.box.x) > 1 &&
              Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.y, b.box.y) > 1
            )
              overlaps.push([a.label, b.label]);
          }
        return {
          name,
          width,
          height,
          board: box(".realms-reel-grid"),
          deck: box("[data-slot-deck]"),
          scroll: document.documentElement.scrollWidth > innerWidth,
          buttons,
          overlaps,
          brokenImages: [...document.images]
            .filter((i) => !i.complete || !i.naturalWidth)
            .map((i) => i.src),
          calls: window.__ppQA.calls,
        };
      },
      { name, width, height },
    );
    evidence.push(geometry);
    if (phase !== "before")
      await check(`layout ${name}`, async () => {
        assert.equal(geometry.scroll, false);
        assert.deepEqual(geometry.brokenImages, []);
        assert.deepEqual(geometry.overlaps, []);
        for (const b of [geometry.board, geometry.deck, ...geometry.buttons.map((b) => b.box)]) {
          assert.ok(
            b.x >= -1 && b.y >= -1 && b.right <= width + 1 && b.bottom <= height + 1,
            `${name}: out of bounds ${JSON.stringify(b)}`,
          );
        }
        for (const b of geometry.buttons)
          assert.ok(
            b.box.w >= 43 && b.box.h >= 43,
            `${name}: small target ${b.label} ${JSON.stringify(b.box)}`,
          );
        assert.ok(
          geometry.deck.right <= geometry.board.x + 1 ||
            geometry.board.right <= geometry.deck.x + 1 ||
            geometry.board.bottom <= geometry.deck.y + 1,
          `${name}: board/deck overlap`,
        );
      });
    if (phase !== "before" && ["small-mobile", "landscape", "small-landscape"].includes(name)) {
      await check(`dialogs ${name}`, async () => {
        await page.getByRole("button", { name: "Auto Spin Settings", exact: true }).click();
        const auto = page.getByRole("dialog", { name: "Auto Spin Configuration" });
        await page.waitForTimeout(350);
        await page.screenshot({ path: path.join(out, `auto-${name}.png`) });
        const start = auto.getByRole("button", { name: "Start", exact: true });
        const startBox = await start.boundingBox();
        assert.ok(
          startBox.y >= 0 && startBox.y + startBox.height <= height,
          `${name}: Auto Start offscreen`,
        );
        assert.ok(
          await start.evaluate((el) => {
            const b = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
          }),
          `${name}: Auto Start clipped`,
        );
        await auto.getByRole("button", { name: "Cancel", exact: true }).click();
        await page.getByRole("button", { name: "Select Bet Amount", exact: true }).click();
        await page.waitForTimeout(350);
        const betCard = page.locator("div:has(> h3):has(> .grid.grid-cols-4)");
        const betBox = await betCard.boundingBox();
        assert.ok(
          betBox.y >= 0 && betBox.y + betBox.height <= height,
          `${name}: bet dialog offscreen`,
        );
        await page.screenshot({ path: path.join(out, `bet-${name}.png`) });
        await betCard.getByRole("button", { name: "Close", exact: true }).click();
        await page.locator(".pp-bonus").click();
        const buy = page.getByRole("dialog", { name: "Buy Bonus", exact: true });
        await page.waitForTimeout(350);
        await page.screenshot({ path: path.join(out, `bonus-${name}.png`) });
        const confirm = buy.getByRole("button", { name: "Buy & Play", exact: true });
        await confirm.scrollIntoViewIfNeeded(); // shared dialog card scrolls on short screens
        assert.ok(
          await confirm.evaluate((el) => {
            const b = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
          }),
          `${name}: Buy confirmation clipped`,
        );
        await buy.getByRole("button", { name: "Close", exact: true }).click();
      });
    }
    await context.close();
  }
  if (phase === "after") {
    for (const mobile of [true, false]) {
      const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
        hasTouch: mobile,
        serviceWorkers: "block",
      });
      await context.route("**/*", (route) => {
        assert.ok(route.request().url().startsWith("http://127.0.0.1:19140/"), "external network");
        assert.ok(["GET", "HEAD"].includes(route.request().method()), "unexpected write request");
        return route.continue();
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push({ mobile, error: e.message }));
      const click = async (locator) => (mobile ? locator.tap() : locator.click());
      await page.goto("http://127.0.0.1:19140/");
      await page.waitForSelector(".pp-spin:enabled");
      const suffix = mobile ? "touch" : "mouse";
      await check(`bet adjustment and selection (${suffix})`, async () => {
        const value = () => page.locator(".pp-bet__value strong").innerText();
        const original = await value();
        await click(page.getByRole("button", { name: "Increase Bet", exact: true }));
        assert.notEqual(await value(), original);
        await click(page.getByRole("button", { name: "Decrease Bet", exact: true }));
        assert.equal(await value(), original);
        await click(page.getByRole("button", { name: "Select Bet Amount", exact: true }));
        await page.getByRole("button", { name: /Bet ₱10.00/ }).click();
        assert.match(await value(), /10.00/);
        await click(page.getByRole("button", { name: "Select Bet Amount", exact: true }));
        await page.getByRole("button", { name: /Bet ₱5.00/ }).click();
        assert.equal(await value(), original);
      });
      await check(`sound and paytable (${suffix})`, async () => {
        await click(page.getByRole("button", { name: "Mute", exact: true }));
        await click(page.getByRole("button", { name: "Unmute", exact: true }));
        await click(page.getByRole("button", { name: "Paytable Info", exact: true }));
        await page.getByRole("dialog", { name: "Paytable", exact: true }).waitFor();
        await page.screenshot({ path: path.join(out, `paytable-${suffix}.png`) });
        await page
          .getByRole("dialog", { name: "Paytable", exact: true })
          .getByRole("button", { name: "Close", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "Paytable", exact: true })
          .waitFor({ state: "hidden" });
      });
      await check(
        `manual spin, balance, last win and rapid double activation (${suffix})`,
        async () => {
          await page.evaluate(() => {
            window.__ppQA.win = 10;
            const b = document.querySelector(".pp-spin");
            b.click();
            b.click();
          });
          await page.waitForFunction(
            () =>
              window.__ppQA.calls.filter((c) => c.kind === "spin").length === 1 &&
              document.querySelector("[data-slot-deck]").dataset.busy === "false" &&
              document.querySelector('[data-meter="win"] strong').textContent.includes("10.00"),
          );
          assert.equal(
            await page.locator('[data-meter="balance"] strong').innerText(),
            "₱25,005.00",
          );
          assert.equal(await page.evaluate(() => window.__ppQA.maxConcurrent), 1);
          await page.waitForTimeout(2300);
          await page.screenshot({ path: path.join(out, `win-${suffix}.png`) });
          await page.evaluate(() => (window.__ppQA.win = 0));
        },
      );
      await check(`Turbo and Auto start/stop (${suffix})`, async () => {
        await click(page.getByRole("button", { name: "Turbo Fast Mode", exact: true }));
        assert.equal(
          await page
            .getByRole("button", { name: "Turbo Fast Mode", exact: true })
            .getAttribute("data-turbo"),
          "on",
        );
        await click(page.getByRole("button", { name: "Auto Spin Settings", exact: true }));
        const dialog = page.getByRole("dialog", { name: "Auto Spin Configuration" });
        await dialog.getByRole("button", { name: "10", exact: true }).click();
        await page.screenshot({ path: path.join(out, `auto-${suffix}.png`) });
        await dialog.getByRole("button", { name: "Start", exact: true }).click();
        await page.waitForFunction(
          () => window.__ppQA.calls.filter((c) => c.kind === "spin").length >= 3,
        );
        await click(page.getByRole("button", { name: "Stop Game", exact: true }));
        await page.waitForTimeout(1600);
        const count = await page.evaluate(
          () => window.__ppQA.calls.filter((c) => c.kind === "spin").length,
        );
        await page.waitForTimeout(600);
        assert.equal(
          await page.evaluate(() => window.__ppQA.calls.filter((c) => c.kind === "spin").length),
          count,
        );
        assert.equal(await page.evaluate(() => window.__ppQA.maxConcurrent), 1);
        await page.getByRole("button", { name: "Auto Spin Settings", exact: true }).waitFor();
      });
      await check(`Buy Bonus cancel, quantity and single purchase (${suffix})`, async () => {
        await click(page.locator(".pp-bonus"));
        const dialog = page.getByRole("dialog", { name: "Buy Bonus", exact: true });
        await dialog.waitFor();
        await page.screenshot({ path: path.join(out, `bonus-${suffix}.png`) });
        await dialog.getByRole("button", { name: "Close", exact: true }).click();
        assert.equal(
          await page.evaluate(() => window.__ppQA.calls.filter((c) => c.kind === "buy").length),
          0,
        );
        await click(page.locator(".pp-bonus"));
        await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
        await page.getByRole("button", { name: "Decrease quantity", exact: true }).click();
        const paidBefore = await page.evaluate(
          () => window.__ppQA.calls.filter((c) => c.kind === "spin").length,
        );
        await page.evaluate(() => {
          const b = document.querySelector(".bb-confirm");
          b.click();
          b.click();
        });
        await page.waitForFunction(
          () => window.__ppQA.calls.filter((c) => c.kind === "buy").length === 1,
        );
        await page.waitForFunction(
          () => window.__ppQA.calls.some((c) => c.kind === "free"),
          {},
          { timeout: 15000 },
        );
        assert.equal(
          await page.evaluate(() => window.__ppQA.calls.filter((c) => c.kind === "spin").length),
          paidBefore,
        );
        assert.equal(await page.evaluate(() => window.__ppQA.maxConcurrent), 1);
      });
      await check(`close, reopen and no wager on mount (${suffix})`, async () => {
        await click(page.getByRole("button", { name: "Close game", exact: true }));
        await page.locator("[data-game-view]").waitFor({ state: "hidden" });
        await page.waitForTimeout(800);
        const count = await page.evaluate(() => window.__ppQA.calls.length);
        await click(page.locator("#reopen"));
        await page.waitForSelector(".pp-spin:enabled");
        await page.waitForTimeout(400);
        assert.equal(await page.evaluate(() => window.__ppQA.calls.length), count);
      });
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(out, `${phase}-results.json`),
    JSON.stringify({ evidence, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ phase, viewports: evidence.length, checks, errors }, null, 2));
} finally {
  await browser.close();
  server.close();
}
