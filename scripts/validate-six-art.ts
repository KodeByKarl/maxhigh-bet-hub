import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import type { PantherTheme } from "../src/components/maxhigh/panther-shared/theme";

const allIds = [
  "ruby-raven",
  "midnight-owl",
  "lotus-lynx",
  "honey-hive",
  "frost-fox",
  "coral-cobra",
];
const ids = process.argv[2] ? allIds.filter((id) => id === process.argv[2]) : allIds;
if (!ids.length) throw Error("Unknown game");
const hashes = new Set<string>();
for (const id of ids) {
  const exports: Record<string, unknown> = await import(
    pathToFileURL(path.resolve(`src/components/maxhigh/${id}/theme.ts`)).href
  );
  const theme = Object.values(exports).find(
    (v): v is PantherTheme => typeof v === "object" && v !== null && "id" in v && v.id === id,
  );
  if (!theme || Object.keys(theme.assets.icons).length !== 10) throw Error(`Invalid theme ${id}`);
  if (theme.assets.backdrop !== theme.assets.loadingBg) throw Error(`Loading mismatch ${id}`);
  for (const url of [...Object.values(theme.assets.icons), theme.assets.backdrop]) {
    if (!url.includes("-v20261013.")) throw Error(`Old path ${url}`);
    const file = path.join("public", url.split("?")[0]);
    const data = fs.readFileSync(file);
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    if (hashes.has(hash)) throw Error(`Duplicate ${url}`);
    hashes.add(hash);
    const m = await sharp(data).metadata();
    if (url.endsWith(".png")) {
      const stats = await sharp(data).stats();
      if (m.width !== 320 || m.height !== 320 || !m.hasAlpha || stats.channels[3].min !== 0)
        throw Error(`Invalid symbol ${url}`);
    } else if (m.width !== 1920 || m.height !== 1080 || m.format !== "webp")
      throw Error(`Invalid background ${url}`);
  }
  console.log(`${id}: ten symbols + background verified`);
}
for (const root of ["public/images", "public/games"]) {
  for (const file of fs.readdirSync(root, { recursive: true }) as string[]) {
    if (!/\.(png|webp|jpe?g|avif)$/i.test(file) || file.includes("-v20261013.")) continue;
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, file)))
      .digest("hex");
    if (hashes.has(hash)) throw Error(`New image duplicates existing file: ${file}`);
  }
}
console.log(
  `PASS: ${hashes.size} unique active assets, no exact duplicates against existing packs.`,
);
