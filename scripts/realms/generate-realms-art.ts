/**
 * Generate procedural vector art for the 50 Realms titles.
 *
 *   npx tsx scripts/realms/generate-realms-art.ts            (all titles)
 *   npx tsx scripts/realms/generate-realms-art.ts cinder-crown
 *   npx tsx scripts/realms/generate-realms-art.ts --sheet    (also writes a review contact sheet)
 *
 * Output per title (same layout Panther titles use, so commissioned art can
 * replace any file later without code changes):
 *   public/images/symbols/realms/<id>/{l1..l5,p1..p3,scatter,bomb}.webp  384×384, transparent
 *   public/images/symbols/realms/<id>/{backdrop,loading-bg}.webp          1280×720
 *   public/games/<id>.webp                                                 768×768 lobby thumbnail
 *
 * Glyphs are lucide icons (ISC, already a dependency). Deterministic: a seeded
 * PRNG per title, so re-running produces identical files.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { REALMS_GAMES, type RealmsGameDef } from "../../src/lib/realms/catalog";
import { LOW_RANK_LABELS } from "../../src/lib/realms/defaults";
import { REALMS_WORLDS, type WorldFrame } from "../../src/lib/realms/worlds";
import { mulberry32 } from "../realms-sim";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SYMBOL_DIR = path.join(ROOT, "public/images/symbols/realms");
const THUMB_DIR = path.join(ROOT, "public/games");
const SHEET_PATH = path.join(os.tmpdir(), "realms-art-sheet.png");

// ── colour helpers ──────────────────────────────────────────────────────────
type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function hsl(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function shade(hex: string, l: number, sMin = 0.45): string {
  const c = hexToHsl(hex);
  return hsl(c.h, Math.max(sMin, c.s), l);
}

// ── lucide glyphs ───────────────────────────────────────────────────────────
type IconNode = [string, Record<string, string | number>][];
const glyphCache = new Map<string, string>();

async function glyph(name: string): Promise<string> {
  const hit = glyphCache.get(name);
  if (hit) return hit;
  const mod = (await import(`lucide-react/dist/esm/icons/${name}.js`)) as { __iconNode?: IconNode };
  // Alias modules re-export another icon; the catalog must name canonical glyphs.
  if (!mod.__iconNode)
    throw new Error(`lucide "${name}" is an alias — use its canonical icon name`);
  const markup = mod.__iconNode
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== "key")
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `<${tag} ${a}/>`;
    })
    .join("");
  glyphCache.set(name, markup);
  return markup;
}

/** A lucide glyph (24-unit box) centred at (cx, cy) with the given pixel size. */
function placeGlyph(
  markup: string,
  cx: number,
  cy: number,
  size: number,
  stroke: string,
  width = 1.9,
  extra = "",
) {
  const k = size / 24;
  return `<g transform="translate(${cx - size / 2},${cy - size / 2}) scale(${k})" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}>${markup}</g>`;
}

// ── frames (384 box, centred on 192) ────────────────────────────────────────
function polygon(points: [number, number][]) {
  return `M${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z`;
}

function radial(n: number, rOuter: number, rInner: number, rot = -90): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    pts.push([192 + r * Math.cos(a), 192 + r * Math.sin(a)]);
  }
  return pts;
}

function framePath(frame: WorldFrame): string {
  switch (frame) {
    case "bubble":
    case "coin":
    case "rune":
    case "ring":
      return "M192,26a166,166 0 1,0 0.1,0Z";
    case "star":
      return polygon(radial(8, 174, 146, -90));
    case "shield":
      return "M192,22 L340,62 C340,200 300,300 192,362 C84,300 44,200 44,62 Z";
    case "hexagon":
      return polygon(hexPoints());
    case "leaf":
      return "M192,20 C318,70 352,190 192,364 C32,190 66,70 192,20 Z";
    case "gear":
      return polygon(radial(12, 174, 150, -90));
    case "diamond":
      return "M192,18 L352,192 L192,366 L32,192 Z";
  }
}

function hexPoints(): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return [192 + 172 * Math.cos(a), 192 + 172 * Math.sin(a)] as [number, number];
  });
}

/** Decoration drawn on top of a frame to make each world's tokens recognisable. */
function frameDetail(frame: WorldFrame, ink: string): string {
  switch (frame) {
    case "bubble":
      return `<ellipse cx="128" cy="104" rx="38" ry="22" fill="#fff" opacity="0.32" transform="rotate(-32 128 104)"/>`;
    case "coin":
      return `<circle cx="192" cy="192" r="140" fill="none" stroke="${ink}" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round" opacity="0.8"/>`;
    case "rune":
      return Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return `<line x1="${192 + 146 * Math.cos(a)}" y1="${192 + 146 * Math.sin(a)}" x2="${192 + 160 * Math.cos(a)}" y2="${192 + 160 * Math.sin(a)}" stroke="${ink}" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`;
      }).join("");
    case "ring":
      return `<ellipse cx="192" cy="192" rx="176" ry="54" fill="none" stroke="${ink}" stroke-width="7" opacity="0.6" transform="rotate(-18 192 192)"/>`;
    case "gear":
      return `<circle cx="192" cy="192" r="118" fill="none" stroke="${ink}" stroke-width="4" opacity="0.45"/>`;
    case "leaf":
      return `<path d="M192,40 L192,346" stroke="${ink}" stroke-width="4" opacity="0.35"/>`;
    default:
      return "";
  }
}

// ── symbol tokens ───────────────────────────────────────────────────────────
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const SHADOW = `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity="0.55"/></filter>`;
const GLOW = (id: string, color: string, dev = 9) =>
  `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${dev}" result="b"/><feFlood flood-color="${color}"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

const LOW_HUE_STEPS = [0, 72, 144, 216, 288];
const METALS: [string, string, string][] = [
  ["#F4C79A", "#B8733A", "#5A2F12"], // bronze
  ["#FFFFFF", "#CBD5E1", "#475569"], // silver
  ["#FFF6C8", "#F5C542", "#8A5A0B"], // gold
];

function lowToken(def: RealmsGameDef, rank: number): string {
  const base = hexToHsl(def.palette[0]);
  const hue = base.h + LOW_HUE_STEPS[rank];
  const light = hsl(hue, 0.7, 0.66);
  const mid = hsl(hue, 0.68, 0.44);
  const dark = hsl(hue, 0.7, 0.16);
  const frame = REALMS_WORLDS[def.world].frame;
  const label = LOW_RANK_LABELS[rank];
  const size = label.length > 1 ? 150 : 178;
  return svg(
    384,
    384,
    `<defs>${SHADOW}<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
     <linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${light}"/></linearGradient></defs>
     <g filter="url(#sh)">
       <path d="${framePath(frame)}" fill="url(#f)" stroke="${light}" stroke-width="9" stroke-linejoin="round"/>
       ${frameDetail(frame, light)}
       <text x="192" y="${192 + size * 0.35}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="900" font-size="${size}" fill="url(#t)" stroke="${dark}" stroke-width="8" paint-order="stroke">${label}</text>
     </g>`,
  );
}

async function premiumToken(def: RealmsGameDef, tier: number): Promise<string> {
  const [hi, mid, lo] = METALS[tier];
  const [primary, secondary, glow, deep] = def.palette;
  const discTop =
    tier === 0 ? shade(secondary, 0.36) : tier === 1 ? shade(primary, 0.42) : shade(primary, 0.5);
  const discBottom = shade(deep, 0.1);
  const icon = await glyph(def.premiums[tier].icon);
  return svg(
    384,
    384,
    `<defs>${SHADOW}${GLOW("g", glow, 7)}
      <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset="0.5" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
      <radialGradient id="disc" cx="0.5" cy="0.35" r="0.7"><stop offset="0" stop-color="${discTop}"/><stop offset="1" stop-color="${discBottom}"/></radialGradient></defs>
     <g filter="url(#sh)">
       <circle cx="192" cy="192" r="170" fill="url(#rim)"/>
       <circle cx="192" cy="192" r="146" fill="url(#disc)" stroke="${lo}" stroke-width="4"/>
       <ellipse cx="192" cy="118" rx="104" ry="42" fill="#fff" opacity="0.12"/>
       <g filter="url(#g)">${placeGlyph(icon, 192, 196, 184, "#FFFFFF", 1.7)}</g>
       ${tier === 2 ? `<path d="${polygon(radial(4, 22, 7, -90))}" fill="#FFF6C8" transform="translate(98,-96)"/>` : ""}
     </g>`,
  );
}

async function scatterToken(def: RealmsGameDef): Promise<string> {
  const [primary, , glow, deep] = def.palette;
  const icon = await glyph(def.scatter.icon);
  return svg(
    384,
    384,
    `<defs>${SHADOW}${GLOW("g", "#FFFFFF", 6)}
      <radialGradient id="burst" cx="0.5" cy="0.5" r="0.5"><stop offset="0.55" stop-color="#FFFFFF"/><stop offset="0.8" stop-color="${glow}"/><stop offset="1" stop-color="${glow}" stop-opacity="0.15"/></radialGradient>
      <radialGradient id="core" cx="0.5" cy="0.38" r="0.65"><stop offset="0" stop-color="${glow}"/><stop offset="1" stop-color="${shade(primary, 0.32)}"/></radialGradient></defs>
     <path d="${polygon(radial(16, 186, 112, -90))}" fill="url(#burst)" opacity="0.95"/>
     <g filter="url(#sh)">
       <circle cx="192" cy="192" r="122" fill="url(#core)" stroke="#FFFFFF" stroke-width="8"/>
       <g filter="url(#g)">${placeGlyph(icon, 192, 188, 158, shade(deep, 0.12, 0.6), 2.2)}</g>
     </g>`,
  );
}

async function bombToken(def: RealmsGameDef): Promise<string> {
  const [primary, secondary, glow] = def.palette;
  const icon = await glyph(def.bomb.icon);
  return svg(
    384,
    384,
    `<defs>${SHADOW}
      <radialGradient id="orb" cx="0.36" cy="0.3" r="0.75"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.18" stop-color="${glow}"/><stop offset="0.6" stop-color="${shade(secondary, 0.34)}"/><stop offset="1" stop-color="${shade(secondary, 0.1)}"/></radialGradient></defs>
     <g filter="url(#sh)">
       <circle cx="192" cy="192" r="156" fill="url(#orb)" stroke="${glow}" stroke-width="6"/>
       ${placeGlyph(icon, 192, 192, 210, "#FFFFFF", 1.4, `opacity="0.28"`)}
       <circle cx="192" cy="192" r="156" fill="none" stroke="${primary}" stroke-width="2" opacity="0.6"/>
     </g>`,
  );
}

// ── scenes ──────────────────────────────────────────────────────────────────
/** Inner markup of a token SVG with its ids prefixed, so several can share one scene. */
function embed(tokenSvg: string, prefix: string): string {
  return tokenSvg
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "")
    .replace(/id="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`);
}

async function patternLayer(
  def: RealmsGameDef,
  w: number,
  h: number,
  count: number,
  seed: number,
  opacity: number,
) {
  const rng = mulberry32(seed);
  const icons = await Promise.all(
    [...def.premiums.map((p) => p.icon), def.scatter.icon].map(glyph),
  );
  const glow = def.palette[2];
  return Array.from({ length: count }, (_, i) => {
    const size = 40 + rng() * 90;
    const x = rng() * w;
    const y = rng() * h;
    const rot = (rng() - 0.5) * 50;
    return `<g transform="rotate(${rot.toFixed(1)} ${x.toFixed(0)} ${y.toFixed(0)})" opacity="${(opacity * (0.5 + rng())).toFixed(3)}">${placeGlyph(icons[i % icons.length], x, y, size, glow, 1.4)}</g>`;
  }).join("");
}

function rays(
  cx: number,
  cy: number,
  count: number,
  length: number,
  color: string,
  opacity: number,
) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const spread = Math.PI / count / 2.2;
    const p1 = [cx + length * Math.cos(a - spread), cy + length * Math.sin(a - spread)];
    const p2 = [cx + length * Math.cos(a + spread), cy + length * Math.sin(a + spread)];
    return `<path d="M${cx},${cy}L${p1[0].toFixed(0)},${p1[1].toFixed(0)}L${p2[0].toFixed(0)},${p2[1].toFixed(0)}Z" fill="${color}" opacity="${opacity}"/>`;
  }).join("");
}

function sceneBackground(def: RealmsGameDef, w: number, h: number, cy: number) {
  const [primary, secondary, , deep] = def.palette;
  return `<defs><radialGradient id="bg" cx="0.5" cy="${(cy / h).toFixed(2)}" r="0.85">
      <stop offset="0" stop-color="${shade(primary, 0.3)}"/><stop offset="0.45" stop-color="${shade(secondary, 0.14)}"/><stop offset="1" stop-color="${shade(deep, 0.04, 0.3)}"/></radialGradient>
      <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>`;
}

async function backdrop(def: RealmsGameDef) {
  const w = 1280;
  const h = 720;
  return svg(
    w,
    h,
    `${sceneBackground(def, w, h, 300)}
     ${rays(w / 2, 260, 18, 900, def.palette[2], 0.04)}
     ${await patternLayer(def, w, h, 46, def.no * 131, 0.09)}
     <rect width="${w}" height="${h}" fill="url(#vig)"/>`,
  );
}

async function loadingBg(def: RealmsGameDef) {
  const w = 1280;
  const h = 720;
  const inner = embed(await scatterToken(def), "sc");
  return svg(
    w,
    h,
    `${sceneBackground(def, w, h, 250)}
     ${rays(w / 2, 250, 24, 1000, def.palette[2], 0.06)}
     ${await patternLayer(def, w, h, 28, def.no * 977, 0.07)}
     <g transform="translate(${w / 2 - 170},${250 - 170}) scale(${340 / 384})" opacity="0.9">${inner}</g>
     <rect width="${w}" height="${h}" fill="url(#vig)"/>`,
  );
}

function titleLines(name: string): string[] {
  if (name.length <= 13) return [name];
  const words = name.split(" ");
  let best = [name];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) [best, bestDiff] = [[a, b], diff];
  }
  return best;
}

async function thumbnail(def: RealmsGameDef) {
  const w = 768;
  const [, , glow, deep] = def.palette;
  const hero = embed(await premiumToken(def, 2), "hero");
  const scatter = embed(await scatterToken(def), "sc");
  const bomb = embed(await bombToken(def), "bo");
  const lines = titleLines(def.name.toUpperCase());
  const longest = Math.max(...lines.map((l) => l.length));
  const fontSize = Math.min(92, Math.floor(680 / (longest * 0.74)));
  const top = 620 - (lines.length - 1) * fontSize * 0.95;
  const title = lines
    .map(
      (line, i) =>
        `<text x="384" y="${(top + i * fontSize * 0.98).toFixed(0)}" text-anchor="middle" font-family="'Arial Black', Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="url(#tt)" stroke="${shade(deep, 0.08, 0.5)}" stroke-width="12" paint-order="stroke">${line.replace(/&/g, "&amp;")}</text>`,
    )
    .join("");
  return svg(
    w,
    w,
    `${sceneBackground(def, w, w, 300)}
     <defs><linearGradient id="tt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${glow}"/></linearGradient></defs>
     ${rays(384, 300, 20, 700, glow, 0.07)}
     ${await patternLayer(def, w, w, 18, def.no * 53, 0.08)}
     <g transform="translate(${384 - 190},${300 - 230}) scale(${380 / 384})">${hero}</g>
     <g transform="translate(40,310) scale(${200 / 384})">${scatter}</g>
     <g transform="translate(528,310) scale(${200 / 384})">${bomb}</g>
     <rect width="${w}" height="${w}" fill="url(#vig)"/>
     <text x="384" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="24" letter-spacing="6" fill="${glow}" opacity="0.85">${REALMS_WORLDS[def.world].label.toUpperCase().replace(/&/g, "&amp;")}</text>
     ${title}`,
  );
}

// ── output ──────────────────────────────────────────────────────────────────
async function write(svgText: string, file: string, quality: number) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svgText)).webp({ quality, alphaQuality: 90, effort: 5 }).toFile(file);
}

async function generate(def: RealmsGameDef) {
  const dir = path.join(SYMBOL_DIR, def.id);
  const jobs: Promise<unknown>[] = [];
  for (let r = 0; r < 5; r++)
    jobs.push(write(lowToken(def, r), path.join(dir, `l${r + 1}.webp`), 88));
  for (let t = 0; t < 3; t++)
    jobs.push(premiumToken(def, t).then((s) => write(s, path.join(dir, `p${t + 1}.webp`), 88)));
  jobs.push(scatterToken(def).then((s) => write(s, path.join(dir, "scatter.webp"), 88)));
  jobs.push(bombToken(def).then((s) => write(s, path.join(dir, "bomb.webp"), 88)));
  jobs.push(backdrop(def).then((s) => write(s, path.join(dir, "backdrop.webp"), 80)));
  jobs.push(loadingBg(def).then((s) => write(s, path.join(dir, "loading-bg.webp"), 80)));
  jobs.push(thumbnail(def).then((s) => write(s, path.join(THUMB_DIR, `${def.id}.webp`), 84)));
  await Promise.all(jobs);
}

/** One row per title: thumbnail + its 10 symbols — for eyeballing the whole family. */
async function contactSheet(defs: readonly RealmsGameDef[]) {
  const cell = 96;
  const rowW = cell * 11;
  const composites: sharp.OverlayOptions[] = [];
  for (const [row, def] of defs.entries()) {
    const files = [
      path.join(THUMB_DIR, `${def.id}.webp`),
      ...["l1", "l2", "l3", "l4", "l5", "p1", "p2", "p3", "scatter", "bomb"].map((k) =>
        path.join(SYMBOL_DIR, def.id, `${k}.webp`),
      ),
    ];
    for (const [col, file] of files.entries()) {
      composites.push({
        input: await sharp(file).resize(cell, cell).toBuffer(),
        left: col * cell,
        top: row * cell,
      });
    }
  }
  await sharp({
    create: { width: rowW, height: cell * defs.length, channels: 3, background: "#111" },
  })
    .composite(composites)
    .png()
    .toFile(SHEET_PATH);
  console.log(`contact sheet: ${SHEET_PATH}`);
}

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith("--"));
const defs = only.length ? REALMS_GAMES.filter((g) => only.includes(g.id)) : REALMS_GAMES;
for (const def of defs) {
  await generate(def);
  console.log(`art ${String(def.no).padStart(2)} ${def.id}`);
}
if (args.includes("--sheet")) await contactSheet(defs);
