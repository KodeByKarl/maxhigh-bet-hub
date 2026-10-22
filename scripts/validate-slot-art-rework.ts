import type { PantherTheme } from "../src/components/maxhigh/panther-shared/theme";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { games, version } from "./rework-slot-art.mjs";

const root = process.cwd();
const hashes = new Map<string, string>();
let images = 0;
for (const [id] of games) {
  const module = await import(
    pathToFileURL(path.join(root, "src/components/maxhigh", id, "theme.ts")).href
  );
  const theme = Object.values(module).find(
    (v: unknown): v is PantherTheme =>
      typeof v === "object" && v !== null && "id" in v && v.id === id,
  ) as PantherTheme;
  if (!theme || Object.keys(theme.assets.icons).length !== 10)
    throw new Error(`Invalid theme ${id}`);
  const files = [...Object.values(theme.assets.icons), theme.assets.backdrop] as string[];
  for (const url of files) {
    if (!url.includes(`-v${version}.`)) throw new Error(`Old active path ${url}`);
    const file = path.join(root, "public", url.split("?")[0]);
    const data = fs.readFileSync(file);
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    if (hashes.has(hash)) throw new Error(`Duplicate artwork: ${url} and ${hashes.get(hash)}`);
    hashes.set(hash, url);
    const meta = await sharp(data).metadata();
    if (file.endsWith(".png")) {
      const stats = await sharp(data).stats();
      if (
        meta.width !== 320 ||
        meta.height !== 320 ||
        !meta.hasAlpha ||
        stats.channels[3].min !== 0
      )
        throw new Error(`Invalid symbol ${url}`);
    } else if (meta.width !== 1920 || meta.height !== 1080 || meta.format !== "webp")
      throw new Error(`Invalid background ${url}`);
    images++;
  }
  if (theme.assets.loadingBg !== theme.assets.backdrop)
    throw new Error(`Loading background mismatch ${id}`);
  console.log(`${id}: 10 unique transparent symbols and themed background verified`);
}
console.log(`${games.length} games, ${images} unique active images verified.`);
