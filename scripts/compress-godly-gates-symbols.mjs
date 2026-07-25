import fs from "fs";
import path from "path";
import sharp from "sharp";

const dir = path.resolve("public/images/symbols/godly-gates");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));

for (const file of files) {
  const full = path.join(dir, file);
  const isBackdrop = file === "backdrop.png" || file === "mascot.png";
  const size = isBackdrop ? 1280 : 256;
  const quality = isBackdrop ? 80 : 85;
  const tmp = full + ".tmp.png";
  await sharp(full)
    .resize(size, size, { fit: isBackdrop ? "inside" : "contain", withoutEnlargement: true, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality, palette: !isBackdrop })
    .toFile(tmp);
  fs.renameSync(tmp, full);
  const kb = Math.round(fs.statSync(full).size / 1024);
  console.log(`${file} → ${kb} KB`);
}
