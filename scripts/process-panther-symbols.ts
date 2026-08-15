/**
 * Knock dark jungle / black scene BGs out of Golden Panther symbols.
 * Writes to public/images/symbols/gp/ (fresh folder — Vite-safe).
 *
 * Run: npx tsx scripts/process-panther-symbols.ts
 */
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "public/images/symbols/panther");
const DEST = join(process.cwd(), "public/images/symbols/gp");

const SKIP = new Set(["backdrop.png", "loading-bg.png", "mascot.png", "stone_slot_frame.png"]);

function isBg(r: number, g: number, b: number, loose = false): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Bright gold / jewel / letter colors — never treat as BG
  if (luma > (loose ? 95 : 80) && chroma > 25) return false;
  if (r > 140 && g > 95 && r - b > 30) return false; // gold
  if (max > 160 && chroma > 40) return false; // vivid gems / letters

  // Near-black
  if (max <= (loose ? 52 : 38)) return true;
  // Dark muddy jungle (low luma)
  if (luma <= (loose ? 58 : 42) && max <= (loose ? 95 : 75)) return true;
  // Dark green foliage
  if (g >= r && g >= b && luma < (loose ? 70 : 55) && g < 110) return true;
  // Dark brown stone/ruins
  if (r >= g && g >= b && luma < (loose ? 62 : 48) && chroma < 45 && max < 100) return true;

  return false;
}

async function processOne(name: string) {
  const src = join(SRC, name);
  const dest = join(DEST, name);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const out = Buffer.from(data);
  const n = w * h;
  const cleared = new Uint8Array(n);

  const clearAt = (i: number) => {
    const o = i * 4;
    out[o] = 0;
    out[o + 1] = 0;
    out[o + 2] = 0;
    out[o + 3] = 0;
    cleared[i] = 1;
  };

  const queue: number[] = [];
  const push = (x: number, y: number, loose: boolean) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (cleared[i]) return;
    const o = i * 4;
    if (out[o + 3]! < 8) {
      cleared[i] = 1;
      queue.push(i);
      return;
    }
    if (!isBg(out[o]!, out[o + 1]!, out[o + 2]!, loose)) return;
    clearAt(i);
    queue.push(i);
  };

  for (let x = 0; x < w; x++) {
    push(x, 0, false);
    push(x, h - 1, false);
  }
  for (let y = 0; y < h; y++) {
    push(0, y, false);
    push(w - 1, y, false);
  }

  while (queue.length) {
    const i = queue.pop()!;
    const x = i % w;
    const y = (i / w) | 0;
    push(x + 1, y, false);
    push(x - 1, y, false);
    push(x, y + 1, false);
    push(x, y - 1, false);
  }

  for (let pass = 0; pass < 8; pass++) {
    const frontier: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!cleared[i]) continue;
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (cleared[ni]) continue;
        const o = ni * 4;
        if (out[o + 3]! < 8 || isBg(out[o]!, out[o + 1]!, out[o + 2]!, true)) {
          frontier.push(ni);
        }
      }
    }
    if (!frontier.length) break;
    for (const i of frontier) if (!cleared[i]) clearAt(i);
  }

  // Large enclosed dark islands
  const visited = new Uint8Array(n);
  for (let start = 0; start < n; start++) {
    if (visited[start] || cleared[start]) continue;
    const o0 = start * 4;
    if (out[o0 + 3]! < 8 || !isBg(out[o0]!, out[o0 + 1]!, out[o0 + 2]!, true)) {
      visited[start] = 1;
      continue;
    }
    const comp: number[] = [];
    const q = [start];
    visited[start] = 1;
    while (q.length) {
      const i = q.pop()!;
      const o = i * 4;
      if (out[o + 3]! < 8 || !isBg(out[o]!, out[o + 1]!, out[o + 2]!, true)) continue;
      comp.push(i);
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (visited[ni]) continue;
        visited[ni] = 1;
        const no = ni * 4;
        if (out[no + 3]! >= 8 && isBg(out[no]!, out[no + 1]!, out[no + 2]!, true)) q.push(ni);
      }
    }
    if (comp.length >= 220) for (const i of comp) clearAt(i);
  }

  // Soft fringe
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (cleared[i]) continue;
      const o = i * 4;
      if (!isBg(out[o]!, out[o + 1]!, out[o + 2]!, true)) continue;
      let near = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        if (cleared[(y + dy) * w + (x + dx)]) {
          near = true;
          break;
        }
      }
      if (near) out[o + 3] = Math.round(out[o + 3]! * 0.1);
    }
  }

  // Crop → square
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (out[(y * w + x) * 4 + 3]! > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const pad = Math.round(Math.max(w, h) * 0.02);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const side = Math.max(cw, ch);
  const ox = Math.floor((side - cw) / 2);
  const oy = Math.floor((side - ch) / 2);

  const squared = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .extend({
      top: oy,
      bottom: side - ch - oy,
      left: ox,
      right: side - cw - ox,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const png = await sharp(squared).resize(1024, 1024, { fit: "fill" }).png().toBuffer();
  writeFileSync(dest, png);

  let clear = 0;
  const { data: d2 } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < 1024 * 1024; i++) if (d2[i * 4 + 3]! < 8) clear++;
  console.log(name, `clear=${((clear / (1024 * 1024)) * 100).toFixed(1)}%`);
}

async function main() {
  mkdirSync(DEST, { recursive: true });
  const files = readdirSync(SRC).filter((f) => f.endsWith(".png") && !SKIP.has(f));
  for (const name of files) {
    // Keep originals as reference copies if needed
    const bakDir = join(SRC, "_backup");
    mkdirSync(bakDir, { recursive: true });
    const bak = join(bakDir, name);
    if (!existsSync(bak)) copyFileSync(join(SRC, name), bak);
    await processOne(name);
  }
  console.log("Done →", DEST);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
