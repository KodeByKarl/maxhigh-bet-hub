/**
 * Aggressive CNY black-BG knockout:
 * 1) edge flood-fill
 * 2) expand into near-black
 * 3) clear large enclosed black islands (keeps tiny dark features like pupils)
 *
 * Writes in place via writeFileSync (no delete — Vite-safe).
 * Run: npx tsx scripts/process-cny-symbols.ts
 */
import sharp from "sharp";
import { copyFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public/images/symbols/cny");
const BACKUP = join(process.cwd(), "public/images/symbols/chinese/_backup");

function isBg(r: number, g: number, b: number, loose = false): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lim = loose ? 58 : 38;
  // Near-black / charcoal
  if (max <= lim && chroma <= (loose ? 22 : 16)) return true;
  // Dark muddy red/brown spill used as backdrop in these renders
  if (max <= (loose ? 48 : 32) && r >= g && r >= b && g <= 22 && b <= 18 && chroma <= 40) {
    return true;
  }
  return false;
}

async function processOne(name: string) {
  const bak = join(BACKUP, name);
  const dest = join(ROOT, name);
  if (existsSync(bak)) copyFileSync(bak, dest);

  const { data, info } = await sharp(dest).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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

  // --- Pass 1: flood from edges ---
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

  // --- Pass 2: expand several times with looser threshold from cleared frontier ---
  for (let pass = 0; pass < 6; pass++) {
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
    for (const i of frontier) {
      if (!cleared[i]) clearAt(i);
    }
  }

  // --- Pass 3: clear large enclosed near-black islands (ring interiors, etc.) ---
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
        if (out[no + 3]! >= 8 && isBg(out[no]!, out[no + 1]!, out[no + 2]!, true)) {
          q.push(ni);
        }
      }
    }

    // Keep tiny dark features (pupils / small holes); wipe large BG islands
    if (comp.length >= 180) {
      for (const i of comp) clearAt(i);
    }
  }

  // --- Soft fringe: fade near-cleared near-black ---
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
      if (near) {
        out[o + 3] = Math.round(out[o + 3]! * 0.12);
      }
    }
  }

  // Crop to opaque bounds → square 1024
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
  const pad = Math.round(Math.max(w, h) * 0.015);
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

  // Stats
  const { data: d2, info: i2 } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let clear = 0;
  let solidBlack = 0;
  for (let i = 0; i < i2.width * i2.height; i++) {
    const o = i * 4;
    if (d2[o + 3]! < 8) clear++;
    else if (Math.max(d2[o]!, d2[o + 1]!, d2[o + 2]!) < 40) solidBlack++;
  }
  console.log(
    name,
    `clear=${((clear / (1024 * 1024)) * 100).toFixed(1)}%`,
    `leftoverDark=${solidBlack}`,
  );
}

async function main() {
  const files = readdirSync(BACKUP).filter((f) => f.endsWith(".png"));
  for (const name of files) await processOne(name);
  console.log("Done", files.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
