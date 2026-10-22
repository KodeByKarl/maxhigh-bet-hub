import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { FAUNA } from "../src/components/maxhigh/games/fishing-shared/fauna";
import { FaunaFish } from "../src/components/maxhigh/games/fishing-shared/species";

fs.mkdirSync("output/distinct-art-review", { recursive: true });
const inputs = [];
const unique = new Set<string>();
for (const [i, [game, cast]] of Object.entries(FAUNA).entries()) {
  const html = renderToStaticMarkup(
    <FaunaFish tierId="crate" spec={cast.crate} crate={cast.crate.pal} frozen />,
  );
  const svg = html.match(/<svg[\s\S]*<\/svg>/)?.[0];
  if (!svg) throw Error(`No SVG for ${game}`);
  if (unique.has(svg)) throw Error(`Duplicate treasure: ${game}`);
  unique.add(svg);
  const input = await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer();
  inputs.push({ input, left: i * 200 + 10, top: 10 });
}
await sharp({ create: { width: 1400, height: 200, channels: 4, background: "#142432" } })
  .composite(inputs)
  .png()
  .toFile("output/distinct-art-review/fishing-treasures.png");
console.log(
  "Seven distinct treasure designs rendered successfully; order: " + Object.keys(FAUNA).join(", "),
);
