/**
 * After knockout: crop to opaque bounds and square-pad to 1024².
 * Run: npx tsx scripts/crop-chinese-symbols.ts
 */
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public/images/symbols/chinese");

async function cropOne(file: string, name: string) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    console.log("skip", name);
    return;
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
  const tmp = `${file}.tmp.png`;
  await sharp(file)
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
  const { renameSync, unlinkSync } = await import("node:fs");
  try {
    unlinkSync(file);
  } catch {
    /* ignore */
  }
  renameSync(tmp, file);
  console.log(name, `${w}x${h}`, "→", `1024 square (content ${cw}x${ch})`);
}

async function main() {
  const files = readdirSync(ROOT).filter((f) => f.endsWith(".png"));
  for (const name of files) {
    await cropOne(join(ROOT, name), name);
  }
  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
