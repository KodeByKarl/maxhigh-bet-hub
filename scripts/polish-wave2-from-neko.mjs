/**
 * Polish wave-2 catalog titles from Lucky Neko template:
 * rectangle boards, soft toast, soft perya SFX voices, CELLS clamps.
 *
 *   node scripts/polish-wave2-from-neko.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = {
  id: "lucky-neko",
  name: "Lucky Neko",
  pascal: "LuckyNeko",
  const: "LUCKY_NEKO",
  camel: "luckyNeko",
};

/**
 * Unique rectangle layouts (avoid duplicating Jade 3×3 / Lotus 4×4 / Coral 5×5 /
 * Owl+Neko 5×4 / Raven 6×5 / Serpent 4×6 where practical).
 * toastHex = accent for cashflow toasts + celebration tint.
 */
const GAMES = [
  {
    id: "fortune-tiger",
    name: "Fortune Tiger",
    pascal: "FortuneTiger",
    const: "FORTUNE_TIGER",
    camel: "fortuneTiger",
    cols: 4,
    rows: 5,
    minCluster: 6,
    toastHex: "#F97316",
    cellRadius: "rounded-xl",
    pack: "1",
  },
  {
    id: "fortune-ox",
    name: "Fortune Ox",
    pascal: "FortuneOx",
    const: "FORTUNE_OX",
    camel: "fortuneOx",
    cols: 5,
    rows: 3,
    minCluster: 5,
    toastHex: "#EAB308",
    cellRadius: "rounded-lg",
    pack: "1",
  },
  {
    id: "fortune-rabbit",
    name: "Fortune Rabbit",
    pascal: "FortuneRabbit",
    const: "FORTUNE_RABBIT",
    camel: "fortuneRabbit",
    cols: 6,
    rows: 3,
    minCluster: 5,
    toastHex: "#A78BFA",
    cellRadius: "rounded-2xl",
    pack: "1",
  },
  {
    id: "fortune-mouse",
    name: "Fortune Mouse",
    pascal: "FortuneMouse",
    const: "FORTUNE_MOUSE",
    camel: "fortuneMouse",
    cols: 3,
    rows: 5,
    minCluster: 5,
    toastHex: "#94A3B8",
    cellRadius: "rounded-xl",
    pack: "1",
  },
  {
    id: "prosperity-lion",
    name: "Prosperity Lion",
    pascal: "ProsperityLion",
    const: "PROSPERITY_LION",
    camel: "prosperityLion",
    cols: 4,
    rows: 3,
    minCluster: 4,
    toastHex: "#F59E0B",
    cellRadius: "rounded-2xl",
    pack: "1",
  },
  {
    id: "buffalo-reign",
    name: "Buffalo Reign",
    pascal: "BuffaloReign",
    const: "BUFFALO_REIGN",
    camel: "buffaloReign",
    cols: 6,
    rows: 4,
    minCluster: 7,
    toastHex: "#D97706",
    cellRadius: "rounded-lg",
    pack: "1",
  },
  {
    id: "safari-gold",
    name: "Safari Gold",
    pascal: "SafariGold",
    const: "SAFARI_GOLD",
    camel: "safariGold",
    cols: 7,
    rows: 3,
    minCluster: 6,
    toastHex: "#CA8A04",
    cellRadius: "rounded-xl",
    pack: "1",
  },
  {
    id: "cleopatra-gold",
    name: "Cleopatra Gold",
    pascal: "CleopatraGold",
    const: "CLEOPATRA_GOLD",
    camel: "cleopatraGold",
    cols: 3,
    rows: 4,
    minCluster: 4,
    toastHex: "#EAB308",
    cellRadius: "rounded-2xl",
    pack: "1",
  },
  {
    id: "maya-gold",
    name: "Maya Gold",
    pascal: "MayaGold",
    const: "MAYA_GOLD",
    camel: "mayaGold",
    cols: 5,
    rows: 6,
    minCluster: 7,
    toastHex: "#F59E0B",
    cellRadius: "rounded-xl",
    pack: "1",
  },
  {
    id: "temple-rush",
    name: "Temple Rush",
    pascal: "TempleRush",
    const: "TEMPLE_RUSH",
    camel: "templeRush",
    cols: 4,
    rows: 7,
    minCluster: 7,
    toastHex: "#FB923C",
    cellRadius: "rounded-lg",
    pack: "1",
  },
  {
    id: "pharaoh-fire",
    name: "Pharaoh Fire",
    pascal: "PharaohFire",
    const: "PHARAOH_FIRE",
    camel: "pharaohFire",
    cols: 3,
    rows: 6,
    minCluster: 5,
    toastHex: "#EF4444",
    cellRadius: "rounded-xl",
    pack: "1",
  },
  {
    id: "desert-riches",
    name: "Desert Riches",
    pascal: "DesertRiches",
    const: "DESERT_RICHES",
    camel: "desertRiches",
    cols: 7,
    rows: 4,
    minCluster: 7,
    toastHex: "#F59E0B",
    cellRadius: "rounded-lg",
    pack: "1",
  },
  {
    id: "gate-of-ra",
    name: "Gate of Ra",
    pascal: "GateOfRa",
    const: "GATE_OF_RA",
    camel: "gateOfRa",
    cols: 8,
    rows: 3,
    minCluster: 6,
    toastHex: "#FBBF24",
    cellRadius: "rounded-2xl",
    pack: "1",
  },
  {
    id: "zeus-strike",
    name: "Zeus Strike",
    pascal: "ZeusStrike",
    const: "ZEUS_STRIKE",
    camel: "zeusStrike",
    cols: 3,
    rows: 7,
    minCluster: 6,
    toastHex: "#38BDF8",
    cellRadius: "rounded-xl",
    pack: "1",
  },
  {
    id: "thor-thunder",
    name: "Thor Thunder",
    pascal: "ThorThunder",
    const: "THOR_THUNDER",
    camel: "thorThunder",
    cols: 7,
    rows: 5,
    minCluster: 8,
    toastHex: "#60A5FA",
    cellRadius: "rounded-lg",
    pack: "1",
  },
  {
    id: "godly-gates",
    name: "Godly Gates",
    pascal: "GodlyGates",
    const: "GODLY_GATES",
    camel: "godlyGates",
    cols: 8,
    rows: 4,
    minCluster: 8,
    toastHex: "#818CF8",
    cellRadius: "rounded-2xl",
    pack: "1",
  },
  {
    id: "olympus-wrath",
    name: "Olympus Wrath",
    pascal: "OlympusWrath",
    const: "OLYMPUS_WRATH",
    camel: "olympusWrath",
    cols: 4,
    rows: 8,
    minCluster: 8,
    toastHex: "#A78BFA",
    cellRadius: "rounded-xl",
    pack: "1",
  },
  {
    id: "enchanted-grove",
    name: "Enchanted Grove",
    pascal: "EnchantedGrove",
    const: "ENCHANTED_GROVE",
    camel: "enchantedGrove",
    cols: 9,
    rows: 3,
    minCluster: 7,
    toastHex: "#34D399",
    cellRadius: "rounded-2xl",
    pack: "1",
  },
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function softLetterColors(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lighten = (t) => {
    const rr = Math.round(r + (255 - r) * t);
    const gg = Math.round(g + (255 - g) * t);
    const bb = Math.round(b + (255 - b) * t);
    return `#${[rr, gg, bb].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  };
  return [
    lighten(0.85),
    lighten(0.7),
    lighten(0.55),
    lighten(0.4),
    hex,
    lighten(0.3),
    lighten(0.5),
    lighten(0.65),
  ];
}

function rewrite(text, g) {
  const pairs = [
    [SRC.const, g.const],
    [SRC.pascal, g.pascal],
    [SRC.camel, g.camel],
    [SRC.name, g.name],
    [SRC.id, g.id],
  ];
  let out = text;
  for (const [from, to] of pairs) out = out.split(from).join(to);
  return out;
}

function copyTree(srcDir, destDir, g, renameFile) {
  ensureDir(destDir);
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, ent.name);
    const name = renameFile ? renameFile(ent.name) : ent.name;
    const dest = path.join(destDir, name);
    if (ent.isDirectory()) {
      copyTree(src, dest, g, renameFile);
      continue;
    }
    const ext = path.extname(name).toLowerCase();
    if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".txt", ".md"].includes(ext)) {
      fs.writeFileSync(dest, rewrite(fs.readFileSync(src, "utf8"), g), "utf8");
    } else {
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
    }
  }
}

function patchTypes(g, cells) {
  const p = path.join(ROOT, "src/components/maxhigh", g.id, "types.ts");
  let t = fs.readFileSync(p, "utf8");
  t = t.replace(
    /\/\*\* 5×4 lucky board[\s\S]*?export const MIN_CLUSTER = \d+;/,
    `/** ${g.cols}×${g.rows} board — unique rectangle for ${g.name}. */\nexport const COLS = ${g.cols};\nexport const ROWS = ${g.rows};\nexport const TOP_COLS = 0;\nexport const MAIN_CELLS = COLS * ROWS; // ${cells}\nexport const CELLS = MAIN_CELLS;\nexport const MIN_CLUSTER = ${g.minCluster};`,
  );
  fs.writeFileSync(p, t, "utf8");
}

function patchReelGrid(g, cells) {
  const p = path.join(ROOT, "src/components/maxhigh", g.id, "ReelGrid.tsx");
  let t = fs.readFileSync(p, "utf8");
  const aspect = `${g.cols}/${g.rows}`;
  const maxH = cells >= 30 ? "58dvh" : cells >= 24 ? "60dvh" : "62dvh";
  const maxW = cells >= 30 ? "44rem" : cells >= 24 ? "42rem" : "38rem";
  t = t.replace(
    /\/\*\* 5×4 board[\s\S]*?className="mx-auto grid aspect-\[5\/4\][^"]*"/,
    `/** ${g.cols}×${g.rows} board — fill available play space. */\nexport const ReelGrid = memo(function ReelGrid({ visuals }: ReelGridProps) {\n  const { slots, phase, winningKeys, payoutByKey, spawnedKeys, fallenKeys, fallDistance } =\n    visuals;\n\n  return (\n    <div\n      className="mx-auto grid aspect-[${aspect}] max-h-[min(${maxH},34rem)] w-[min(98vw,calc(${maxH}*${aspect}),${maxW})] gap-1.5 sm:max-h-[min(64dvh,38rem)] sm:w-[min(96vw,calc(64dvh*${aspect}),${maxW})] sm:gap-2"`,
  );
  // If first replace failed (already rewritten name), do a simpler class swap
  if (t.includes("aspect-[5/4]")) {
    t = t.replace(/aspect-\[5\/4\]/g, `aspect-[${aspect}]`);
    t = t.replace(/calc\(62dvh\*5\/4\)/g, `calc(${maxH}*${aspect})`);
    t = t.replace(/calc\(64dvh\*5\/4\)/g, `calc(64dvh*${aspect})`);
  }
  fs.writeFileSync(p, t, "utf8");
}

function patchReelCell(g) {
  const p = path.join(ROOT, "src/components/maxhigh", g.id, "ReelCell.tsx");
  let t = fs.readFileSync(p, "utf8");
  t = t.replace(/rounded-2xl isolate/g, `${g.cellRadius} isolate`);
  t = t.replace(
    /rgba\(244,114,182,0\.16\)/g,
    (() => {
      const { r, g: gg, b } = hexToRgb(g.toastHex);
      return `rgba(${r},${gg},${b},0.16)`;
    })(),
  );
  t = t.replace(/lucky neko tile well/g, `${g.name} tile well`);
  fs.writeFileSync(p, t, "utf8");
}

function patchWinCelebration(g) {
  const p = path.join(ROOT, "src/components/maxhigh", g.id, "WinCelebration.tsx");
  let t = fs.readFileSync(p, "utf8");
  const colors = softLetterColors(g.toastHex);
  t = t.replace(
    /const LETTER_COLORS = \[[\s\S]*?\];/,
    `const LETTER_COLORS = [\n  ${colors.map((c) => `"${c}"`).join(",\n  ")},\n];`,
  );
  t = t.replace(/Soft pink \/ rose — lucky neko palette\./, `${g.name} palette.`);
  t = t.replace(/Lucky Neko win overlay[^.]*\./, `${g.name} win overlay — soft paid sparkle.`);
  fs.writeFileSync(p, t, "utf8");
}

function writeAudio(g) {
  const p = path.join(ROOT, "src/components/maxhigh", g.id, "audio.ts");
  fs.writeFileSync(
    p,
    `/**
 * ${g.name} — soft distinct perya voice (ear-safe).
 */
import {
  createSoftPeryaAudio,
  PERYA_VOICES,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";

export const ${g.camel}Audio = createSoftPeryaAudio(PERYA_VOICES["${g.id}"]!);
`,
    "utf8",
  );
}

function writeTheme(g) {
  const p = path.join(ROOT, "src/components/maxhigh", g.id, "theme.ts");
  fs.writeFileSync(
    p,
    `import {
  themedIconPack,
  type PantherTheme,
} from "@/components/maxhigh/panther-shared/theme";
import { ${g.const}_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const ${g.camel}Theme: PantherTheme = {
  id: "${g.id}",
  name: "${g.name}",
  assets: {
    backdrop: "/images/symbols/${g.id}/backdrop.webp",
    loadingBg: "/images/symbols/${g.id}/loading-bg.webp",
    icons: themedIconPack("${g.id}", "${g.pack}"),
  },
  colors: ${g.const}_COLORS,
};
`,
    "utf8",
  );
}

function patchSlotToast(g) {
  const p = path.join(ROOT, "src/components/maxhigh", `${g.pascal}Slot.tsx`);
  let t = fs.readFileSync(p, "utf8");
  const { r, g: gg, b } = hexToRgb(g.toastHex);
  // Replace rose/pink toast colors with game accent
  t = t.replace(/rgba\(244,114,182,0\.55\)/g, `rgba(${r},${gg},${b},0.55)`);
  t = t.replace(
    /rgba\(131,24,67,0\.92\)/g,
    `rgba(${Math.round(r * 0.35)},${Math.round(gg * 0.2)},${Math.round(b * 0.25)},0.92)`,
  );
  t = t.replace(/#FBCFE8/g, softLetterColors(g.toastHex)[2]);
  t = t.replace(/text-pink-200\/80/g, "opacity-80");
  t = t.replace(/rgba\(251,207,232,0\.65\)/g, `rgba(${r},${gg},${b},0.65)`);
  t = t.replace(
    /linear-gradient\(135deg, #F472B6 0%, #831843 55%, #111827 100%\)/g,
    `linear-gradient(135deg, ${g.toastHex} 0%, rgb(${Math.round(r * 0.4)},${Math.round(gg * 0.25)},${Math.round(b * 0.3)}) 55%, #111827 100%)`,
  );
  t = t.replace(/#FDF2F8/g, softLetterColors(g.toastHex)[0]);
  fs.writeFileSync(p, t, "utf8");
}

function patchConfig(g, cells) {
  const p = path.join(ROOT, "src/lib", `${g.id}-config.ts`);
  if (!fs.existsSync(p)) {
    console.warn(`  skip config (missing): ${p}`);
    return;
  }
  let t = fs.readFileSync(p, "utf8");

  // Defaults
  t = t.replace(
    /seedClusterMin:\s*\d+,/,
    `seedClusterMin: ${Math.min(cells - 2, g.minCluster + 1)},`,
  );
  t = t.replace(
    /seedClusterMax:\s*\d+,/,
    `seedClusterMax: ${Math.min(cells - 1, g.minCluster + 3)},`,
  );
  t = t.replace(/minCluster:\s*\d+,/, `minCluster: ${g.minCluster},`);

  // Clamps — tighten upper bound to CELLS
  t = t.replace(
    /seedClusterMin:\s*clamp\(Math\.round\(num\(o\.seedClusterMin,\s*d\.seedClusterMin\)\),\s*\d+,\s*\d+\),/,
    `seedClusterMin: clamp(Math.round(num(o.seedClusterMin, d.seedClusterMin)), 3, ${cells}),`,
  );
  t = t.replace(
    /seedClusterMax:\s*clamp\(Math\.round\(num\(o\.seedClusterMax,\s*d\.seedClusterMax\)\),\s*\d+,\s*\d+\),/,
    `seedClusterMax: clamp(Math.round(num(o.seedClusterMax, d.seedClusterMax)), 3, ${cells}),`,
  );
  t = t.replace(
    /minCluster:\s*clamp\(Math\.round\(num\(o\.minCluster,\s*d\.minCluster\)\),\s*\d+,\s*\d+\),/,
    `minCluster: clamp(Math.round(num(o.minCluster, d.minCluster)), 3, ${cells}),`,
  );
  // freeSpins trigger clamps often use 30 — cap at cells
  t = t.replace(
    /(freeSpinsTriggerCount:\s*clamp\(\s*Math\.round\(num\(o\.freeSpinsTriggerCount,\s*d\.freeSpinsTriggerCount\)\),\s*\d+,\s*)\d+/,
    `$1${cells}`,
  );
  t = t.replace(
    /(freeSpinsRetriggerCount:\s*clamp\(\s*Math\.round\(num\(o\.freeSpinsRetriggerCount,\s*d\.freeSpinsRetriggerCount\)\),\s*\d+,\s*)\d+/,
    `$1${cells}`,
  );

  // Comment if present
  if (!t.includes(`${g.cols}×${g.rows}`)) {
    t = t.replace(
      /(\/\*\*[^*]*never require more matches than CELLS\.\s*\*\/\n\s*)?seedClusterMin:/,
      `/** ${g.cols}×${g.rows} board has ${cells} cells — never require more matches than CELLS. */\n    seedClusterMin:`,
    );
  }

  fs.writeFileSync(p, t, "utf8");
}

function polishOne(g) {
  const cells = g.cols * g.rows;
  console.log(`\n=== polish ${g.id} (${g.cols}×${g.rows}=${cells}) ===`);

  const uiDest = path.join(ROOT, "src/components/maxhigh", g.id);
  if (fs.existsSync(uiDest)) fs.rmSync(uiDest, { recursive: true, force: true });
  copyTree(path.join(ROOT, "src/components/maxhigh", SRC.id), uiDest, g, (name) =>
    name.split(SRC.pascal).join(g.pascal).split(SRC.id).join(g.id),
  );

  fs.writeFileSync(
    path.join(ROOT, "src/components/maxhigh", `${g.pascal}Slot.tsx`),
    rewrite(
      fs.readFileSync(path.join(ROOT, "src/components/maxhigh", `${SRC.pascal}Slot.tsx`), "utf8"),
      g,
    ),
    "utf8",
  );

  patchTypes(g, cells);
  patchReelGrid(g, cells);
  patchReelCell(g);
  patchWinCelebration(g);
  writeAudio(g);
  writeTheme(g);
  patchSlotToast(g);
  patchConfig(g, cells);

  console.log(`  ok ${g.name}`);
}

for (const g of GAMES) polishOne(g);
console.log(`\nDone — polished ${GAMES.length} games from ${SRC.name}.`);
