/**
 * Rebuild Chinese New Year symbols: knockout black BG → crop → square 1024 PNG.
 * Always writes via temp file (never same-path sharp I/O).
 *
 * Run: npx tsx scripts/rebuild-chinese-symbols.ts
 */
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public/images/symbols/chinese");
const BACKUP = join(ROOT, "_backup");

function isBgBlack(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max < 42 && max - min < 18;
}

async function knockoutBuffer(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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

  return { data: out, width, height };
}

async function rebuildOne(name: string) {
  const bak = join(BACKUP, name);
  const dest = join(ROOT, name);
  if (!existsSync(bak)) {
    console.warn("no backup", name);
    return;
  }

  const srcBuf = await sharp(bak).png().toBuffer();
  const { data, width, height } = await knockoutBuffer(srcBuf);

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    console.warn("empty after knockout", name);
    return;
  }

  const pad = Math.round(Math.max(width, height) * 0.02);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const side = Math.max(cw, ch);
  const ox = Math.floor((side - cw) / 2);
  const oy = Math.floor((side - ch) / 2);

  const tmp = join(ROOT, `${name}.rebuild.tmp`);
  await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .extend({
      top: oy,
      bottom: side - ch - oy,
      left: ox,
      right: side - cw - ox,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(1024, 1024, { fit: "fill" })
    .png()
    .toFile(tmp);

  if (existsSync(dest)) unlinkSync(dest);
  renameSync(tmp, dest);

  const meta = await sharp(dest).metadata();
  console.log(name, `→ ${meta.width}x${meta.height}`);
}

async function main() {
  mkdirSync(BACKUP, { recursive: true });
  // Ensure backups exist from current originals if missing
  for (const name of readdirSync(ROOT).filter((f) => f.endsWith(".png"))) {
    const bak = join(BACKUP, name);
    if (!existsSync(bak)) copyFileSync(join(ROOT, name), bak);
  }

  const names = readdirSync(BACKUP).filter((f) => f.endsWith(".png"));
  for (const name of names) {
    await rebuildOne(name);
  }
  console.log("Done", names.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
