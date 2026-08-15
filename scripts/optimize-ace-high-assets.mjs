/**
 * Optimize Ace High image assets for mobile (smaller PNG payloads).
 * Run: node scripts/optimize-ace-high-assets.mjs
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "public/images/symbols/ace-high");

async function writePng(file, pipeline) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    console.log("missing", file);
    return;
  }
  const before = fs.statSync(p).size;
  const tmp = `${p}.tmp`;
  await pipeline.png({ quality: 80, compressionLevel: 9 }).toFile(tmp);
  fs.renameSync(tmp, p);
  console.log(
    file,
    `${Math.round(before / 1024)}KB -> ${Math.round(fs.statSync(p).size / 1024)}KB`,
  );
}

async function optimizeChip(value) {
  const file = `chips/${value}.png`;
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return;
  const size = 128;
  const circle = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  await writePng(
    file,
    sharp(p)
      .resize(size, size, { fit: "cover" })
      .composite([{ input: circle, blend: "dest-in" }]),
  );
}

await writePng(
  "board.png",
  sharp(path.join(root, "board.png")).resize(1080, 1920, {
    fit: "inside",
    withoutEnlargement: true,
  }),
);

await writePng(
  "card-back.png",
  sharp(path.join(root, "card-back.png")).resize(400, 560, { fit: "cover" }),
);

for (const v of [1, 5, 10, 25, 100, 200, 500]) {
  await optimizeChip(v);
}

console.log("Ace High mobile asset optimization done.");
