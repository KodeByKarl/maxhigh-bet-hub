import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const proofDir = process.env.PROOF_DIR ?? "output/client-proof-50-games-2026-10-28";
const results = JSON.parse(fs.readFileSync(path.join(proofDir, "results.json"), "utf8"));
const passed = results.filter((result) => result.pass).length;
const failed = results.length - passed;

const thumbWidth = 206;
const thumbHeight = 458;
const labelHeight = 44;
const columns = 5;
const rows = Math.ceil(results.length / columns);
const composites = [];

for (let index = 0; index < results.length; index += 1) {
  const result = results[index];
  const screenshot = await sharp(path.join(proofDir, result.screenshot))
    .resize(thumbWidth, thumbHeight, { fit: "cover", position: "top" })
    .jpeg({ quality: 80 })
    .toBuffer();
  const color = result.pass ? "#0b3b2c" : "#5a1515";
  const label = await sharp({
    create: { width: thumbWidth, height: labelHeight, channels: 4, background: color },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${thumbWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><text x="8" y="18" fill="white" font-family="Arial" font-size="11" font-weight="700">${String(index + 1).padStart(2, "0")} · ${result.pass ? "PASS" : "FAIL"}</text><text x="8" y="34" fill="white" font-family="Arial" font-size="11">${result.name.replaceAll("&", "&amp;")}</text></svg>`,
        ),
      },
    ])
    .png()
    .toBuffer();
  const left = (index % columns) * thumbWidth;
  const top = Math.floor(index / columns) * (thumbHeight + labelHeight);
  composites.push({ input: screenshot, left, top });
  composites.push({ input: label, left, top: top + thumbHeight });
}

await sharp({
  create: {
    width: thumbWidth * columns,
    height: (thumbHeight + labelHeight) * rows,
    channels: 3,
    background: "#060410",
  },
})
  .composite(composites)
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(path.join(proofDir, "contact-sheet.jpg"));

const rowsMarkdown = results
  .map(
    (result) =>
      `| ${String(result.order).padStart(2, "0")} | ${result.name} | ${result.pass ? "PASS" : "FAIL"} | ${result.layout?.horizontalOverflow ? "Yes" : "No"} | ${result.layout?.spinVisible ? "Yes" : "No"} | [Screenshot](${result.screenshot.replaceAll(" ", "%20")}) |`,
  )
  .join("\n");

fs.writeFileSync(
  path.join(proofDir, "REPORT.md"),
  `# MaxHigh 50-game Android layout proof\n\nGenerated: 2026-10-28 (Asia/Singapore)\n\n- Viewport: 412 × 915 CSS pixels\n- Browser profile: Android 14 / Pixel 7 emulation in Chromium\n- Flow: Dashboard card → game details → Play Now → loaded gameplay screen\n- Passed: ${passed}/${results.length}\n- Failed: ${failed}/${results.length}\n- Validation: no horizontal document overflow, Spin control visible inside the viewport, no captured uncaught exception, and no HTTP response ≥ 400 during capture.\n\n> This is automated browser evidence. Final touch feel, Android system navigation insets, browser chrome behavior, and performance should still be confirmed on a physical Android phone.\n\n## Evidence\n\n![50-game contact sheet](contact-sheet.jpg)\n\n| # | Game | Result | Horizontal overflow | Spin visible | Evidence |\n|---:|---|:---:|:---:|:---:|---|\n${rowsMarkdown}\n`,
);

const cards = results
  .map(
    (result) =>
      `<figure class="${result.pass ? "pass" : "fail"}"><a href="${result.screenshot}"><img src="${result.screenshot}" alt="${result.name.replaceAll('"', "&quot;")} Android game screen"></a><figcaption><strong>${String(result.order).padStart(2, "0")} · ${result.name}</strong><span>${result.pass ? "PASS" : "FAIL"}</span></figcaption></figure>`,
  )
  .join("\n");

fs.writeFileSync(
  path.join(proofDir, "index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MaxHigh 50-game proof</title><style>body{margin:0;background:#080512;color:#fff;font:14px Arial,sans-serif}header{padding:28px max(20px,4vw);background:#120a25;position:sticky;top:0;z-index:2}h1{margin:0 0 8px;font-size:clamp(24px,4vw,42px)}p{margin:0;color:#c8bddf}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;padding:24px max(16px,3vw)}figure{margin:0;padding:10px;border:1px solid #362754;border-radius:16px;background:#130c22}figure.pass{border-color:#1e7657}figure.fail{border-color:#b33}img{display:block;width:100%;aspect-ratio:412/915;object-fit:cover;object-position:top;border-radius:10px;background:#000}figcaption{display:flex;justify-content:space-between;gap:12px;padding:10px 2px 2px;line-height:1.35}figcaption span{color:#78f0b8;font-weight:700}.fail figcaption span{color:#ff8b8b}</style></head><body><header><h1>MaxHigh · 50-game Android proof</h1><p>${passed}/${results.length} passed · 412×915 viewport · generated 2026-10-28</p></header><main class="grid">${cards}</main></body></html>`,
);

console.log(`Built client proof index: ${passed}/${results.length} passed.`);
