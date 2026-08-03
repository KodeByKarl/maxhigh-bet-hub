/**
 * Clear pure-black mats from Frontier Gold tiles while keeping warm brown vignettes.
 * Run: node scripts/fix-frontier-symbol-alpha.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "public", "images", "symbols", "frontier-gold");
const THRESH = 12;

async function punchFile(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) throw new Error(`Expected RGBA, got ${channels}`);

  let cleared = 0;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (data[o + 3] < 8) continue;
    if (data[o] <= THRESH && data[o + 1] <= THRESH && data[o + 2] <= THRESH) {
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 0;
      cleared++;
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(filePath);
  console.log("punched", path.basename(filePath), `(cleared ${cleared})`);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".png"));
for (const f of files) {
  await punchFile(path.join(DIR, f));
}
console.log(`Done (${files.length} files)`);
