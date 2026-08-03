/**
 * Rebuild Fire Spike card-frame as a true border-only PNG:
 * - keep ornate outer ring
 * - force entire interior transparent (no checkerboard / white / black circle)
 *
 * Run: node scripts/fix-fire-spike-frame-center.mjs
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
  "fire-spike",
  "card-frame.png",
);

const { data, info } = await sharp(FILE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
if (channels !== 4) throw new Error(`Expected RGBA, got ${channels}`);

const cx = (width - 1) / 2;
const cy = (height - 1) / 2;
const half = Math.min(width, height) / 2;
/** Border thickness as fraction of half-size — keep only outer ornate ring. */
const borderFrac = 0.18;
const innerR = half * (1 - borderFrac);

function isCheckerOrWhite(r, g, b) {
  // Pure / near white
  if (r > 200 && g > 200 && b > 200) return true;
  // Light gray checker tiles (~180–220)
  if (r > 160 && g > 160 && b > 160 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18) return true;
  // Mid gray checker (~120–150)
  if (r > 110 && r < 170 && g > 110 && g < 170 && b > 110 && b < 170 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12)
    return true;
  return false;
}

function isOrnateBorder(r, g, b) {
  // Molten orange / gold filigree
  if (r > 140 && g > 60 && g < 200 && b < 120 && r > g && r - b > 40) return true;
  // Dark metal rim (not pure black, not gray checker)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 90 && max - min < 25 && max > 12) return true;
  // Warm dark bronze
  if (r > 40 && r < 120 && g > 20 && g < 80 && b < 50 && r > g) return true;
  return false;
}

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

    // Always clear interior (inside the ring)
    if (dist < innerR) {
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 0;
      cleared++;
      continue;
    }

    // Clear checkerboard / white leftovers anywhere
    if (isCheckerOrWhite(r, g, b)) {
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 0;
      cleared++;
      continue;
    }

    // Keep ornate / metal border pixels; clear anything else in the ring band
    if (!isOrnateBorder(r, g, b)) {
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 0;
      cleared++;
      continue;
    }

    kept++;
  }
}

await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(FILE);
console.log(`Frame cleaned — kept ${kept} border px, cleared ${cleared}`);
