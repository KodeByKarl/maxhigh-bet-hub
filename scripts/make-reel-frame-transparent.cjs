const sharp = require("sharp");
const path = require("path");
const file = path.join(
  __dirname,
  "..",
  "public",
  "images",
  "symbols",
  "sweet",
  "reel-frame.png",
);

(async () => {
  const meta = await sharp(file).metadata();
  console.log("meta", meta.width, meta.height, meta.hasAlpha, meta.format);

  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let cleared = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 22 && g < 22 && b < 22) {
      data[i + 3] = 0;
      cleared++;
    }
  }
  console.log("cleared pixels", cleared);

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(file);

  console.log("done", file);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
