/**
 * Piñata Wins symbols:
 * 1) Punch near-black mats → transparent (edge flood-fill)
 * 2) Bake a Super Ace–style ornate gold card frame around each tile
 *    (rounded frame, transparent outer corners)
 *
 * Run: node scripts/fix-pinata-wins-symbol-alpha.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "public", "images", "symbols", "pinata-wins");
const OUT_SIZE = 512;
const BLACK_THRESH = 28;

const SYMBOL_FILES = [
  "chili.png",
  "taco.png",
  "maracas.png",
  "sombrero.png",
  "cactus.png",
  "guitar.png",
  "golden_skull.png",
  "wild.png",
  "scatter.png",
];

function isNearBlack(r, g, b, a) {
  if (a < 8) return true;
  return r <= BLACK_THRESH && g <= BLACK_THRESH && b <= BLACK_THRESH;
}

async function punchBlack(filePath) {
  const { data, info } = await sharp(filePath)
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
    if (!isNearBlack(data[o], data[o + 1], data[o + 2], data[o + 3])) return;
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

  // Soft fringe near punched edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const o = i * 4;
      if (data[o + 3] < 8) continue;
      if (!isNearBlack(data[o], data[o + 1], data[o + 2], data[o + 3])) continue;
      let nearClear = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const no = ((y + dy) * width + (x + dx)) * 4;
        if (data[no + 3] < 8) {
          nearClear = true;
          break;
        }
      }
      if (nearClear) {
        data[o + 3] = 0;
        cleared++;
      }
    }
  }

  return { data, width, height, cleared };
}

/** Ornate gold rounded card frame (transparent center + transparent outer corners). */
function buildFrameSvg(size) {
  const pad = Math.round(size * 0.035);
  const inner = size - pad * 2;
  const r = Math.round(size * 0.1);
  const stroke = Math.round(size * 0.045);
  const strokeInner = Math.round(size * 0.018);
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF3C4"/>
      <stop offset="35%" stop-color="#F5C542"/>
      <stop offset="70%" stop-color="#C98912"/>
      <stop offset="100%" stop-color="#8A5A08"/>
    </linearGradient>
    <linearGradient id="g2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFE9A0"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#F59E0B" flood-opacity="0.55"/>
    </filter>
  </defs>
  <!-- Outer gold plate -->
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" ry="${r}"
        fill="none" stroke="url(#g)" stroke-width="${stroke}" filter="url(#glow)"/>
  <!-- Inner highlight rim -->
  <rect x="${pad + stroke * 0.55}" y="${pad + stroke * 0.55}"
        width="${inner - stroke * 1.1}" height="${inner - stroke * 1.1}"
        rx="${Math.max(4, r - stroke * 0.4)}" ry="${Math.max(4, r - stroke * 0.4)}"
        fill="none" stroke="#FFF8DC" stroke-width="${strokeInner}" opacity="0.85"/>
  <!-- Corner flourishes -->
  ${[
    [pad + stroke, pad + stroke],
    [size - pad - stroke, pad + stroke],
    [pad + stroke, size - pad - stroke],
    [size - pad - stroke, size - pad - stroke],
  ]
    .map(
      ([cx, cy], i) => `
    <circle cx="${cx}" cy="${cy}" r="${Math.round(size * 0.028)}" fill="#FFE08A" stroke="#A16207" stroke-width="2"/>
    <path d="M${cx - 10},${cy} Q${cx},${cy + (i < 2 ? 14 : -14)} ${cx + 10},${cy}"
          fill="none" stroke="#FDE68A" stroke-width="2.2" opacity="0.9"/>`,
    )
    .join("")}
</svg>`);
}

/** Soft festive card fill behind the symbol (inside the frame). */
function buildCardFillSvg(size) {
  const pad = Math.round(size * 0.07);
  const inner = size - pad * 2;
  const r = Math.round(size * 0.09);
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#B44E2A"/>
      <stop offset="55%" stop-color="#8B341C"/>
      <stop offset="100%" stop-color="#5C2214"/>
    </linearGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" ry="${r}" fill="url(#bg)"/>
</svg>`);
}

async function frameSymbol(srcPath, outPath) {
  const punched = await punchBlack(srcPath);
  console.log("  punched black:", path.basename(srcPath), `(${punched.cleared} px)`);

  const symbolPng = await sharp(punched.data, {
    raw: { width: punched.width, height: punched.height, channels: 4 },
  })
    .resize(OUT_SIZE, OUT_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Shrink symbol slightly so it sits inside the gold rim
  const inset = Math.round(OUT_SIZE * 0.12);
  const symbolInset = await sharp(symbolPng)
    .resize(OUT_SIZE - inset * 2, OUT_SIZE - inset * 2, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const cardFill = await sharp(buildCardFillSvg(OUT_SIZE)).png().toBuffer();
  const frame = await sharp(buildFrameSvg(OUT_SIZE)).png().toBuffer();

  await sharp({
    create: {
      width: OUT_SIZE,
      height: OUT_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: cardFill, left: 0, top: 0 },
      { input: symbolInset, left: inset, top: inset },
      { input: frame, left: 0, top: 0 },
    ])
    .png()
    .toFile(outPath);

  console.log("  framed →", path.basename(outPath));
}

async function buildStandaloneFrame() {
  const out = path.join(DIR, "card-frame.png");
  // Border-only: punch center of a full gold plate
  const size = OUT_SIZE;
  const pad = Math.round(size * 0.035);
  const stroke = Math.round(size * 0.05);
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF3C4"/>
      <stop offset="40%" stop-color="#F5C542"/>
      <stop offset="100%" stop-color="#8A5A08"/>
    </linearGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}"
        rx="${Math.round(size * 0.1)}" ry="${Math.round(size * 0.1)}"
        fill="none" stroke="url(#g)" stroke-width="${stroke}"/>
  <rect x="${pad + stroke * 0.6}" y="${pad + stroke * 0.6}"
        width="${size - pad * 2 - stroke * 1.2}" height="${size - pad * 2 - stroke * 1.2}"
        rx="${Math.round(size * 0.08)}" ry="${Math.round(size * 0.08)}"
        fill="none" stroke="#FFF8DC" stroke-width="${Math.round(stroke * 0.35)}" opacity="0.9"/>
</svg>`);
  await sharp(svg).png().toFile(out);
  console.log("standalone card-frame →", out);
}

if (!fs.existsSync(DIR)) {
  throw new Error(`Missing dir: ${DIR}`);
}

console.log("Piñata Wins: punch black + bake gold frames…");
for (const f of SYMBOL_FILES) {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) {
    console.warn("skip missing", f);
    continue;
  }
  // Work on a copy buffer via punch → rewrite same path framed
  const tmp = path.join(DIR, `._tmp_${f}`);
  fs.copyFileSync(p, tmp);
  await frameSymbol(tmp, p);
  fs.unlinkSync(tmp);
}
await buildStandaloneFrame();
console.log("Done.");
