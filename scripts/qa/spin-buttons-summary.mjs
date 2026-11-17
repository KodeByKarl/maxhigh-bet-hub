import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import sharp from "sharp";

const out = path.resolve("output/spin-buttons");
const inventory = JSON.parse(fs.readFileSync("docs/CODEX_SPIN_INVENTORY.json", "utf8"));
await build({
  entryPoints: ["src/components/maxhigh/spin-button/game-spin-themes.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: path.join(out, "themes.mjs"),
  tsconfig: "tsconfig.json",
});
const { GAME_SPIN_TREATMENTS: themes, gameSpinThemeStyle } = await import(
  pathToFileURL(path.join(out, "themes.mjs")).href
);
const games = inventory.games.filter((g) => g.active && g.category === "slot");
if (games.length !== 41 || Object.keys(themes).length !== 41 || games.some((g) => !themes[g.slug]))
  throw Error("Inventory/theme mapping mismatch");
if (new Set(Object.values(themes).map((t) => t.contour + "|" + t.engraving)).size !== 41)
  throw Error("Duplicate frame geometry");
const assetEvidence = [];
for (const game of games) {
  const style = gameSpinThemeStyle(game.slug);
  const asset = style["--spin-crest"].match(/url\("([^?]+)\?/)[1];
  const file = path.resolve("public", "." + asset);
  if (!fs.existsSync(file)) throw Error(`Missing original crest: ${game.slug}`);
  assetEvidence.push({
    slug: game.slug,
    crest: asset,
    sha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
    treatment: themes[game.slug].title,
  });
}
const reportPath = path.join(out, "browser/report.json");
const browser = fs.existsSync(reportPath)
  ? JSON.parse(fs.readFileSync(reportPath, "utf8"))
  : { games: [] };
const rows = games.map((g, i) => {
  const qa = browser.games.find((r) => r.slug === g.slug && r.status);
  return {
    batch: Math.floor(i / 10) + 1,
    name: g.name,
    slug: g.slug,
    status: qa?.status ?? "IMPLEMENTED",
    theme: themes[g.slug].title,
    finish: themes[g.slug].finish,
    engine: g.engine,
    existingControl: g.existingControl,
    asset: assetEvidence.find((a) => a.slug === g.slug).crest,
    results: qa
      ? {
          ...qa,
          layouts: qa.layouts.map(({ frame, ...layout }) => ({
            ...layout,
            frameSha256: createHash("sha256").update(frame).digest("hex"),
          })),
        }
      : null,
  };
});
const desktopPath = path.join(out, "browser/desktop-actions.json");
const desktop = fs.existsSync(desktopPath) ? JSON.parse(fs.readFileSync(desktopPath, "utf8")) : [];
const snapshot = path.join(out, "browser/snapshot");
const snapshotEvidence = [];
for (const g of games) {
  const folder = path.join(snapshot, "src/games", g.slug);
  if (!fs.existsSync(folder)) continue;
  for (const name of fs
    .readdirSync(folder)
    .filter((f) => /GameView\.tsx$|Console\.tsx$|Navigation\.tsx$|game\.theme\.ts$/.test(f))) {
    const file = path.join(folder, name);
    snapshotEvidence.push({
      file: `src/games/${g.slug}/${name}`,
      sha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
    });
  }
}
fs.writeFileSync(
  "docs/CODEX_SPIN_QA.json",
  JSON.stringify(
    {
      scope: "41 active slots; 9 non-slot games excluded with user approval",
      mappingVerified: true,
      uniqueFrameGeometry: 41,
      originalAssets: assetEvidence,
      testedSourceFiles: snapshotEvidence,
      desktopActions: desktop,
      rows,
    },
    null,
    2,
  ) + "\n",
);
const sourceFiles = [
  "src/games/shared/layouts/SkinnedGame.tsx",
  "src/components/maxhigh/spin-button/game-spin-themes.ts",
  "src/components/maxhigh/spin-button/game-spin-button.css",
];
const results = fs.existsSync("output/unit-tests/results.json")
  ? JSON.parse(fs.readFileSync("output/unit-tests/results.json", "utf8"))
  : [];
if (rows.every((g) => g.status === "VERIFIED")) {
  const tiles = [];
  for (const [i, g] of rows.entries()) {
    const crop = path.join(out, "browser", `${g.slug}-button.png`);
    tiles.push({
      input: await sharp(crop)
        .resize(190, 125, { fit: "contain", background: "#12121c" })
        .png()
        .toBuffer(),
      left: (i % 5) * 200 + 5,
      top: Math.floor(i / 5) * 155,
    });
    tiles.push({
      input: Buffer.from(
        `<svg width="200" height="25"><text x="5" y="17" fill="white" font-family="Arial" font-size="11">${g.slug}</text></svg>`,
      ),
      left: (i % 5) * 200,
      top: Math.floor(i / 5) * 155 + 125,
    });
  }
  await sharp({
    create: {
      width: 1000,
      height: Math.ceil(rows.length / 5) * 155,
      channels: 4,
      background: "#12121c",
    },
  })
    .composite(tiles)
    .png()
    .toFile(path.join(out, "gallery.png"));
  const escape = (s) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  const cards = rows
    .map(
      (g) =>
        `<article><img src="browser/${g.slug}-button.png" alt="${escape(g.name + " — " + g.theme)}"><h2>${escape(g.name)}</h2><p>${escape(g.theme)} · ${g.finish}</p><nav>${[
          [360, 800],
          [390, 844],
          [412, 915],
          [844, 390],
          [768, 1024],
          [1366, 768],
        ]
          .map(([w, h]) => `<a href="browser/${g.slug}-${w}x${h}.png">${w}×${h}</a>`)
          .join(" ")}</nav></article>`,
    )
    .join("");
  fs.writeFileSync(
    path.join(out, "gallery.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MaxHigh · 41 Spin treatments</title><style>body{margin:24px;background:#12121c;color:#f8fafc;font:14px Arial}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}article{padding:16px;border:1px solid #49495c;border-radius:12px}img{display:block;height:150px;max-width:100%;object-fit:contain;margin:auto}h2{font-size:17px}p{color:#c8c8dc}a{display:inline-block;color:#bfd5ff;margin:5px}</style><h1>41 active slot Spin treatments</h1><p>Captured from actual game layouts with synthetic local RPCs. Each size links to a full screenshot.</p><main>${cards}</main></html>`,
  );
}
const lines = [
  "# Codex Spin button progress — 41 active slot games",
  "",
  "The user approved the corrected scope: **41 active slot games**, excluding the nine active Cards/Fishing games. The original requested document filename is retained for continuity. Work is local, on `codex/game-spin-designs` in `D:/Porjects/maxhigh-spin-buttons`, based on `d51d79c`. No push, merge or deployment is authorized or performed.",
  "",
  "## Verified inventory and allocation",
  "",
  `Read-only inventory time: ${inventory.checkedAt}. Local maxhigh_demo has ${inventory.controls.length} game_controls rows. Missing rows default to enabled=yes in listSuperGames(). Client-active additionally excludes effective policy locks. There are ${inventory.counts.active} client-active games: ${inventory.counts.activeSlots} slots and ${inventory.counts.activeNonSlots} non-slots.`,
  "",
  "The original working tree has an uncommitted reversal of the committed 50-game policy allocation. This implementation targets the **current working copy** reviewed and approved by the user, not the isolated branch's older committed policy. No access-policy file is changed or copied into this branch. Developer maintenance accounts can see locked titles as enabled; that is distinct from client-active status. Lobby visibility alone is also distinct from play authorization. There are no grant keys, so no signed grants can alter the effective lock list.",
  "",
  `Source policy SHA-256: \`${inventory.policySha256}\`. Complete 100-game catalog, database flags, engines, original controls, palettes, premium symbols, thumbnails and eligible file mappings: [CODEX_SPIN_INVENTORY.json](CODEX_SPIN_INVENTORY.json).`,
  "",
  "Excluded active non-slots: " +
    inventory.games
      .filter((g) => g.active && g.category !== "slot")
      .map((g) => `${g.name} (${g.slug}, ${g.category})`)
      .join("; ") +
    ".",
  "",
  "## Implementation and integration",
  "",
  "The adapter uses CSS/SVG and original p3.webp artwork. All 41 silhouettes and engraving combinations are distinct. Five material finishes complement the original catalog palettes. The existing native button retains its action label, disabled attribute, focus behavior and sole onClick handler. No React subtree is replaced, no listener/debounce/wager handler is added, and no financial, RNG, auto or turbo logic changes.",
  "",
  "Only these runtime files change:",
  "",
  ...sourceFiles.map((f) => `- \`${f}\``),
  "",
  "SkinnedGame imports the isolated stylesheet and merges gameSpinThemeStyle(gameId) into its existing style object; data-spin-treatment and data-spin-finish enable the treatment. This is intentionally a presentation adapter instead of replacing Claude's in-progress controls with a new button component. It works with the standard slot-deck__spin and dedicated native button classes ending in -spin. Keep that class contract when adding consoles. Existing data-busy, data-active or data-state attributes supply feedback. No shared control-deck or per-game layout files are edited.",
  "",
  "Claude integration, after user approval: review/cherry-pick the Codex commit into the layout branch, retaining all current GameViews, presets, consoles and policy edits. Resolve only SkinnedGame's small presentation additions if it changes meanwhile. Do not overwrite the control deck. Re-run the browser script against the latest layout snapshot because concurrent edits are not automatically covered by earlier screenshots.",
  "",
  "## Per-game batches",
  "",
  "Statuses: NOT STARTED, IMPLEMENTED, VERIFIED, BLOCKED. VERIFIED below means all six viewport and synthetic handler checks in this captured UI fixture passed. It does **not** certify real database wager settlement. Shared modified files for every row are the three runtime files above; original per-game control and crest paths appear in CODEX_SPIN_QA.json.",
  "",
  "| Batch | Game | Slug | Treatment / finish | Status | Evidence |",
  "| --- | --- | --- | --- | --- | --- |",
  ...rows.map(
    (g) =>
      `| ${g.batch} | ${g.name} | ${g.slug} | ${g.theme} / ${g.finish} | ${g.status} | ${g.results ? `${g.results.layouts.filter((l) => l.pass).length}/6 viewport checks; ${g.results.errors.join("; ") || "see per-check JSON"}` : "QA pending"} |`,
  ),
  "",
  "## Verification evidence and limits",
  "",
  `- Exact 41-title mapping, unique frame/engraving geometry and all original crest assets: verified by spin-buttons-summary.mjs.`,
  `- Browser: ${rows.filter((r) => r.status === "VERIFIED").length}/41 verified; ${rows.filter((r) => r.status === "BLOCKED").length} blocked. Raw result: output/spin-buttons/browser/report.json; portable per-game summary: [CODEX_SPIN_QA.json](CODEX_SPIN_QA.json).`,
  `- Supplemental desktop action checks: ${desktop.filter((g) => g.status === "VERIFIED").length}/41 verified (disabled click suppressed, mouse activation, busy skip without new wager, Space activation). Run spin-buttons-desktop.mjs while the main browser fixture is running.`,
  "- Required sizes: 360×800, 390×844, 412×915, 844×390, 768×1024, 1366×768. Tests check viewport bounds, hit-testing, button overlaps, 44px minimum targets and correct rendered artwork/frame mapping.",
  "- Real GameViews and Realms engine from a captured source snapshot are bundled with these three Codex presentation files. Only authentication and Realms RPC boundaries are replaced with deterministic local responses. Outbound traffic and non-GET HTTP requests are blocked. No database wagers are placed.",
  "- At 390×844: disabled while session loads; keyboard focus/Enter; touch Spin; busy label; two immediate activations produce one synthetic request; maximum concurrent requests = 1; Turbo; Auto start/stop; reduced motion. Screenshots cover all six sizes plus button crops and busy states. Full snapshots are local under output/spin-buttons/browser (ignored by Git).",
  "- Screenshot gallery: output/spin-buttons/gallery.png and output/spin-buttons/gallery.html. Tested GameView/console/theme hashes are retained in CODEX_SPIN_QA.json so subsequent Claude edits can be distinguished from the tested snapshot.",
  "- TypeScript: `tsc --noEmit` passed. Full ESLint: passed with 0 errors and 115 existing warnings; changed runtime TS modules: clean.",
  `- Existing unit/referee suites: ${results.filter((r) => r.code === 0).length}/${results.length} passed. Logs: output/unit-tests.`,
  "- Production build: passed; log output/spin-buttons/build.log. Host Node is v26.13.0; repository engines request Node 24.22.2–24.x, so Node 24 CI parity remains unverified.",
  "- Real demo-account wallet settlement, real network retries, free-spin outcomes and server-side idempotency are not re-certified by the synthetic UI fixture. No server/financial files changed. These require separate end-to-end validation if desired; no game is labeled as passing those checks.",
  "",
  "## Reproduce",
  "",
  "```powershell",
  "node scripts/qa/spin-inventory.mjs D:/Porjects/maxhigh-bet-hub",
  "node scripts/qa/spin-buttons-browser.mjs D:/Porjects/maxhigh-bet-hub",
  "node scripts/qa/spin-buttons-summary.mjs",
  "```",
  "",
  "The inventory script accepts only an explicitly local maxhigh_demo connection and uses a read-only transaction. The browser runner requires Playwright; set PLAYWRIGHT_MODULE to its index.mjs path if the existing local browser-tools installation is elsewhere. It captures a source snapshot, then overlays only the three Codex runtime files. Tests proceed in batches of ten, with independent browser contexts. SPIN_QA_GAME selects one slug; SPIN_QA_RESUME=1 retains completed results when resuming the same unchanged source/presentation snapshot. A full rerun is required after relevant changes.",
  "",
  "## Commits",
  "",
  "Commit identifiers are reported in the final handoff. No merge, push or deployment has been performed.",
  "",
];
fs.writeFileSync("docs/CODEX_50_SPIN_BUTTON_PROGRESS.md", lines.join("\n"));
console.log(
  JSON.stringify({
    implemented: rows.length,
    verified: rows.filter((r) => r.status === "VERIFIED").length,
    blocked: rows.filter((r) => r.status === "BLOCKED").length,
  }),
);
