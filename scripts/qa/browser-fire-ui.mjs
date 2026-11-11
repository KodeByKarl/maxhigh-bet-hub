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
const slotFile = "src/components/maxhigh/FireSpikeSlot.tsx";
const baseline = execFileSync("git", ["show", `HEAD:${slotFile}`], { encoding: "utf8" });
const behaviorPrefix = (input) => {
  const source = input.replace(/\r\n/g, "\n");
  return source
    .slice(0, source.indexOf("\n  return (\n    <div"))
    .replace(/^import .*SlotControlDeck.*;\r?\n/m, "")
    .replace(/^import .*FireBorder.*;\r?\n/m, "")
    .replace(/^import .*Volume2.*;\r?\n/m, "")
    .replace(/\r\n/g, "\n");
};
assert.equal(
  behaviorPrefix(fs.readFileSync(slotFile, "utf8")),
  behaviorPrefix(baseline),
  "gameplay state machine unchanged",
);
const footer = (source) => {
  const normalized = source.replace(/\r\n/g, "\n");
  return normalized.slice(normalized.indexOf("\n      <footer"));
};
assert.equal(
  footer(fs.readFileSync(slotFile, "utf8")),
  footer(baseline),
  "all control callbacks and disabled flags unchanged",
);
for (const name of ["ReelCell.tsx", "FireSpikeIcon.tsx", "types.ts", "spinPlayback.ts"]) {
  const p = `src/components/maxhigh/fire-spike/${name}`;
  assert.equal(
    fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"),
    execFileSync("git", ["show", `HEAD:${p}`], { encoding: "utf8" }).replace(/\r\n/g, "\n"),
    p + " unchanged",
  );
}
postcss.parse(fs.readFileSync("src/games/fire-spike/fire-layout.css", "utf8")).walkRules((rule) => {
  if (rule.parent.type === "atrule" && rule.parent.name === "keyframes") return;
  assert(
    rule.selectors.every((selector) => selector.includes('[data-game-view="fire-spike"]')),
    "CSS stays scoped to Fire Spike",
  );
});
const out = path.join(root, "output");

const require = createRequire(path.join(process.env.PW_MODULE_DIR, "package.json"));
const { chromium } = require("playwright");
const auth = `export const useAuth = () => ({user:{id:'ui-fixture',balance:15491},setBalanceLocal:()=>{},refreshJackpot:()=>{}});`;
const api = `export const getFireSpikeEngineConfigFn=async()=>{throw Error('fixture defaults');};export const fireSpikeSpinFn=async()=>{window.rpcCalls=(window.rpcCalls||0)+1;return new Promise((resolve,reject)=>{window.rejectSpin=()=>reject(Error('UI fixture: no settlement'));});};`;
const config = "";
fs.writeFileSync(
  path.join(out, "fire-ui.html"),
  '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fire-fixture.css"><link rel="stylesheet" href="/fire-utilities.css"></head><body><div id="root"></div><script src="/fire-fixture.js"></script></body></html>',
);
await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{GameView}from'./src/games/fire-spike/GameView';import{FireControls}from'./src/components/maxhigh/fire-spike/FireControls';
document.body.style.margin='0';document.getElementById('root').style.cssText='height:100dvh;width:100%;';const app=createRoot(document.getElementById('root'));app.render(<GameView/>);
window.mountDeckState=(props)=>{window.calls={};const handler=name=>()=>{window.calls[name]=(window.calls[name]||0)+1;};const actions=Object.fromEntries(['onSpin','onDecreaseBet','onIncreaseBet','onTurbo','onAuto','onMute'].map(name=>[name,handler(name)]));app.render(<div data-game-view="fire-spike" style={{height:'100%'}}><FireControls gameId="fire-spike" balance={15491} bet={5} win={0} busy={false} turbo={false} autoSpin={false} {...actions} {...props}/></div>);};`,
    resolveDir: root,
    loader: "tsx",
  },
  bundle: true,
  outfile: path.join(out, "fire-fixture.js"),
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
fs.writeFileSync(path.join(out, "fire-utilities.css"), compiler.build(scanner.scan()));
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = decodeURIComponent(url.pathname);
  const file =
    rel.startsWith("/images/") || rel.startsWith("/sounds/")
      ? path.join(root, "public", rel)
      : path.join(out, rel.endsWith("fire-ui.html") ? "fire-ui.html" : rel);
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
await new Promise((r) => server.listen(18775, "127.0.0.1", r));
console.log("UI fixture listening");
const browser = await chromium.launch({ headless: true });
console.log("Chromium launched");
const page = await browser.newPage();
console.log("Browser page ready");
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = [];
try {
  await page.goto("http://127.0.0.1:18775/fire-ui.html");
  await page.waitForSelector("[data-fs-board] > :nth-child(15)");
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
    const metrics = await page.evaluate(() => {
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      };
      const board = document.querySelector("[data-fs-board]"),
        cells = [...board.children],
        b = rect(board);
      const buttons = [...document.querySelectorAll(".fire-console button")],
        deck = rect(document.querySelector(".fire-console"));
      const visible = (el) => {
        const r = rect(el);
        if (
          r.w <= 0 ||
          r.h <= 0 ||
          r.x < 0 ||
          r.y < 0 ||
          r.right > innerWidth ||
          r.bottom > innerHeight
        )
          return false;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const ar = rect(a),
            cs = getComputedStyle(a);
          if (/hidden|clip/.test(cs.overflowX) && (r.x < ar.x - 1 || r.right > ar.right + 1))
            return false;
          if (/hidden|clip/.test(cs.overflowY) && (r.y < ar.y - 1 || r.bottom > ar.bottom + 1))
            return false;
        }
        return true;
      };
      return {
        board: b,
        deck,
        cells: cells.length,
        visible: cells.every(visible),
        controlsVisible: buttons.every(visible),
        geometry: cells.every((el, i) => {
          const r = rect(el),
            first = rect(cells[0]);
          return (
            Math.abs(r.w - first.w) < 1 &&
            Math.abs(r.h - first.h) < 1 &&
            getComputedStyle(el).gridColumnStart === String((i % 5) + 1) &&
            getComputedStyle(el).gridRowStart === String(Math.floor(i / 5) + 1)
          );
        }),
        images: cells.every((el) => {
          const img = el.querySelector("img");
          return (
            img?.complete && img.naturalWidth > 0 && getComputedStyle(img).objectFit === "contain"
          );
        }),
        targets: buttons.every((el) => {
          const r = rect(el);
          return r.w >= 44 && r.h >= 44;
        }),
        centered: Math.abs(b.x + b.w / 2 - innerWidth / 2) < 1,
        separated: b.bottom <= deck.y || b.right <= deck.x,
        spinCentered: [...document.querySelector(".fire-console__spin").children].every((el) => {
          const r = rect(el),
            s = rect(document.querySelector(".fire-console__spin"));
          return Math.abs(r.x + r.w / 2 - s.x - s.w / 2) < 1;
        }),
        overlap: buttons.some((a, i) =>
          buttons.slice(i + 1).some((c) => {
            const r = rect(a),
              s = rect(c);
            return (
              Math.min(r.right, s.right) > Math.max(r.x, s.x) + 1 &&
              Math.min(r.bottom, s.bottom) > Math.max(r.y, s.y) + 1
            );
          }),
        ),
        scroll:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
      };
    });
    results.push({ width, height, ...metrics });
    assert.equal(metrics.cells, 15);
    assert(
      metrics.visible &&
        metrics.controlsVisible &&
        metrics.geometry &&
        metrics.images &&
        metrics.targets &&
        metrics.separated &&
        metrics.spinCentered &&
        !metrics.overlap &&
        !metrics.scroll &&
        (width === 844 || metrics.centered),
      JSON.stringify(results.at(-1)),
    );
  }
  await page.setViewportSize({ width: 360, height: 640 });
  await page.locator("#root").evaluate((el) => {
    el.style.height = "520px";
  });
  assert(
    await page.locator(".fire-console").evaluate((el) => el.getBoundingClientRect().bottom <= 520),
    "shorter game modal",
  );
  await page.locator("#root").evaluate((el) => {
    el.style.height = "100dvh";
  });
  const stake = page.locator(".fire-console__stake strong"),
    initial = await stake.innerText();
  await page.getByRole("button", { name: "Increase Bet", exact: true }).click();
  assert.notEqual(await stake.innerText(), initial);
  await page.getByRole("button", { name: "Decrease Bet", exact: true }).click();
  assert.equal(await stake.innerText(), initial);
  const turbo = page.getByRole("button", { name: "Turbo Fast Mode" });
  await turbo.click();
  assert.equal(await turbo.getAttribute("aria-pressed"), "true");
  await turbo.click();
  const sound = page.locator(".fire-console__tools button").last(),
    muted = await sound.getAttribute("aria-pressed");
  await sound.click();
  assert.notEqual(await sound.getAttribute("aria-pressed"), muted);
  await sound.click();
  const spin = page.getByRole("button", { name: "Spin", exact: true }),
    position = await spin.boundingBox();
  await spin.click();
  const spinning = page.getByRole("button", { name: "Spinning", exact: true });
  await spinning.waitFor();
  assert(await spinning.isDisabled());
  assert.equal((await spinning.boundingBox()).y, position.y);
  assert(await page.getByRole("button", { name: "Increase Bet", exact: true }).isDisabled());
  assert.equal(await page.evaluate(() => window.rpcCalls), 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await spinning.evaluate((el) => getComputedStyle(el.querySelector("svg")).animationName),
    "none",
  );
  await page.evaluate(() => window.rejectSpin());
  await spin.waitFor();
  assert(!(await spin.isDisabled()));
  await page.getByRole("button", { name: "Auto Spin Settings" }).click();
  await page.getByRole("button", { name: "Stop Game" }).waitFor();
  await page.waitForFunction(() => window.rpcCalls === 2);
  await page.getByRole("button", { name: "Stop Game" }).click();
  await page.evaluate(() => window.rejectSpin());
  await spin.waitFor();
  const mount = async (p) => {
    await page.evaluate((p) => window.mountDeckState(p), p);
    await page.waitForTimeout(30);
  };
  await mount({});
  for (const [label, event] of [
    ["Spin", "onSpin"],
    ["Decrease Bet", "onDecreaseBet"],
    ["Increase Bet", "onIncreaseBet"],
    ["Turbo Fast Mode", "onTurbo"],
    ["Auto Spin Settings", "onAuto"],
    ["Mute", "onMute"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    assert.equal(await page.evaluate((k) => window.calls[k], event), 1);
  }
  await mount({ busy: true, spinDisabled: true });
  assert(await page.getByRole("button", { name: "Spinning" }).isDisabled());
  await mount({ autoSpin: true });
  await page.getByRole("button", { name: "Stop Game" }).click();
  assert.equal(await page.evaluate(() => window.calls.onAuto), 1);
  await mount({ muted: true });
  await page.getByRole("button", { name: "Unmute" }).click();
  assert.equal(await page.evaluate(() => window.calls.onMute), 1);
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
    path.join(out, "fire-ui-results.json"),
    JSON.stringify({ results, errors, rpc: "mocked" }, null, 2),
  );
  await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
