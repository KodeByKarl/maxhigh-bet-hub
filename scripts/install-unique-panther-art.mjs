/**
 * Install uniquely generated panther-clone art (not hue-tints).
 *   node scripts/install-unique-panther-art.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const ASSETS = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/d-Porjects-maxhigh-bet-hub/assets",
);

const GAMES = [
  "jade-jaguar",
  "ember-tiger",
  "lotus-lynx",
  "coral-cobra",
  "frost-fox",
  "solar-serpent",
  "honey-hive",
  "midnight-owl",
  "ruby-raven",
];

const THUMB_MAP = {
  "jade-jaguar": "jade_jaguar_thumb_v2.png",
  "ember-tiger": "ember_tiger_thumb_v2.png",
  "lotus-lynx": "lotus_lynx_thumb_v2.png",
  "coral-cobra": "coral_cobra_thumb_v2.png",
  "frost-fox": "frost_fox_thumb_v2.png",
  "solar-serpent": "solar_serpent_thumb_v2.png",
  "honey-hive": "honey_hive_thumb_v2.png",
  "midnight-owl": "midnight_owl_thumb_v2.png",
  "ruby-raven": "ruby_raven_thumb_v2.png",
};

const SYMBOL_OUT = ["wild.webp", "scatter.webp", "premium-a.png", "premium-b.png", "premium-c.png"];

const ROYAL_COLORS = {
  "jade-jaguar": { fill: "#34D399", edge: "#064E3B" },
  "ember-tiger": { fill: "#FB923C", edge: "#7C2D12" },
  "lotus-lynx": { fill: "#E879F9", edge: "#701A75" },
  "coral-cobra": { fill: "#2DD4BF", edge: "#115E59" },
  "frost-fox": { fill: "#38BDF8", edge: "#0C4A6E" },
  "solar-serpent": { fill: "#EAB308", edge: "#713F12" },
  "honey-hive": { fill: "#F59E0B", edge: "#92400E" },
  "midnight-owl": { fill: "#818CF8", edge: "#312E81" },
  "ruby-raven": { fill: "#F43F5E", edge: "#881337" },
};

async function copyThumb(id) {
  const src = path.join(ASSETS, THUMB_MAP[id]);
  const destName = THUMB_MAP[id].replace("_v2", "").replace(".png", ".png");
  // games.ts points to jade_jaguar_thumb.png etc
  const dest = path.join(ROOT, "public/images/thumbnails", destName.replace("_v2", ""));
  // Fix: THUMB_MAP values have _v2 — dest should be without v2 matching games.ts
  const finalDest = path.join(
    ROOT,
    "public/images/thumbnails",
    id.replace(/-/g, "_") + "_thumb.png",
  );
  await sharp(src).png().toFile(finalDest);
  console.log("thumb", finalDest);
}

async function copyBackdrop(id) {
  const src = path.join(ASSETS, id.replace(/-/g, "_") + "_backdrop.png");
  const outDir = path.join(ROOT, "public/images/symbols", id);
  await fs.promises.mkdir(outDir, { recursive: true });
  await sharp(src).webp({ quality: 88 }).toFile(path.join(outDir, "backdrop.webp"));
  // darker loading variant
  await sharp(src)
    .modulate({ brightness: 0.55 })
    .webp({ quality: 82 })
    .toFile(path.join(outDir, "loading-bg.webp"));
  console.log("backdrop", id);
}

async function cropSymbols(id) {
  const src = path.join(ASSETS, id.replace(/-/g, "_") + "_symbols.png");
  if (!fs.existsSync(src)) {
    console.warn("missing symbols", src);
    return;
  }
  const outDir = path.join(ROOT, "public/images/symbols", id);
  await fs.promises.mkdir(outDir, { recursive: true });
  const meta = await sharp(src).metadata();
  const w = meta.width || 1280;
  const h = meta.height || 720;
  // Icons sit in the middle band of the sheet — crop vertically too
  const top = Math.floor(h * 0.12);
  const cropH = Math.floor(h * 0.76);
  const slice = Math.floor(w / 5);
  for (let i = 0; i < 5; i++) {
    const left = i * slice;
    const width = i === 4 ? w - left : slice;
    const buf = await sharp(src)
      .extract({ left, top, width, height: cropH })
      .resize(256, 256, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      })
      .png()
      .toBuffer();
    const out = path.join(outDir, SYMBOL_OUT[i]);
    if (out.endsWith(".webp")) {
      await sharp(buf).webp({ quality: 90 }).toFile(out);
    } else {
      await fs.promises.writeFile(out, buf);
    }
  }
  console.log("symbols cropped", id);
}

async function makeRoyals(id) {
  const outDir = path.join(ROOT, "public/images/symbols", id);
  const c = ROYAL_COLORS[id];
  const letters = [
    ["10.png", "10"],
    ["J.png", "J"],
    ["Q.png", "Q"],
    ["K.webp", "K"],
    ["A.png", "A"],
  ];
  for (const [file, label] of letters) {
    const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#000"/>
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="${c.fill}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${c.edge}" stop-opacity="0.2"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="128" r="78" fill="url(#g)" stroke="${c.fill}" stroke-width="4"/>
  <text x="128" y="148" text-anchor="middle" font-family="Georgia, serif" font-size="${label === "10" ? 72 : 96}" font-weight="800" fill="${c.fill}" stroke="${c.edge}" stroke-width="2">${label}</text>
</svg>`);
    const out = path.join(outDir, file);
    if (file.endsWith(".webp")) {
      await sharp(svg).webp({ quality: 92 }).toFile(out);
    } else {
      await sharp(svg).png().toFile(out);
    }
  }
  console.log("royals", id);
}

async function bumpIconVersions() {
  // Bust browser cache for themed icons
  const themeFiles = GAMES.map((id) =>
    path.join(ROOT, "src/components/maxhigh", id, "theme.ts"),
  );
  for (const f of themeFiles) {
    let t = fs.readFileSync(f, "utf8");
    t = t.replace(/themedIconPack\("([^"]+)",\s*"[^"]+"\)/, 'themedIconPack("$1", "3")');
    fs.writeFileSync(f, t);
  }
  console.log("bumped icon versions to v=3");
}

async function main() {
  if (!fs.existsSync(ASSETS)) {
    throw new Error("Assets folder not found: " + ASSETS);
  }
  for (const id of GAMES) {
    console.log("\n==", id, "==");
    await copyThumb(id);
    await copyBackdrop(id);
    await cropSymbols(id);
    await makeRoyals(id);
  }
  await bumpIconVersions();
  console.log("\nUnique art installed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
