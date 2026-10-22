import fs from "node:fs";
import sharp from "sharp";
export const version = "v20261012-unique";
const slots = [
  [
    "fire-spike",
    "blackened steel, crimson crystal spikes and blue-white furnace flame",
    "a dramatic iron forge with spiked pillars and blue furnace fire",
    ["bar", "dice", "diamond", "chip", "lucky7", "wild", "scatter"],
  ],
  [
    "coin-volcano",
    "warm polished gold, obsidian lava rock and flowing orange magma",
    "a volcanic treasure caldera with golden coin waterfalls",
    ["bar", "dice", "diamond", "chip", "lucky7", "wild", "scatter"],
  ],
  [
    "wild-panther",
    "moonlit silver, emerald jungle leaves and black panther motifs",
    "a wild moonlit rainforest with ancient mossy ruins",
    ["10", "J", "Q", "K", "A", "owl", "wolf", "ram", "scatter", "wild"],
  ],
  [
    "golden-panther",
    "sunlit royal gold, amber gemstones and regal panther motifs",
    "a golden panther palace above a sunlit jungle canopy",
    ["10", "J", "Q", "K", "A", "owl", "wolf", "ram", "scatter", "wild"],
  ],
];
const subjects = {
  bar: "a sculpted BAR ingot",
  dice: "a pair of ornate dice",
  diamond: "a brilliant faceted diamond",
  chip: "a thick decorated casino chip",
  lucky7: "a sculpted lucky numeral 7",
  wild: "a magnificent panther head talisman",
  scatter: "a radiant treasure medallion",
  owl: "a regal owl portrait",
  wolf: "a majestic wolf portrait",
  ram: "a powerful ram portrait",
};
export const jobs = slots.flatMap(([game, style, scene, keys]) => [
  ...keys.map((asset) => ({
    game,
    asset,
    transparent: true,
    prompt: `Use case: stylized-concept. One standalone premium casino reel symbol for ${game}: ${subjects[asset] ?? `the single glyph ${asset}`}. ${style}. ${game === "fire-spike" && asset === "wild" ? "Use a phoenix head instead of panther." : ""} ${game === "coin-volcano" && asset === "wild" ? "Use an erupting volcano instead of panther." : ""} Exquisite 3D sculpted game art, strong silhouette, readable at small size, centered complete object with generous transparent margins. Square canvas, genuine transparent background. No background, plaque, watermark or extra text. Only requested glyph or BAR text if specified.`,
  })),
  {
    game,
    asset: "backdrop",
    transparent: false,
    prompt: `Premium cinematic fantasy slot background for ${game}, ${scene}, art direction ${style}. Landscape 16:9 full bleed. Detailed environment at outer edges, central 60 percent quiet dark atmospheric negative space for reels, safe mobile center crop. No text, UI, cards, logos or watermark.`,
  },
]);
for (const [game, style] of slots.slice(0, 2))
  jobs.push({
    game,
    asset: "card-frame",
    transparent: true,
    prompt: `One square casino reel cell border overlay for ${game}. ${style}. Thin ornate perimeter frame, large completely transparent empty center occupying 85 percent of width and height. Full frame visible, centered on transparent square canvas. No symbol, text, background or watermark. Premium sculpted 3D metal.`,
  });
export const dest = (j) =>
  `public/images/symbols/${j.game}/${j.asset}-${version}.${j.transparent ? "png" : "webp"}`;
const [cmd, id, source] = process.argv.slice(2);
if (cmd === "jobs") console.log(JSON.stringify(jobs.filter((j) => !fs.existsSync(dest(j)))));
if (cmd === "install") {
  const j = jobs.find((j) => `${j.game}/${j.asset}` === id);
  if (!j) throw Error(id);
  fs.mkdirSync(`public/images/symbols/${j.game}`, { recursive: true });
  if (j.transparent)
    await sharp(source)
      .trim()
      .resize(300, 300, { fit: "contain", background: "#00000000" })
      .extend({ top: 10, bottom: 10, left: 10, right: 10, background: "#00000000" })
      .png()
      .toFile(dest(j));
  else
    await sharp(source).resize(1920, 1080, { fit: "cover" }).webp({ quality: 88 }).toFile(dest(j));
  fs.writeFileSync(
    `public/images/symbols/${j.game}/${j.asset}-${version}.json`,
    JSON.stringify({ prompt: j.prompt, source, mode: "built-in imagegen" }, null, 2),
  );
  console.log(id + " installed");
}
if (cmd === "preview") {
  const group = jobs.filter((j) => j.game === id);
  if (!group.length || group.some((j) => !fs.existsSync(dest(j)))) throw Error("Set incomplete");
  const overlays = await Promise.all(
    group
      .filter((j) => j.transparent)
      .map(async (j, i) => ({
        input: await sharp(dest(j)).resize(200, 200).toBuffer(),
        left: 70 + (i % 5) * 240,
        top: 100 + Math.floor(i / 5) * 280,
      })),
  );
  fs.mkdirSync("output/distinct-art-review", { recursive: true });
  await sharp(dest(group.find((j) => j.asset === "backdrop")))
    .resize(1280, 720)
    .composite(overlays)
    .webp({ quality: 90 })
    .toFile(`output/distinct-art-review/${id}.webp`);
  console.log(`output/distinct-art-review/${id}.webp`);
}
