/**
 * Knock solid black backdrops out of Chinese New Year symbol PNGs.
 * Flood-fills near-black from image edges so subject shadows stay intact.
 *
 * Run: npx tsx scripts/knockout-chinese-bg.ts
 */
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public/images/symbols/chinese");
const BACKUP = join(ROOT, "_backup");

function isBgBlack(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Near-black / charcoal (low luminance, low chroma)
  return max < 42 && max - min < 18;
}

async function knockoutFile(file: string) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const out = Buffer.from(data);
  const n = width * height;
  const visited = new Uint8Array(n);
  const queue: number[] = [];

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * 4;
    if (!isBgBlack(out[o]!, out[o + 1]!, out[o + 2]!)) return;
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

  while (queue.length) {
    const i = queue.pop()!;
    const o = i * 4;
    out[o] = 0;
    out[o + 1] = 0;
    out[o + 2] = 0;
    out[o + 3] = 0;
    const x = i % width;
    const y = Math.floor(i / width);
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Soft fringe: fade near-black neighbors of cleared pixels
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const o = i * 4;
      if (out[o + 3]! === 0) continue;
      const r = out[o]!;
      const g = out[o + 1]!;
      const b = out[o + 2]!;
      if (!isBgBlack(r, g, b)) continue;
      let nearClear = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const ni = (y + dy) * width + (x + dx);
        if (out[ni * 4 + 3]! === 0) {
          nearClear = true;
          break;
        }
      }
      if (nearClear) {
        out[o + 3] = Math.round(out[o + 3]! * 0.15);
      }
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(file);
}

async function main() {
  if (!existsSync(ROOT)) {
    console.error("Missing", ROOT);
    process.exit(1);
  }
  mkdirSync(BACKUP, { recursive: true });

  const files = readdirSync(ROOT).filter((f) => f.endsWith(".png"));
  for (const name of files) {
    const src = join(ROOT, name);
    const bak = join(BACKUP, name);
    if (!existsSync(bak)) {
      copyFileSync(src, bak);
      console.log("backed up", name);
    } else {
      // Always process from backup so re-runs are idempotent
      copyFileSync(bak, src);
    }
    await knockoutFile(src);
    console.log("knocked out", name);
  }
  console.log("Done —", files.length, "files");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
