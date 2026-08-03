/**
 * Punch transparent center into Fortune Gems card-frame so it can overlay gems.
 * Run: node scripts/fix-fortune-gems-frame-center.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(
  __dirname,
  "..",
  "public",
  "images",
  "symbols",
  "fortune-gems",
  "card-frame.png",
);

const { data, info } = await sharp(FILE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
if (channels !== 4) throw new Error(`Expected RGBA, got ${channels}`);

const cx = (width - 1) / 2;
const cy = (height - 1) / 2;
const half = Math.min(width, height) / 2;
/** Keep outer ornate gold ring; clear interior. */
const borderFrac = 0.2;
const innerR = half * (1 - borderFrac);

let cleared = 0;
let kept = 0;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const o = (y * width + x) * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < innerR) {
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 0;
      cleared++;
      continue;
    }

    // Drop near-black / empty voids in the border ring
    if (r < 25 && g < 25 && b < 25) {
      data[o + 3] = 0;
      cleared++;
      continue;
    }

    kept++;
  }
}

await sharp(data, { raw: { width, height, channels: 4 } })
  .png()
  .toFile(FILE);

console.log(`Fortune Gems frame: cleared=${cleared} kept=${kept} → ${FILE}`);
