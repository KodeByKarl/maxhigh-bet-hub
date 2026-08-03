/**
 * Punch transparent corners out of Starlight Ace symbol tiles.
 * Flood-fills near-black pixels from image edges → alpha 0.
 * Run: node scripts/fix-starlight-symbol-alpha.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "public", "images", "symbols", "starlight-ace");

/** Max channel value to treat as "background black" */
const THRESH = 28;

function isBg(r, g, b, a) {
  if (a < 8) return true;
  return r <= THRESH && g <= THRESH && b <= THRESH;
}

async function punchFile(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) throw new Error(`Expected RGBA, got ${channels} in ${filePath}`);

  const visited = new Uint8Array(width * height);
  const queue = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * 4;
    if (!isBg(data[o], data[o + 1], data[o + 2], data[o + 3])) return;
    visited[i] = 1;
    queue.push(i);
  };

  // Seed entire border (handles black framing better than 4 corners alone)
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  let qi = 0;
  while (qi < queue.length) {
    const i = queue[qi++];
    const x = i % width;
    const y = (i / width) | 0;
    const o = i * 4;
    data[o] = 0;
    data[o + 1] = 0;
    data[o + 2] = 0;
    data[o + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  const out = await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
  await fs.promises.writeFile(filePath, out);
  return queue.length;
}

async function main() {
  const files = (await fs.promises.readdir(DIR)).filter((f) => f.endsWith(".png"));
  if (!files.length) throw new Error(`No PNGs in ${DIR}`);
  for (const f of files) {
    const p = path.join(DIR, f);
    const n = await punchFile(p);
    console.log(`✔ ${f} — cleared ${n.toLocaleString()} bg pixels`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
