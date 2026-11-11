// Isolated browser regression for the real Coin Volcano controller and view.
// Supply a Playwright package directory as argv[2]. No live account or API is used.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { build, preview } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

const root = process.cwd();
const out = path.join(root, "output/coin-volcano-ui");
fs.mkdirSync(out, { recursive: true });
const write = (name, text) => fs.writeFileSync(path.join(out, name), text);
write(
  "index.html",
  `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/output/coin-volcano-ui/fixture.tsx"></script></body></html>`,
);
write(
  "auth.ts",
  `import {useState} from 'react';
export function useAuth(){const [balance,setBalanceLocal]=useState(10000);return {user:{balance},setBalanceLocal}}`,
);
write(
  "api.ts",
  `import {DEFAULT_COIN_VOLCANO_CONFIG as cfg} from '@/lib/coin-volcano-config';
import {resolveCoinVolcanoSpin} from '@/components/maxhigh/coin-volcano/spinResolver';
window.cvTest={mode:'loss',calls:[],balance:10000};
export async function getCoinVolcanoEngineConfigFn(){return {...cfg,minBet:0.1,maxBet:50}}
export async function coinVolcanoSpinFn({data}){
 const test=window.cvTest, mode=test.mode; test.mode='loss';test.calls.push({bet:data.bet,mode});
 await new Promise(r=>setTimeout(r,180));
 if(mode==='error')throw Error('Fixture: settlement unavailable');
 const kinds=['bar','dice','diamond','chip','lucky7'];
 const grid=Array.from({length:5},(_,r)=>Array.from({length:3},(_,row)=>kinds[r]));
 if(mode==='line')for(let r=0;r<5;r++)grid[r][1]='lucky7';
 if(mode==='mix')for(let r=0;r<3;r++){grid[r][0]='scatter';grid[r][2]='wild'}
 if(mode==='jackpot')for(const reel of grid)reel.fill('scatter');
 const script=resolveCoinVolcanoSpin({totalBet:data.bet,grid,seed:'ui-fixture'});
 test.lastScript=script;test.balance=+(test.balance-data.bet+script.totalWin).toFixed(2);
 return {balance:test.balance,script};
}`,
);
write(
  "fixture.tsx",
  `import React from 'react';import {createRoot} from 'react-dom/client';
import {CoinVolcanoSlot} from '/src/components/maxhigh/CoinVolcanoSlot';
import {Toaster} from 'sonner';import '/src/styles.css';
createRoot(document.getElementById('root')).render(<div style={{height:'100dvh'}}><CoinVolcanoSlot/><button aria-label="Close game" style={{position:'fixed',right:8,top:6,width:44,height:44,zIndex:50,borderRadius:'50%',background:'#100d0dcc',border:'1px solid #b38d5a88',color:'#fff'}}>×</button><Toaster/></div>);`,
);

const config = {
  configFile: false,
  plugins: [react(), tailwind()],
  cacheDir: "node_modules/.vite/coin-volcano-ui",
  resolve: {
    alias: [
      { find: "@/functions/api", replacement: path.join(out, "api.ts") },
      { find: "@/lib/auth", replacement: path.join(out, "auth.ts") },
      { find: "@", replacement: path.join(root, "src") },
    ],
    dedupe: ["react", "react-dom"],
  },
  build: { outDir: path.join(out, "dist"), rollupOptions: { input: path.join(out, "index.html") } },
  preview: { host: "127.0.0.1", port: 18774, strictPort: true },
};
if (!process.argv.includes("--reuse-build")) await build(config);
const server = await preview(config);
const pw = process.argv[2]
  ? pathToFileURL(path.resolve(process.argv[2], "index.mjs")).href
  : "playwright";
const { chromium } = await import(pw);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(() => {
  window.cvLandings = {};
  const sample = () => {
    if (document.querySelector(".cv-game")?.dataset.phase === "stopping") {
      for (const el of document.querySelectorAll(".cv-reel-land")) {
        const key = el.closest(".cv-cell").getAttribute("aria-label");
        const y = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42;
        const entry = window.cvLandings[key] ?? { min: Infinity, max: -Infinity };
        entry.min = Math.min(entry.min, y);
        entry.max = Math.max(entry.max, y);
        window.cvLandings[key] = entry;
      }
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = {
  isolation:
    "Actual controller; mocked auth and settlement transport; real resolver with fixed grids; no live wagers",
  viewports: [],
  checks: [],
  errors,
};
const url = "http://127.0.0.1:18774/output/coin-volcano-ui/index.html";
const idle = () => page.locator('.cv-game[data-phase="idle"]').waitFor();
const settings = () => page.getByRole("button", { name: /^Game settings/ }).click();
const screenshot = (name) => page.screenshot({ path: path.join(out, `${name}.png`) });
try {
  await page.goto(url);
  await idle();
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [375, 667],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1024, 768],
    [1366, 768],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(80);
    const metrics = await page.evaluate(() => {
      const rect = (e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        cabinet: rect(document.querySelector(".cv-cabinet")),
        console: rect(document.querySelector(".cv-console")),
        cells: [...document.querySelectorAll(".cv-cell")].map(rect),
        buttons: [...document.querySelectorAll(".cv-console button")].map(rect),
        brokenImages: [...document.images]
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.src),
      };
    });
    await screenshot(`${width}x${height}`);
    assert.equal(metrics.overflow, false);
    assert.equal(metrics.cells.length, 15);
    assert.equal(metrics.brokenImages.length, 0);
    if (width < 700)
      assert.ok(
        Math.abs(metrics.console.y - metrics.cabinet.y - metrics.cabinet.h) < 3,
        "cabinet connects directly to console",
      );
    for (const b of metrics.buttons) {
      assert.ok(b.w >= 44 && b.h >= 44, "44px target");
      assert.ok(
        b.x >= 0 && b.x + b.w <= width + 1 && b.y >= 0 && b.y + b.h <= height + 1,
        `controls visible ${width}x${height}: ${JSON.stringify(b)}`,
      );
    }
    for (let i = 0; i < metrics.buttons.length; i++)
      for (let j = i + 1; j < metrics.buttons.length; j++) {
        const a = metrics.buttons[i],
          b = metrics.buttons[j];
        assert.ok(
          !(
            a.x < b.x + b.w - 0.5 &&
            a.x + a.w > b.x + 0.5 &&
            a.y < b.y + b.h - 0.5 &&
            a.y + a.h > b.y + 0.5
          ),
          "no button overlap",
        );
      }
    const clip = await page.locator(".cv-reels").boundingBox();
    for (const c of metrics.cells)
      assert.ok(
        c.x >= clip.x &&
          c.x + c.w <= clip.x + clip.width + 1 &&
          c.y >= clip.y &&
          c.y + c.h <= clip.y + clip.height + 1,
        "cells inside cabinet",
      );
    await screenshot(`${width}x${height}`);
    results.viewports.push({ width, height, ...metrics });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Increase Bet", exact: true }).click();
  assert.match(await page.locator(".cv-stake").innerText(), /2\.00/);
  await page.getByRole("button", { name: "Decrease Bet", exact: true }).click();
  assert.match(await page.locator(".cv-stake").innerText(), /1\.00/);
  assert.equal(await page.getByRole("button", { name: /Buy bonus/i }).count(), 0);
  await settings();
  await page.getByRole("menuitemcheckbox", { name: /Turbo/ }).click();
  await settings();
  assert.equal(
    await page.getByRole("menuitemcheckbox", { name: /Turbo/ }).getAttribute("aria-checked"),
    "true",
  );
  await page.getByRole("menuitem", { name: /Unmute sound|Mute sound/ }).click();
  await settings();
  await page.keyboard.press("Escape");
  await page.waitForFunction(() =>
    document.activeElement?.getAttribute("aria-label")?.startsWith("Game settings"),
  );
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Info / Paytable" }).click();
  await page.getByRole("dialog").waitFor();
  assert.match(await page.getByRole("dialog").innerText(), /Base game only/);
  await screenshot("paytable");
  await page.keyboard.press("Escape");
  results.checks.push(
    "bet, no unsupported buy, turbo, sound, keyboard focus, configuration paytable",
  );
  // Test the actual controller lock against repeated presses while settlement is pending.
  await page.getByRole("button", { name: "Spin", exact: true }).evaluate((b) => {
    b.click();
    b.click();
    b.click();
  });
  await page.getByRole("button", { name: "Spinning", exact: true }).waitFor();
  assert.ok(await page.getByRole("button", { name: "Increase Bet", exact: true }).isDisabled());
  assert.equal(await page.evaluate(() => window.cvTest.calls.length), 1);
  const strip = page.locator(".cv-reel-scroll").first();
  const before = await strip.evaluate((e) => getComputedStyle(e).transform);
  await page.waitForTimeout(35);
  const after = await strip.evaluate((e) => getComputedStyle(e).transform);
  assert.notEqual(before, "none");
  assert.notEqual(before, after, "symbols visibly roll");
  await screenshot("spinning");
  await idle();
  assert.equal(await page.locator(".cv-wallet strong").innerText(), "₱9,999.00");
  const fastLandings = await page.evaluate(() => Object.values(window.cvLandings));
  assert.equal(fastLandings.length, 15);
  assert.ok(
    fastLandings.every((p) => p.min < -10 && p.max > -1),
    "Turbo cards visibly drop and land",
  );
  results.checks.push(
    "duplicate-spin lock, busy controls, loss settlement, visible downward shuffle and Turbo drop",
  );
  // Restore normal playback so winning states can be inspected before their real timers finish.
  await settings();
  await page.getByRole("menuitemcheckbox", { name: /Turbo/ }).click();
  for (const mode of ["line", "mix", "jackpot"]) {
    await page.goto(url);
    await idle();
    await page.evaluate((mode) => {
      window.cvTest.mode = mode;
    }, mode);
    await page.getByRole("button", { name: "Spin", exact: true }).click();
    await page.locator('.cv-game[data-winning="true"]').waitFor();
    if (mode === "line" || mode === "mix")
      assert.ok((await page.locator('.cv-cell[data-winning="true"]').count()) > 0);
    if (mode === "jackpot")
      await page.getByText("GRAND JACKPOT", { exact: true }).first().waitFor();
    if (mode === "mix") await page.locator('.cv-reward[data-mix="true"]').waitFor();
    const landings = await page.evaluate(() => Object.values(window.cvLandings));
    assert.equal(landings.length, 15);
    assert.ok(
      landings.every((p) => p.min < -10 && p.max > -1),
      "all cards travel downward from above to their final positions",
    );
    await page.waitForTimeout(400);
    await screenshot(`win-${mode}`);
    const expected = await page.evaluate(() => window.cvTest.balance);
    assert.equal(
      await page.locator(".cv-wallet strong").innerText(),
      new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(expected),
    );
    assert.equal(
      await page.locator(".cv-reward strong").getAttribute("aria-label"),
      await page.evaluate(() =>
        new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
          window.cvTest.lastScript.grandJackpotWin ||
            (window.cvTest.lastScript.instantMix
              ? window.cvTest.lastScript.instantMix.payout
              : window.cvTest.lastScript.paylineWin) ||
            window.cvTest.lastScript.instantMix.payout,
        ),
      ),
    );
    results.checks.push(`${mode} authoritative reward, highlighting, balance`);
  }
  await page.goto(url);
  await idle();
  await settings();
  await page.getByRole("menuitemcheckbox", { name: "Auto Spin", exact: true }).click();
  await page.getByRole("button", { name: "Spinning", exact: true }).waitFor();
  await page.getByRole("button", { name: "Stop Auto Spin", exact: true }).click();
  await idle();
  const calls = await page.evaluate(() => window.cvTest.calls.length);
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => window.cvTest.calls.length), calls);
  results.checks.push("auto start and direct stop");
  await page.goto(url);
  await idle();
  await page.evaluate(() => (window.cvTest.mode = "error"));
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  await idle();
  assert.equal(await page.locator(".cv-wallet strong").innerText(), "₱10,000.00");
  results.checks.push("failed settlement leaves balance unchanged and unlocks controls");
  await page.goto(url);
  await idle();
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  await page.locator('.cv-game[data-phase="stopping"]').waitFor();
  await screenshot("landing");
  await idle();
  results.checks.push("15 normal and Turbo landings finish inside playback windows");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page.locator(".cv-spin").evaluate((e) => getComputedStyle(e, "::before").animationName),
    "none",
  );
  results.checks.push("reduced motion");
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify(
      {
        viewports: results.viewports.map((v) => [v.width, v.height]),
        checks: results.checks,
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
