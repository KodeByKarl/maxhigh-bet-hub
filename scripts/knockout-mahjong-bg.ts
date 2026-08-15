/**
 * Knock chroma-green (#00FF00) backgrounds out of generated Mahjong tiles.
 * Copies raws from Cursor assets → transparent PNGs in public/images/symbols/mahjong.
 *
 * Run: npx tsx scripts/knockout-mahjong-bg.ts
 */
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DEST = join(process.cwd(), "public/images/symbols/mahjong");
const ASSETS = join(
  process.env.USERPROFILE || "",
  ".cursor/projects/d-Projects-maxhigh-bet-hub/assets",
);

const MAP: Record<string, string> = {
  "10.png": "mj-10-raw.png",
  "j.png": "mj-j-raw.png",
  "q.png": "mj-q-raw.png",
  "k.png": "mj-k-raw.png",
  "a.png": "mj-a-raw.png",
  "bamboo.png": "mj-bamboo-raw.png",
  "character.png": "mj-character-raw.png",
  "dot.png": "mj-dot-raw.png",
  "red_dragon.png": "mj-red-dragon-raw.png",
  "green_dragon.png": "mj-green-dragon-raw.png",
  "wild.png": "mj-wild-raw.png",
  "scatter.png": "mj-scatter-raw.png",
};

/** True if pixel is chroma green (or green spill). */
function isChroma(r: number, g: number, b: number): number {
  // Primary chroma green
  if (g > 140 && g > r + 35 && g > b + 35) {
    const strength = Math.min(1, (g - Math.max(r, b) - 20) / 80);
    return Math.max(0, strength);
  }
  // Soft green spill / edge fringe
  if (g > 110 && g > r + 20 && g > b + 20 && r < 180 && b < 180) {
    return Math.min(0.85, (g - Math.max(r, b) - 10) / 90);
  }
  return 0;
}

async function knockout(src: string, dest: string) {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 255, b: 0, alpha: 1 } })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const out = Buffer.from(data);

  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const r = out[o]!;
    const g = out[o + 1]!;
    const b = out[o + 2]!;
    const chroma = isChroma(r, g, b);
    if (chroma >= 0.92) {
      out[o] = 0;
      out[o + 1] = 0;
      out[o + 2] = 0;
      out[o + 3] = 0;
    } else if (chroma > 0.08) {
      // Despill + fade alpha
      const keep = 1 - chroma;
      out[o + 1] = Math.round(Math.min(g, Math.max(r, b) + 8) * keep + Math.max(r, b) * (1 - keep));
      out[o + 3] = Math.round(out[o + 3]! * keep);
    }
  }

  // Second pass: flood-fill remaining near-green from borders
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * 4;
    const a = out[o + 3]!;
    if (a < 12 || isChroma(out[o]!, out[o + 1]!, out[o + 2]!) > 0.35) {
      visited[i] = 1;
      queue.push(i);
    }
  };
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
    const i = queue[qi++]!;
    const o = i * 4;
    out[o] = 0;
    out[o + 1] = 0;
    out[o + 2] = 0;
    out[o + 3] = 0;
    const x = i % width;
    const y = (i / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(dest);

  console.log("ok", dest);
}

async function main() {
  mkdirSync(DEST, { recursive: true });
  for (const [destName, rawName] of Object.entries(MAP)) {
    const raw = join(ASSETS, rawName);
    if (!existsSync(raw)) {
      console.warn("missing raw", rawName);
      continue;
    }
    // Keep a copy of the raw for re-runs
    const genDir = join(DEST, "_gen");
    mkdirSync(genDir, { recursive: true });
    copyFileSync(raw, join(genDir, destName));
    await knockout(raw, join(DEST, destName));
  }
  console.log("Mahjong chroma knockout complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
