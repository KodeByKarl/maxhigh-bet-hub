/**
 * Convert clone symbol black backgrounds to true alpha (like GP assets).
 *   node scripts/fix-panther-symbol-alpha.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
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

const MAP = [
  ["10.png", "10.png"],
  ["J.png", "J.png"],
  ["Q.png", "Q.png"],
  ["K.webp", "K.png"],
  ["A.png", "A.png"],
  ["premium-a.png", "premium-a.png"],
  ["premium-b.png", "premium-b.png"],
  ["premium-c.png", "premium-c.png"],
  ["scatter.webp", "scatter.png"],
  ["wild.webp", "wild.png"],
];

async function toTransparentPng(srcPath, destPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const thr = 28;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] <= thr && data[i + 1] <= thr && data[i + 2] <= thr) {
      data[i + 3] = 0;
    }
  }
  const tmp = destPath + ".building.png";
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 0 })
    .resize(256, 256, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(tmp);

  try {
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
  } catch {
    // locked by Vite — write alternate then copy over when possible
  }
  try {
    fs.renameSync(tmp, destPath);
  } catch {
    fs.copyFileSync(tmp, destPath);
    fs.unlinkSync(tmp);
  }
}

async function main() {
  for (const g of GAMES) {
    const dir = path.join(ROOT, "public/images/symbols", g);
    for (const [srcName, destName] of MAP) {
      const src = path.join(dir, srcName);
      const dest = path.join(dir, destName);
      const input = fs.existsSync(src)
        ? src
        : fs.existsSync(dest)
          ? dest
          : null;
      if (!input) {
        console.warn("missing", path.join(dir, srcName));
        continue;
      }
      await toTransparentPng(input, dest);
    }
    console.log("fixed", g);
  }

  for (const g of GAMES) {
    const theme = path.join(ROOT, "src/components/maxhigh", g, "theme.ts");
    let t = fs.readFileSync(theme, "utf8");
    t = t.replace(
      /themedIconPack\("([^"]+)",\s*"[^"]+"\)/,
      'themedIconPack("$1", "4")',
    );
    fs.writeFileSync(theme, t);
  }
  console.log("themes bumped to v=4");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
