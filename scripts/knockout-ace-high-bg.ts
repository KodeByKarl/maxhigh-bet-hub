/**
 * Make Ace High chip / card-back PNGs truly transparent (no baked black/white boxes).
 * Chips: circular alpha mask only (preserves black numerals on white chips).
 * Card back: rounded-rect alpha mask (clears corner fill).
 * Run: npx tsx scripts/knockout-ace-high-bg.ts
 */
import sharp from "sharp";
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public/images/symbols/ace-high");
const ASSETS = join(
  process.env.USERPROFILE || "",
  ".cursor/projects/d-Projects-maxhigh-bet-hub/assets",
);

/** Restore originals from Cursor assets if present, else keep current. */
function restoreChipSources() {
  const map: Record<string, string> = {
    "1.png": "chip-1.png",
    "5.png": "chip-5.png",
    "10.png": "chip-10.png",
    "25.png": "chip-25.png",
    "100.png": "chip-100.png",
  };
  for (const [dest, src] of Object.entries(map)) {
    const from = join(ASSETS, src);
    const to = join(ROOT, "chips", dest);
    if (existsSync(from)) {
      copyFileSync(from, to);
      console.log("restored", dest);
    }
  }
  const backSrc = join(ASSETS, "ace-high-card-back.png");
  if (existsSync(backSrc)) {
    copyFileSync(backSrc, join(ROOT, "card-back.png"));
    console.log("restored card-back.png");
  }
}

async function circularChipMask(file: string) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const out = Buffer.from(data);
  const cx = width / 2;
  const cy = height / 2;

  // Detect chip radius from opaque-ish non-background pixels along mid row
  const midY = Math.floor(cy);
  let minX = width;
  let maxX = 0;
  for (let x = 0; x < width; x++) {
    const i = (midY * width + x) * 4;
    const r = out[i]!;
    const g = out[i + 1]!;
    const b = out[i + 2]!;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // Background is near-black charcoal; chip has either bright or saturated color
    const isBg = max < 55 && max - min < 18;
    if (!isBg) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  const detectedR = maxX > minX ? (maxX - minX) / 2 + 2 : Math.min(width, height) * 0.46;
  const radius = Math.min(detectedR, Math.min(width, height) * 0.495);
  const feather = Math.max(2, width * 0.004);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (dist > radius + feather) {
        out[i + 3] = 0;
      } else if (dist > radius) {
        const t = 1 - (dist - radius) / feather;
        out[i + 3] = Math.round(255 * Math.max(0, Math.min(1, t)));
      } else {
        out[i + 3] = 255;
      }
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(file);
  console.log("chip OK", file.replace(process.cwd(), ""), `r=${radius.toFixed(1)}`);
}

async function roundedCardMask(file: string) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const out = Buffer.from(data);

  // Inset slightly; corner radius ~6% of short side (matches generated card art)
  const inset = Math.min(width, height) * 0.012;
  const radius = Math.min(width, height) * 0.055;
  const left = inset;
  const right = width - 1 - inset;
  const top = inset;
  const bottom = height - 1 - inset;
  const feather = Math.max(1.5, width * 0.003);

  function distOutsideRoundRect(x: number, y: number): number {
    // Distance outside rounded rect (0 = inside)
    const cx = Math.min(Math.max(x, left + radius), right - radius);
    const cy = Math.min(Math.max(y, top + radius), bottom - radius);
    // If inside the inner box (excluding corner circles), distance 0
    const inInnerX = x >= left + radius && x <= right - radius;
    const inInnerY = y >= top + radius && y <= bottom - radius;
    if (inInnerX && y >= top && y <= bottom) return 0;
    if (inInnerY && x >= left && x <= right) return 0;
    // Corner circles
    if (x < left + radius && y < top + radius) {
      return Math.hypot(x - (left + radius), y - (top + radius)) - radius;
    }
    if (x > right - radius && y < top + radius) {
      return Math.hypot(x - (right - radius), y - (top + radius)) - radius;
    }
    if (x < left + radius && y > bottom - radius) {
      return Math.hypot(x - (left + radius), y - (bottom - radius)) - radius;
    }
    if (x > right - radius && y > bottom - radius) {
      return Math.hypot(x - (right - radius), y - (bottom - radius)) - radius;
    }
    // Outside straight edges
    if (x < left) return left - x;
    if (x > right) return x - right;
    if (y < top) return top - y;
    if (y > bottom) return y - bottom;
    return 0;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const d = distOutsideRoundRect(x + 0.5, y + 0.5);
      if (d <= 0) {
        out[i + 3] = 255;
      } else if (d < feather) {
        out[i + 3] = Math.round(255 * (1 - d / feather));
      } else {
        out[i + 3] = 0;
      }
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(file);
  console.log("card OK", file.replace(process.cwd(), ""));
}

async function main() {
  restoreChipSources();

  const chipDir = join(ROOT, "chips");
  for (const name of readdirSync(chipDir)) {
    if (!name.endsWith(".png")) continue;
    await circularChipMask(join(chipDir, name));
  }
  await roundedCardMask(join(ROOT, "card-back.png"));
  console.log("Done — shape-masked transparent PNGs.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
