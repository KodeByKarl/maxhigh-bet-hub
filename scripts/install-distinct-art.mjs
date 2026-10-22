import fs from "node:fs";
import crypto from "node:crypto";
import sharp from "sharp";
import { jobs, dest, version } from "./distinct-art.mjs";
const missing = jobs.filter((j) => !fs.existsSync(dest(j)));
if (missing.length)
  throw Error(
    `Pending ${missing.length} assets: ${missing.map((j) => `${j.game}/${j.asset}`).join(", ")}`,
  );
const hashes = new Set();
for (const j of jobs) {
  const file = dest(j),
    m = await sharp(file).metadata(),
    s = await sharp(file).stats();
  if (
    j.transparent &&
    (m.width !== 320 || m.height !== 320 || !m.hasAlpha || s.channels[3].min !== 0)
  )
    throw Error("Bad alpha/dimensions " + file);
  if (!j.transparent && (m.width !== 1920 || m.height !== 1080))
    throw Error("Bad background " + file);
  const h = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (hashes.has(h)) throw Error("Duplicate " + file);
  hashes.add(h);
}
const edit = (file, fn) =>
  fs.writeFileSync(file, fn(fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n")));
const url = (game, key) =>
  `/images/symbols/${game}/${key}-${version}.${key === "backdrop" ? "webp" : "png"}`;
for (const game of ["fire-spike", "coin-volcano"]) {
  edit(`src/components/maxhigh/${game}/animationConfig.ts`, (s) =>
    s.replace(
      new RegExp(
        `/images/symbols/${game}/(bar|dice|diamond|chip|lucky7|wild|scatter|card-frame)\\.(webp|png)`,
        "g",
      ),
      (_, key) => url(game, key),
    ),
  );
  const name = game === "fire-spike" ? "FireSpike" : "CoinVolcano";
  edit(`src/components/maxhigh/${name}Slot.tsx`, (s) =>
    s.replace(`/images/${game}-bg.webp`, url(game, "backdrop")),
  );
}
edit("src/components/maxhigh/wild-panther/paytable.ts", (s) =>
  s.replace(/\/images\/symbols\/wild-panther\/([\w-]+)\.(png|webp)\?v=1/g, (_, key) =>
    url("wild-panther", key),
  ),
);
edit("src/components/maxhigh/wild-panther/WildPantherIcon.tsx", (s) =>
  s.replace("/images/symbols/wild-panther/10.png?v=1", url("wild-panther", "10")),
);
edit("src/components/maxhigh/WildPantherSlot.tsx", (s) =>
  s
    .replaceAll("/images/symbols/panther/backdrop.webp", url("wild-panther", "backdrop"))
    .replaceAll("/images/symbols/panther/loading-bg.webp", url("wild-panther", "backdrop")),
);
const keys = [
  "grape",
  "plum",
  "melon",
  "apple",
  "blue",
  "green",
  "purple",
  "heart",
  "lollipop",
  "bomb",
];
const files = ["10", "J", "Q", "K", "A", "owl", "wolf", "ram", "scatter", "wild"];
edit("src/components/maxhigh/golden-panther/theme.ts", (s) =>
  s
    .replace("  gpIconPack,\n", "")
    .replaceAll("/images/symbols/panther/backdrop.webp", url("golden-panther", "backdrop"))
    .replaceAll("/images/symbols/panther/loading-bg.webp", url("golden-panther", "backdrop"))
    .replace(
      'gpIconPack("2")',
      JSON.stringify(
        Object.fromEntries(keys.map((k, i) => [k, url("golden-panther", files[i])])),
        null,
        2,
      ),
    ),
);
edit("src/components/maxhigh/golden-panther/PantherIcon.tsx", (s) =>
  s.replace("/images/symbols/gp/10.png?v=1", url("golden-panther", "10")),
);
fs.mkdirSync("output/distinct-art-review", { recursive: true });
for (const game of [...new Set(jobs.map((j) => j.game))]) {
  const symbols = jobs.filter((j) => j.game === game && j.transparent);
  const overlays = await Promise.all(
    symbols.map(async (j, i) => ({
      input: await sharp(dest(j)).resize(200, 200).toBuffer(),
      left: 70 + (i % 5) * 240,
      top: 100 + Math.floor(i / 5) * 280,
    })),
  );
  await sharp(dest(jobs.find((j) => j.game === game && j.asset === "backdrop")))
    .resize(1280, 720)
    .composite(overlays)
    .webp({ quality: 90 })
    .toFile(`output/distinct-art-review/${game}.webp`);
}
console.log(`Installed and verified ${hashes.size} distinct assets; four previews saved.`);
fs.writeFileSync(
  "docs/distinct-art-prompts.json",
  JSON.stringify(
    jobs.map((j) => ({
      game: j.game,
      asset: dest(j),
      prompt: j.prompt,
      mode: "built-in imagegen",
    })),
    null,
    2,
  ) + "\n",
);
