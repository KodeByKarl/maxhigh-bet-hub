/**
 * Clear black mats from Fortune Gems symbol tiles, then trim transparent padding
 * so gems fill the cell edge-to-edge.
 *
 * Run: node scripts/fix-fortune-gems-symbol-alpha.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "public", "images", "symbols", "fortune-gems");
const THRESH = 48;
/** Skip card-frame — already border-only. */
const SKIP = new Set(["card-frame.png"]);

async function punchAndTrim(filePath) {
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
    // Near-black mat (and very dark charcoal around gems)
    if (data[o] <= THRESH && data[o + 1] <= THRESH && data[o + 2] <= THRESH) {
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 0;
      cleared++;
    }
  }

  const punched = await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  // Trim transparent edges, then pad slightly so gold frame isn't clipped,
  // and fit into a square canvas for consistent cell fill.
  const trimmed = sharp(punched).trim({ threshold: 8 });
  const meta = await trimmed.metadata();
  const tw = meta.width ?? width;
  const th = meta.height ?? height;
  const side = Math.max(tw, th);
  const padX = Math.floor((side - tw) / 2);
  const padY = Math.floor((side - th) / 2);

  await sharp(punched)
    .trim({ threshold: 8 })
    .extend({
      top: padY,
      bottom: side - th - padY,
      left: padX,
      right: side - tw - padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(filePath);

  console.log("punched+trim", path.basename(filePath), `(cleared ${cleared})`);
}

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".png") && !SKIP.has(f));

for (const f of files) {
  await punchAndTrim(path.join(DIR, f));
}
console.log(`Done (${files.length} files)`);
