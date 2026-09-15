/**
 * Install HQ ornate symbol sheets for panther clones.
 *   node scripts/install-hq-panther-symbols.mjs
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

const ROYAL_OUT = ["10.png", "J.png", "Q.png", "K.png", "A.png"];
const SPECIAL_OUT = ["wild.png", "scatter.png", "premium-a.png", "premium-b.png", "premium-c.png"];

async function knockBlackToPng(inputBufOrPath, destPath) {
  const { data, info } = await sharp(inputBufOrPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const thr = 26;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] <= thr && data[i + 1] <= thr && data[i + 2] <= thr) data[i + 3] = 0;
  }
  const tmp = destPath + ".building.png";
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 0 })
    .resize(320, 320, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(tmp);
  try {
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
  } catch {
    /* locked */
  }
  try {
    fs.renameSync(tmp, destPath);
  } catch {
    fs.copyFileSync(tmp, destPath);
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

async function cropSheet(sheetPath, outNames, outDir) {
  if (!fs.existsSync(sheetPath)) {
    console.warn("missing sheet", sheetPath);
    return;
  }
  const meta = await sharp(sheetPath).metadata();
  const w = meta.width || 1280;
  const h = meta.height || 720;
  const top = Math.floor(h * 0.08);
  const cropH = Math.floor(h * 0.84);
  const slice = Math.floor(w / 5);
  for (let i = 0; i < 5; i++) {
    const left = i * slice;
    const width = i === 4 ? w - left : slice;
    const buf = await sharp(sheetPath)
      .extract({ left, top, width, height: cropH })
      .png()
      .toBuffer();
    await knockBlackToPng(buf, path.join(outDir, outNames[i]));
  }
}

async function main() {
  for (const id of GAMES) {
    const stem = id.replace(/-/g, "_");
    const outDir = path.join(ROOT, "public/images/symbols", id);
    await fs.promises.mkdir(outDir, { recursive: true });
    console.log("\n==", id, "==");
    await cropSheet(path.join(ASSETS, `${stem}_hq_royals.png`), ROYAL_OUT, outDir);
    await cropSheet(path.join(ASSETS, `${stem}_hq_specials.png`), SPECIAL_OUT, outDir);
    console.log("installed HQ icons");
  }

  for (const id of GAMES) {
    const theme = path.join(ROOT, "src/components/maxhigh", id, "theme.ts");
    let t = fs.readFileSync(theme, "utf8");
    t = t.replace(
      /themedIconPack\("([^"]+)",\s*"[^"]+"\)/,
      'themedIconPack("$1", "5")',
    );
    fs.writeFileSync(theme, t);
  }
  console.log("\nbumped icon cache to v=5");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
