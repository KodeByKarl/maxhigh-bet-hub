/**
 * Fruit Riot symbols: punch pink matte → alpha, shrink tiles.
 * Frame: keep ornate border, clear center window.
 * Run: node scripts/fix-fruit-riot-symbol-alpha.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "public", "images", "symbols", "fruit-riot");
const OUT_SIZE = 512;

/** Hot-pink matte used in generated icons (#ff4d9e ± variance). */
function isPinkBg(r, g, b, a) {
  if (a < 8) return true;
  // Magenta / hot pink: high R, mid B, lower G, saturated
  if (r < 170) return false;
  if (g > 190) return false;
  if (b < 80) return false;
  if (r - g < 40) return false;
  // Avoid eating red fruit flesh: fruit usually has lower B than pink matte
  // Pink matte typically B > 120 and G in 40–160
  if (g >= 30 && g <= 175 && b >= 110 && b <= 230 && r >= 200) return true;
  // Lighter pink wash near edges
  if (r >= 230 && g >= 90 && g <= 200 && b >= 140 && b <= 230 && r - g > 30) return true;
  return false;
}

async function punchSymbol(filePath) {
  let { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) throw new Error(`Expected RGBA, got ${channels}`);

  const visited = new Uint8Array(width * height);
  const queue = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * 4;
    if (!isPinkBg(data[o], data[o + 1], data[o + 2], data[o + 3])) return;
    visited[i] = 1;
    queue.push(i);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  let cleared = 0;
  while (queue.length) {
    const i = queue.pop();
    const o = i * 4;
    data[o] = 0;
    data[o + 1] = 0;
    data[o + 2] = 0;
    data[o + 3] = 0;
    cleared++;
    const x = i % width;
    const y = (i / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Soft fringe: near-pink pixels adjacent to transparent become semi-transparent
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const o = i * 4;
      if (data[o + 3] < 8) continue;
      if (!isPinkBg(data[o], data[o + 1], data[o + 2], data[o + 3])) continue;
      // only if neighbor is transparent (fringe leftover)
      let nearClear = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const no = ((y + dy) * width + (x + dx)) * 4;
        if (data[no + 3] < 8) nearClear = true;
      }
      if (nearClear) {
        data[o] = 0;
        data[o + 1] = 0;
        data[o + 2] = 0;
        data[o + 3] = 0;
        cleared++;
      }
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .resize(OUT_SIZE, OUT_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(filePath);

  console.log("symbol", path.basename(filePath), `cleared ${cleared}`);
}

async function punchFrame(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) throw new Error(`Expected RGBA`);

  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const half = Math.min(width, height) / 2;
  // Keep outer ~20% as border ring / corners
  const borderFrac = 0.2;
  const inner = half * (1 - borderFrac);

  let cleared = 0;
  let kept = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const dx = (x - cx) / half;
      const dy = (y - cy) / half;
      // Squircle-ish interior: clear center rounded square
      const nx = Math.abs(dx);
      const ny = Math.abs(dy);
      const inInner =
        nx < 1 - borderFrac &&
        ny < 1 - borderFrac &&
        Math.pow(nx / (1 - borderFrac), 4) + Math.pow(ny / (1 - borderFrac), 4) < 1;

      if (inInner) {
        data[o] = 0;
        data[o + 1] = 0;
        data[o + 2] = 0;
        data[o + 3] = 0;
        cleared++;
        continue;
      }

      // Also clear flat pink fill that isn't ornate (high pink, low contrast)
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.92 && isPinkBg(r, g, b, data[o + 3]) && sat < 90) {
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

  await sharp(data, { raw: { width, height, channels: 4 } })
    .resize(OUT_SIZE, OUT_SIZE, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(filePath);

  console.log("frame", path.basename(filePath), `kept ${kept}, cleared ${cleared}`);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".png"));
for (const f of files) {
  const fp = path.join(DIR, f);
  if (f === "card-frame.png") await punchFrame(fp);
  else await punchSymbol(fp);
}
console.log(`Done (${files.length} files)`);
