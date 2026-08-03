/**
 * Build Fire Spike border assets:
 * - compressed seamless fire strip PNG
 * - short looping fire GIF for CSS border fill
 *
 * Run: node scripts/generate-fire-spike-border.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "public", "images", "fire-spike-border-strip.png");
const OUT_PNG = path.join(ROOT, "public", "images", "fire-spike-border-strip.png");
const OUT_GIF = path.join(ROOT, "public", "images", "fire-spike-border-fire.gif");

const FRAME_W = 480;
const FRAME_H = 96;
const FRAMES = 16;
const DELAY_CS = 6; // centiseconds (~60ms)

async function loadGifenc() {
  const esm = path.join(ROOT, "node_modules", "gifenc", "dist", "gifenc.esm.js");
  if (!fs.existsSync(esm)) {
    console.log("Installing gifenc (temporary)…");
    const { execSync } = await import("node:child_process");
    execSync("npm install gifenc --no-save", { cwd: ROOT, stdio: "inherit" });
  }
  return import(pathToFileURL(esm).href);
}

function buildProceduralFrame(w, h, t) {
  // Fallback if source missing: synthetic ember strip
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const nx = x / w;
      const ny = y / h;
      const wave =
        Math.sin((nx * 10 + t * 4) * Math.PI * 2) * 0.15 +
        Math.sin((nx * 23 - t * 6) * Math.PI * 2) * 0.08;
      const heat = Math.max(0, 1 - Math.abs(ny - 0.55 + wave) * 2.4);
      const flicker = 0.75 + 0.25 * Math.sin((x * 0.2 + t * 20) * Math.PI);
      const v = heat * flicker;
      buf[o] = Math.min(255, Math.floor(80 + v * 175));
      buf[o + 1] = Math.min(255, Math.floor(20 + v * 140));
      buf[o + 2] = Math.min(255, Math.floor(v * 40));
      buf[o + 3] = Math.min(255, Math.floor(40 + v * 215));
    }
  }
  return buf;
}

async function main() {
  const { GIFEncoder, quantize, applyPalette } = await loadGifenc();

  let base;
  let baseW;
  let baseH;

  if (fs.existsSync(SRC)) {
    const meta = await sharp(SRC).metadata();
    // Downscale for web — keep flame detail, drop the 1.6MB weight
    const resized = await sharp(SRC)
      .resize({
        width: Math.min(meta.width ?? 1200, 960),
        height: FRAME_H,
        fit: "cover",
        position: "centre",
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    await sharp(resized.data, {
      raw: {
        width: resized.info.width,
        height: resized.info.height,
        channels: 4,
      },
    })
      .png({ compressionLevel: 9 })
      .toFile(OUT_PNG);

    console.log(
      "PNG strip →",
      path.relative(ROOT, OUT_PNG),
      `${resized.info.width}x${resized.info.height}`,
      `${(fs.statSync(OUT_PNG).size / 1024).toFixed(1)} KB`,
    );

    base = resized.data;
    baseW = resized.info.width;
    baseH = resized.info.height;
  } else {
    console.warn("Source strip missing — using procedural fire");
    baseW = FRAME_W;
    baseH = FRAME_H;
    base = buildProceduralFrame(baseW, baseH, 0);
    await sharp(base, { raw: { width: baseW, height: baseH, channels: 4 } })
      .png()
      .toFile(OUT_PNG);
  }

  const gif = GIFEncoder();
  const tileW = FRAME_W;

  for (let f = 0; f < FRAMES; f++) {
    const shift = Math.floor((f / FRAMES) * baseW);
    const frame = Buffer.alloc(tileW * FRAME_H * 4);

    for (let y = 0; y < FRAME_H; y++) {
      const srcY = Math.min(baseH - 1, Math.floor((y / FRAME_H) * baseH));
      for (let x = 0; x < tileW; x++) {
        const srcX = (x + shift) % baseW;
        const si = (srcY * baseW + srcX) * 4;
        const di = (y * tileW + x) * 4;
        // Mild flicker per frame
        const flick = 0.88 + 0.12 * Math.sin((f + x * 0.05) * 1.7);
        frame[di] = Math.min(255, Math.floor(base[si] * flick));
        frame[di + 1] = Math.min(255, Math.floor(base[si + 1] * flick));
        frame[di + 2] = Math.min(255, Math.floor(base[si + 2] * flick));
        frame[di + 3] = base[si + 3];
      }
    }

    // Sample for palette from opaque-ish pixels
    const pixels = new Uint8Array(tileW * FRAME_H * 4);
    frame.copy(pixels);
    const palette = quantize(pixels, 64);
    const index = applyPalette(pixels, palette);
    gif.writeFrame(index, tileW, FRAME_H, {
      palette,
      delay: DELAY_CS,
      repeat: 0,
    });
  }

  gif.finish();
  const bytes = gif.bytes();
  fs.writeFileSync(OUT_GIF, Buffer.from(bytes));
  console.log(
    "GIF fire →",
    path.relative(ROOT, OUT_GIF),
    `${tileW}x${FRAME_H} × ${FRAMES}f`,
    `${(bytes.length / 1024).toFixed(1)} KB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
