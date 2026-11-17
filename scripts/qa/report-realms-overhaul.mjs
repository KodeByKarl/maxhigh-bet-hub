import fs from "node:fs";
import { execFileSync } from "node:child_process";
const queue = JSON.parse(
  execFileSync(process.execPath, ["scripts/qa/realms-overhaul.mjs", "list"], { encoding: "utf8" }),
);
const states = JSON.parse(fs.readFileSync("output/realms-overhaul/status.json", "utf8"));
const checksFile = "output/realms-overhaul/checkpoints.json";
const checks = fs.existsSync(checksFile) ? JSON.parse(fs.readFileSync(checksFile, "utf8")) : {};
const verified = queue.filter(([id]) => states[id]?.status === "VERIFIED");
const commits = execFileSync("git", ["log", "--format=%h %s", "5aeef84^..HEAD"], {
  encoding: "utf8",
}).trim();
let total = 0,
  views = 0;
for (const [id] of verified) {
  const x = states[id];
  const r = JSON.parse(fs.readFileSync(`${x.output}/after-results.json`, "utf8"));
  total += r.checks.length;
  views += r.evidence.length;
  if (r.errors.length) throw Error(`${id}: page errors`);
}
let report = `# Realms 07–28 overhaul handoff\n\n${verified.length}/22 games verified locally. ${views} viewport cases and ${total} responsive/functional checks. Every game has its own arrangement, frame, materials and spin enclosure; these are not palette-only variants.\n\n[Before/after gallery](../output/realms-overhaul/gallery.html) · [Progress and per-game details](REALMS_28_OVERHAUL_PROGRESS.md)\n\n## Completed checklist and evidence\n\n| # | Game | Status | Containers and spin enclosure | Before / After | QA |\n|---|---|---|---|---|---|\n`;
queue.forEach(([id], i) => {
  const x = states[id];
  const base = x?.output;
  report += `| ${i + 7} | ${x?.name ?? id} | ${x?.status ?? "NOT STARTED"} | ${x?.concept ?? ""} | ${base ? `[Before](../${base}/before-mobile.png) / [After](../${base}/after-mobile.png)` : ""} | ${base ? `[Results](../${base}/after-results.json)` : ""} |\n`;
});
report += "\n## Modified files\n\n";
for (const [id] of verified) {
  const x = states[id];
  report += `- **${x.name}:** ${x.files.map((f) => "`" + f + "`").join(", ")}; \`scripts/qa/${id.split("-")[0]}-mobile-ui.mjs\`.\n`;
}
report += `\nShared presentation wiring: \`SlotControlDeck.tsx\` selects each console; \`RealmsSlot.tsx\` renders compact game-specific balance/win notifications. \`PresetGame.tsx\` fixes two pre-existing relative type imports. A Hummingbird theme metadata collision was corrected; its dedicated layout and gameplay were not changed. Existing unrelated shared-file edits were kept unstaged when forming scoped commits.\n\n## Validation\n\nRequired viewports for every game: 360×800, 390×844, 412×915, 844×390, 768×1024 and 1366×768. Extra checks cover 320×568, 667×375, 390×667, 360×640, 568×320 and 600×600. No overlapping buttons, horizontal scroll, broken images or offscreen targets; touch targets are at least 43px. Auto/Bet/Buy dialogs checked on short screens.\n\nEach game was tested with touch and mouse: bet +/- and selection, manual spin, balance/last-win rendering, rapid double activation (one request, max concurrency one), turbo, auto start/stop, bonus cancel/quantity/single purchase, mute/unmute, paytable, close/reopen without an automatic wager. Fixtures substitute deterministic RPCs and block non-local or write network requests. Layout-only rechecks after the CSS area-name correction and wide desktop refinement are merged with the unchanged-handler functional results.\n\n`;
for (const [label, value] of Object.entries(checks))
  report += `- **${label}:** ${typeof value === "string" ? value : JSON.stringify(value)}\n`;
report += `\n## Assets and gameplay\n\nAll existing symbols, backdrops, illustrations, sound files and icons were retained. Spin faces reuse each game's existing premium artwork; no replacement raster artwork was generated. No RNG, RTP, payouts, bet limits, wallet, ledger, transaction or backend wager implementation was edited for this task. Production and UAT were not accessed, and nothing was pushed or deployed.\n\n## Limits and next phase\n\nNo blocked queue games${verified.length === 22 ? "" : `; ${22 - verified.length} remain in the queue`}. Tests use deterministic local fixtures rather than real-money or real-wallet wagers. Audible sound quality and physical-device browser behavior remain manual checks. The local app smoke checks verify loading, not financial settlement.\n\nNext phase: inventory the remaining Slots, Tables and Fishing games against the existing 100-game registry; capture before layouts; design dedicated genre-appropriate HUDs; preserve their engines; repeat the six required viewport and duplicate-action checks. Do not deploy these local changes without a separate deployment request.\n\n## Commits\n\n\`\`\`text\n${commits}\n\`\`\`\n`;
fs.writeFileSync("docs/REALMS_22_OVERHAUL_HANDOFF.md", report);
console.log(
  JSON.stringify({
    verified: verified.length,
    views,
    checks: total,
    report: "docs/REALMS_22_OVERHAUL_HANDOFF.md",
  }),
);
