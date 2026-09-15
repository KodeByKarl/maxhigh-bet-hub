/**
 * Apply panther UI themes to all clones:
 * 1) Sync themed visual files from golden-panther → each clone
 * 2) Sync Slot.tsx from GoldenPantherSlot with identifier rewrite
 * 3) Patch paytable ICON_SRC from theme
 * 4) Generate per-game symbol packs + backdrops via sharp hue-shift
 *
 *   node scripts/apply-panther-themes.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");

const PARENT = {
  id: "golden-panther",
  name: "Golden Panther",
  pascal: "GoldenPanther",
  const: "GOLDEN_PANTHER",
  camel: "goldenPanther",
  audio: "pantherAudio",
};

const CLONES = [
  { id: "jade-jaguar", name: "Jade Jaguar", pascal: "JadeJaguar", const: "JADE_JAGUAR", camel: "jadeJaguar", hue: 140, tint: { r: 40, g: 180, b: 120 } },
  { id: "ember-tiger", name: "Ember Tiger", pascal: "EmberTiger", const: "EMBER_TIGER", camel: "emberTiger", hue: -25, tint: { r: 220, g: 80, b: 30 } },
  { id: "lotus-lynx", name: "Lotus Lynx", pascal: "LotusLynx", const: "LOTUS_LYNX", camel: "lotusLynx", hue: 280, tint: { r: 200, g: 60, b: 200 } },
  { id: "coral-cobra", name: "Coral Cobra", pascal: "CoralCobra", const: "CORAL_COBRA", camel: "coralCobra", hue: 170, tint: { r: 30, g: 180, b: 170 } },
  { id: "frost-fox", name: "Frost Fox", pascal: "FrostFox", const: "FROST_FOX", camel: "frostFox", hue: 200, tint: { r: 60, g: 160, b: 230 } },
  { id: "solar-serpent", name: "Solar Serpent", pascal: "SolarSerpent", const: "SOLAR_SERPENT", camel: "solarSerpent", hue: 10, tint: { r: 230, g: 180, b: 40 } },
  { id: "honey-hive", name: "Honey Hive", pascal: "HoneyHive", const: "HONEY_HIVE", camel: "honeyHive", hue: 35, tint: { r: 230, g: 160, b: 30 } },
  { id: "midnight-owl", name: "Midnight Owl", pascal: "MidnightOwl", const: "MIDNIGHT_OWL", camel: "midnightOwl", hue: 240, tint: { r: 90, g: 100, b: 220 } },
  { id: "ruby-raven", name: "Ruby Raven", pascal: "RubyRaven", const: "RUBY_RAVEN", camel: "rubyRaven", hue: 340, tint: { r: 210, g: 40, b: 70 } },
];

const VISUAL_FILES = [
  "PantherIcon.tsx",
  "ReelCell.tsx",
  "FreeSpinsTriggerModal.tsx",
  "GameMenuModal.tsx",
  "BetSelectModal.tsx",
  "BuyFeatureModal.tsx",
  "PaytableModal.tsx",
  "AutoSpinModal.tsx",
];

const SYMBOL_MAP = [
  ["10.png", "10.png"],
  ["J.png", "J.png"],
  ["Q.png", "Q.png"],
  ["K.webp", "K.webp"],
  ["A.png", "A.png"],
  ["owl.png", "premium-a.png"],
  ["wolf.png", "premium-b.png"],
  ["ram.png", "premium-c.png"],
  ["scatter.webp", "scatter.webp"],
  ["wild.webp", "wild.webp"],
];

function rewrite(text, g) {
  const pairs = [
    [PARENT.const, g.const],
    [PARENT.pascal, g.pascal],
    [PARENT.camel, g.camel],
    [PARENT.audio, `${g.camel}Audio`],
    ["goldenPantherTheme", `${g.camel}Theme`],
    [PARENT.name, g.name],
    [PARENT.id, g.id],
    ["./golden-panther/", `./${g.id}/`],
    ["@/lib/golden-panther-config", `@/lib/${g.id}-config`],
  ];
  let out = text;
  for (const [a, b] of pairs) out = out.split(a).join(b);
  return out;
}

function syncVisualFiles(g) {
  const srcDir = path.join(ROOT, "src/components/maxhigh/golden-panther");
  const destDir = path.join(ROOT, "src/components/maxhigh", g.id);
  for (const file of VISUAL_FILES) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    if (!fs.existsSync(src)) continue;
    fs.writeFileSync(dest, rewrite(fs.readFileSync(src, "utf8"), g));
  }
}

function patchPaytable(g) {
  const file = path.join(ROOT, "src/components/maxhigh", g.id, "paytable.ts");
  let text = fs.readFileSync(file, "utf8");
  if (!text.includes(`${g.camel}Theme`)) {
    if (text.includes('from "./runtimeConfig"')) {
      text = text.replace(
        'from "./runtimeConfig";',
        `from "./runtimeConfig";\nimport { ${g.camel}Theme } from "./theme";`,
      );
    } else {
      text = `import { ${g.camel}Theme } from "./theme";\n` + text;
    }
  }
  text = text.replace(
    /export const ICON_SRC: Record<SymKind, string> = \{[\s\S]*?\};/,
    `export const ICON_SRC: Record<SymKind, string> = { ...${g.camel}Theme.assets.icons };`,
  );
  fs.writeFileSync(file, text);
}

function syncSlotFromParent(g) {
  const src = path.join(ROOT, "src/components/maxhigh/GoldenPantherSlot.tsx");
  const dest = path.join(ROOT, "src/components/maxhigh", `${g.pascal}Slot.tsx`);
  let text = rewrite(fs.readFileSync(src, "utf8"), g);
  text = text.replace(/export function GoldenPantherSlot/, `export function ${g.pascal}Slot`);
  // rewrite already changed GoldenPanther → JadeJaguar etc for export
  text = text.replace(
    new RegExp(`export function ${g.pascal}Slot`),
    `export function ${g.pascal}Slot`,
  );
  fs.writeFileSync(dest, text);
  console.log("synced slot", path.basename(dest));
}

async function tintFile(src, dest, hue, tint) {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  const meta = await sharp(src).metadata();
  const rotated = await sharp(src)
    .modulate({ hue, saturation: 1.15, brightness: 1.02 })
    .toBuffer();
  const overlay = Buffer.from(
    `<svg width="${meta.width || 512}" height="${meta.height || 512}">
      <rect width="100%" height="100%" fill="rgb(${tint.r},${tint.g},${tint.b})" fill-opacity="0.18"/>
    </svg>`,
  );
  const ext = path.extname(dest).toLowerCase();
  let pipeline = sharp(rotated).composite([{ input: overlay, blend: "overlay" }]);
  if (ext === ".webp") pipeline = pipeline.webp({ quality: 86 });
  else pipeline = pipeline.png();
  await pipeline.toFile(dest);
}

async function generateAssets(g) {
  const outDir = path.join(ROOT, "public/images/symbols", g.id);
  await fs.promises.mkdir(outDir, { recursive: true });
  const backdropSrc = path.join(ROOT, "public/images/symbols/panther/backdrop.webp");
  const loadingSrc = path.join(ROOT, "public/images/symbols/panther/loading-bg.webp");
  const gpDir = path.join(ROOT, "public/images/symbols/gp");

  await tintFile(backdropSrc, path.join(outDir, "backdrop.webp"), g.hue, g.tint);
  await tintFile(
    fs.existsSync(loadingSrc) ? loadingSrc : backdropSrc,
    path.join(outDir, "loading-bg.webp"),
    g.hue,
    g.tint,
  );

  for (const [srcName, destName] of SYMBOL_MAP) {
    const src = path.join(gpDir, srcName);
    if (!fs.existsSync(src)) {
      console.warn("missing symbol", src);
      continue;
    }
    await tintFile(src, path.join(outDir, destName), g.hue, g.tint);
  }
  console.log("assets", g.id);
}

async function main() {
  const skipAssets = process.argv.includes("--skip-assets");
  for (const g of CLONES) {
    console.log("\n==", g.name, "==");
    syncVisualFiles(g);
    patchPaytable(g);
    syncSlotFromParent(g);
    if (!skipAssets) await generateAssets(g);
  }
  console.log("\nDone applying panther themes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
