/**
 * Ace High card asset notes.
 *
 * Full 52-card faces are premium 3D PNGs in:
 *   public/images/symbols/ace-high/cards/{rank}{suit}.png
 * e.g. AS.png, 10H.png, KH.png
 *
 * This script no longer generates flat SVG faces (deck is PNG-only).
 * Card back SVG fallback is still written for CardIcon onError.
 *
 * Run: npx tsx scripts/generate-ace-high-assets.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const back = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1c3d"/>
      <stop offset="50%" stop-color="#132a52"/>
      <stop offset="100%" stop-color="#0a1630"/>
    </linearGradient>
    <pattern id="diamonds" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="8" height="8" fill="#c9a227" opacity="0.18"/>
    </pattern>
  </defs>
  <rect x="2" y="2" width="196" height="276" rx="14" fill="url(#bg)" stroke="#b8860b" stroke-width="4"/>
  <rect x="14" y="14" width="172" height="252" rx="10" fill="url(#diamonds)" stroke="#c9a227" stroke-width="1.5" opacity="0.95"/>
  <rect x="28" y="28" width="144" height="224" rx="8" fill="none" stroke="#f5d76e" stroke-width="1" opacity="0.45"/>
  <circle cx="100" cy="140" r="36" fill="#0b1c3d" stroke="#c9a227" stroke-width="2"/>
  <text x="100" y="148" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="700" fill="#f5d76e">MH</text>
</svg>
`;
writeFileSync(join(process.cwd(), "public/images/symbols/ace-high/card-back.svg"), back, "utf8");

console.log("Ace High faces are 3D PNGs (52) — SVG face generation disabled.");
console.log("Wrote card-back.svg fallback only.");
