import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { goldenPantherTheme } from "../src/components/maxhigh/golden-panther/theme";
import {
  ICON_SRC as fireIcons,
  CARD_FRAME_SRC as fireFrame,
} from "../src/components/maxhigh/fire-spike/animationConfig";
import {
  ICON_SRC as coinIcons,
  CARD_FRAME_SRC as coinFrame,
} from "../src/components/maxhigh/coin-volcano/animationConfig";
import { FAUNA } from "../src/components/maxhigh/games/fishing-shared/fauna";

const read = (p: string) => fs.readFileSync(p, "utf8");
const version = "v20261012-unique";
const wild = [
  ...read("src/components/maxhigh/wild-panther/paytable.ts").matchAll(
    /"(\/images\/symbols\/wild-panther\/[^"?]+)/g,
  ),
].map((m) => m[1]);
const urls = [
  ...Object.values(fireIcons),
  fireFrame,
  ...Object.values(coinIcons),
  coinFrame,
  ...wild,
  ...Object.values(goldenPantherTheme.assets.icons),
  ...["fire-spike", "coin-volcano", "wild-panther", "golden-panther"].map(
    (g) => `/images/symbols/${g}/backdrop-${version}.webp`,
  ),
];
if (urls.length !== 40) throw Error(`Expected 40 assets, found ${urls.length}`);
const hashes = new Set<string>();
for (const url of urls) {
  if (!url.includes(version)) throw Error(`Old active path: ${url}`);
  const local = path.join("public", url.split("?")[0]);
  if (!fs.existsSync(local)) throw Error(`Missing: ${url}`);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(local)).digest("hex");
  if (hashes.has(hash)) throw Error(`Duplicated: ${url}`);
  hashes.add(hash);
}
// Also reject a newly integrated asset that duplicates another retained pack.
for (const root of ["public/images", "public/games"]) {
  for (const file of fs.readdirSync(root, { recursive: true }) as string[]) {
    if (!/\.(png|webp|jpe?g|avif)$/i.test(file) || file.includes(version)) continue;
    const local = path.join(root, file);
    const hash = crypto.createHash("sha256").update(fs.readFileSync(local)).digest("hex");
    if (hashes.has(hash)) throw Error(`New artwork duplicates retained asset: ${local}`);
  }
}
for (const [name, game] of [
  ["FireSpike", "fire-spike"],
  ["CoinVolcano", "coin-volcano"],
  ["WildPanther", "wild-panther"],
]) {
  if (
    !read(`src/components/maxhigh/${name}Slot.tsx`).includes(
      `/images/symbols/${game}/backdrop-${version}.webp`,
    )
  )
    throw Error(`Background not integrated: ${game}`);
}
if (goldenPantherTheme.assets.loadingBg !== goldenPantherTheme.assets.backdrop)
  throw Error("Golden Panther loading artwork mismatch");
const casts = Object.entries(FAUNA).flatMap(([game, cast]) =>
  Object.entries(cast).map(([tier, spec]) => ({ game, tier, json: JSON.stringify(spec) })),
);
for (const item of casts) {
  if (casts.some((other) => other.game !== item.game && other.json === item.json))
    throw Error(`Shared fishing spec: ${item.game}/${item.tier}`);
}
console.log(
  "PASS: 40 unique active slot assets, four integrated backgrounds, seven distinct fishing casts.",
);
