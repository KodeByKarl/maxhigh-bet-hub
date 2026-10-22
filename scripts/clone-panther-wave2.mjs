/**
 * Wave 2: Convert 19 non-Filipino catalog titles to Golden Panther engines.
 * Functions now; art polish later (temporary coral/gp symbol packs).
 *
 *   node scripts/clone-panther-wave2.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const PARENT = {
  id: "golden-panther",
  name: "Golden Panther",
  pascal: "GoldenPanther",
  const: "GOLDEN_PANTHER",
  camel: "goldenPanther",
  audio: "pantherAudio",
  peak: "Panther Peak",
};

/** Existing catalog IDs — keep thumbs; replace engines with panther family. */
const CLONES = [
  {
    id: "lucky-neko",
    name: "Lucky Neko",
    pascal: "LuckyNeko",
    const: "LUCKY_NEKO",
    camel: "luckyNeko",
    accent: "#F472B6",
    blurb: "Cluster tumbles, bomb multipliers, and an adjustable Buy Bonus in a lucky cat temple.",
  },
  {
    id: "fortune-tiger",
    name: "Fortune Tiger",
    pascal: "FortuneTiger",
    const: "FORTUNE_TIGER",
    camel: "fortuneTiger",
    accent: "#F97316",
    blurb: "Chase tiger fortune with cascading clusters, bomb multipliers, and Buy Bonus.",
  },
  {
    id: "fortune-ox",
    name: "Fortune Ox",
    pascal: "FortuneOx",
    const: "FORTUNE_OX",
    camel: "fortuneOx",
    accent: "#EAB308",
    blurb: "Ox-powered cascading wins, bomb multipliers, and an adjustable Buy Bonus.",
  },
  {
    id: "fortune-rabbit",
    name: "Fortune Rabbit",
    pascal: "FortuneRabbit",
    const: "FORTUNE_RABBIT",
    camel: "fortuneRabbit",
    accent: "#A78BFA",
    blurb: "Hop into cluster tumbles, bomb multipliers, and Buy Bonus.",
  },
  {
    id: "fortune-mouse",
    name: "Fortune Mouse",
    pascal: "FortuneMouse",
    const: "FORTUNE_MOUSE",
    camel: "fortuneMouse",
    accent: "#94A3B8",
    blurb: "Scurry for cascading clusters, bomb multipliers, and Buy Bonus.",
  },
  {
    id: "prosperity-lion",
    name: "Prosperity Lion",
    pascal: "ProsperityLion",
    const: "PROSPERITY_LION",
    camel: "prosperityLion",
    accent: "#F59E0B",
    blurb: "Roar through cluster wins, bomb multipliers, and an adjustable Buy Bonus.",
  },
  {
    id: "buffalo-reign",
    name: "Buffalo Reign",
    pascal: "BuffaloReign",
    const: "BUFFALO_REIGN",
    camel: "buffaloReign",
    accent: "#D97706",
    blurb: "Stampede cascading clusters, bomb multipliers, and Buy Bonus.",
  },
  {
    id: "safari-gold",
    name: "Safari Gold",
    pascal: "SafariGold",
    const: "SAFARI_GOLD",
    camel: "safariGold",
    accent: "#CA8A04",
    blurb: "Safari cluster tumbles, bomb multipliers, and an adjustable Buy Bonus.",
  },
  {
    id: "cleopatra-gold",
    name: "Cleopatra Gold",
    pascal: "CleopatraGold",
    const: "CLEOPATRA_GOLD",
    camel: "cleopatraGold",
    accent: "#EAB308",
    blurb: "Nile temple clusters, bomb multipliers, and Buy Bonus.",
  },
  {
    id: "maya-gold",
    name: "Maya Gold",
    pascal: "MayaGold",
    const: "MAYA_GOLD",
    camel: "mayaGold",
    accent: "#F59E0B",
    blurb: "Jungle temple cascading wins, bombs, and Buy Bonus.",
  },
  {
    id: "temple-rush",
    name: "Temple Rush",
    pascal: "TempleRush",
    const: "TEMPLE_RUSH",
    camel: "templeRush",
    accent: "#FB923C",
    blurb: "Rush ancient temples for cluster tumbles and Buy Bonus.",
  },
  {
    id: "pharaoh-fire",
    name: "Pharaoh Fire",
    pascal: "PharaohFire",
    const: "PHARAOH_FIRE",
    camel: "pharaohFire",
    accent: "#EF4444",
    blurb: "Desert fire clusters, bomb multipliers, and Buy Bonus.",
  },
  {
    id: "desert-riches",
    name: "Desert Riches",
    pascal: "DesertRiches",
    const: "DESERT_RICHES",
    camel: "desertRiches",
    accent: "#F59E0B",
    blurb: "Dune cascading wins, bombs, and an adjustable Buy Bonus.",
  },
  {
    id: "gate-of-ra",
    name: "Gate of Ra",
    pascal: "GateOfRa",
    const: "GATE_OF_RA",
    camel: "gateOfRa",
    accent: "#FBBF24",
    blurb: "Solar gate clusters, bomb multipliers, and Buy Bonus.",
  },
  {
    id: "zeus-strike",
    name: "Zeus Strike",
    pascal: "ZeusStrike",
    const: "ZEUS_STRIKE",
    camel: "zeusStrike",
    accent: "#38BDF8",
    blurb: "Olympian cascading clusters, thunder bombs, and Buy Bonus.",
  },
  {
    id: "thor-thunder",
    name: "Thor Thunder",
    pascal: "ThorThunder",
    const: "THOR_THUNDER",
    camel: "thorThunder",
    accent: "#60A5FA",
    blurb: "Norse storm clusters, bomb multipliers, and Buy Bonus.",
  },
  {
    id: "godly-gates",
    name: "Godly Gates",
    pascal: "GodlyGates",
    const: "GODLY_GATES",
    camel: "godlyGates",
    accent: "#818CF8",
    blurb: "Divine cascading wins, bombs, and an adjustable Buy Bonus.",
  },
  {
    id: "olympus-wrath",
    name: "Olympus Wrath",
    pascal: "OlympusWrath",
    const: "OLYMPUS_WRATH",
    camel: "olympusWrath",
    accent: "#A78BFA",
    blurb: "Wrathful cluster tumbles, bomb multipliers, and Buy Bonus.",
  },
  {
    id: "enchanted-grove",
    name: "Enchanted Grove",
    pascal: "EnchantedGrove",
    const: "ENCHANTED_GROVE",
    camel: "enchantedGrove",
    accent: "#34D399",
    blurb: "Forest magic clusters, bomb multipliers, and Buy Bonus.",
  },
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function rewrite(text, g) {
  const pairs = [
    [PARENT.const, g.const],
    [PARENT.pascal, g.pascal],
    [PARENT.camel, g.camel],
    [PARENT.audio, `${g.camel}Audio`],
    [PARENT.peak, g.name],
    [PARENT.name, g.name],
    [PARENT.id, g.id],
  ];
  let out = text;
  for (const [from, to] of pairs) out = out.split(from).join(to);
  return out;
}

function copyTextTree(srcDir, destDir, g, renameFile) {
  ensureDir(destDir);
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, ent.name);
    const name = renameFile ? renameFile(ent.name) : ent.name;
    const dest = path.join(destDir, name);
    if (ent.isDirectory()) {
      copyTextTree(src, dest, g, renameFile);
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

function cloneFiles(g) {
  console.log(`\n=== files ${g.id} ===`);

  const cfgDest = path.join(ROOT, "src/lib", `${g.id}-config.ts`);
  fs.writeFileSync(
    cfgDest,
    rewrite(fs.readFileSync(path.join(ROOT, "src/lib/golden-panther-config.ts"), "utf8"), g),
    "utf8",
  );

  const uiDest = path.join(ROOT, "src/components/maxhigh", g.id);
  if (fs.existsSync(uiDest)) fs.rmSync(uiDest, { recursive: true, force: true });
  copyTextTree(path.join(ROOT, "src/components/maxhigh/golden-panther"), uiDest, g, (name) =>
    name.split(PARENT.pascal).join(g.pascal).split(PARENT.id).join(g.id),
  );

  // Theme: themedIconPack + palette import (polish colors later)
  const themePath = path.join(uiDest, "theme.ts");
  fs.writeFileSync(
    themePath,
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
    icons: themedIconPack("${g.id}", "1"),
  },
  colors: ${g.const}_COLORS,
};
`,
    "utf8",
  );

  fs.writeFileSync(
    path.join(ROOT, "src/components/maxhigh", `${g.pascal}Slot.tsx`),
    rewrite(
      fs.readFileSync(path.join(ROOT, "src/components/maxhigh/GoldenPantherSlot.tsx"), "utf8"),
      g,
    ),
    "utf8",
  );

  fs.writeFileSync(
    path.join(ROOT, "src/server/games", `${g.id}.server.ts`),
    rewrite(
      fs.readFileSync(path.join(ROOT, "src/server/games/golden-panther.server.ts"), "utf8"),
      g,
    ),
    "utf8",
  );

  fs.writeFileSync(
    path.join(ROOT, "src/components/superadmin/games", `${g.pascal}ConfigModal.tsx`),
    rewrite(
      fs.readFileSync(
        path.join(ROOT, "src/components/superadmin/games/GoldenPantherConfigModal.tsx"),
        "utf8",
      ),
      g,
    ),
    "utf8",
  );

  // Temporary symbols from coral-cobra (right filenames for themedIconPack)
  const symSrc = path.join(ROOT, "public/images/symbols/coral-cobra");
  const symDest = path.join(ROOT, "public/images/symbols", g.id);
  ensureDir(symDest);
  for (const f of fs.readdirSync(symSrc)) {
    if (f === "_backup") continue;
    const s = path.join(symSrc, f);
    if (fs.statSync(s).isFile()) fs.copyFileSync(s, path.join(symDest, f));
  }

  console.log("  config, UI, Slot, server, SA modal, symbols");
}

function upsertPantherApi(g) {
  const file = path.join(ROOT, "src/functions/api.ts");
  let text = fs.readFileSync(file, "utf8");

  // Strip prior spin/free/buy/session/engine-config exports for this camel/pascal
  const stripPatterns = [
    new RegExp(
      `\\nconst ${g.camel}SpinSchema = z\\.object\\([\\s\\S]*?\\nexport const ${g.camel}SpinFn = createServerFn\\([\\s\\S]*?\\n\\}\\);`,
      "g",
    ),
    new RegExp(
      `\\nconst ${g.camel}FreeSpinSchema = z\\.object\\([\\s\\S]*?\\nexport const ${g.camel}FreeSpinFn = createServerFn\\([\\s\\S]*?\\n\\}\\);`,
      "g",
    ),
    new RegExp(
      `\\nconst ${g.camel}BuySchema = z\\.object\\([\\s\\S]*?\\nexport const ${g.camel}BuyFeatureFn = createServerFn\\([\\s\\S]*?\\n\\}\\);`,
      "g",
    ),
    new RegExp(
      `\\nexport const ${g.camel}BuyFeatureFn = createServerFn\\([\\s\\S]*?\\n\\}\\);`,
      "g",
    ),
    new RegExp(
      `\\nexport const get${g.pascal}SessionFn = createServerFn\\([\\s\\S]*?\\n\\}\\);`,
      "g",
    ),
    new RegExp(
      `\\nexport const get${g.pascal}EngineConfigFn = createServerFn\\([\\s\\S]*?\\n\\}\\);`,
      "g",
    ),
    new RegExp(
      `\\nexport const get${g.pascal}EngineConfigPublicFn = createServerFn\\([\\s\\S]*?\\n\\}\\);`,
      "g",
    ),
  ];
  for (const re of stripPatterns) text = text.replace(re, "");

  if (text.includes(`${g.camel}SpinFn`)) {
    console.warn(`  WARN: leftover ${g.camel}SpinFn after strip — manual check`);
  }

  const block = `
const ${g.camel}SpinSchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  ante: z.boolean(),
});

export const ${g.camel}SpinFn = createServerFn({ method: "POST" })
  .validator(${g.camel}SpinSchema)
  .handler(async ({ data }) => {
    const { ${g.camel}PaidSpin } = await import("../server/games/${g.id}.server");
    return ${g.camel}PaidSpin(data);
  });

const ${g.camel}FreeSpinSchema = z.object({
  sessionId: z.string().uuid(),
});

export const ${g.camel}FreeSpinFn = createServerFn({ method: "POST" })
  .validator(${g.camel}FreeSpinSchema)
  .handler(async ({ data }) => {
    const { ${g.camel}FreeSpin } = await import("../server/games/${g.id}.server");
    return ${g.camel}FreeSpin(data);
  });

const ${g.camel}BuySchema = z.object({
  bet: z.number().finite().positive().max(100_000),
  mode: z.enum(["normal", "super"]),
  quantity: z.number().int().min(1).max(50),
});

export const ${g.camel}BuyFeatureFn = createServerFn({ method: "POST" })
  .validator(${g.camel}BuySchema)
  .handler(async ({ data }) => {
    const { ${g.camel}BuyFeature } = await import("../server/games/${g.id}.server");
    return ${g.camel}BuyFeature(data);
  });

export const get${g.pascal}SessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { get${g.pascal}OpenSession } = await import("../server/games/${g.id}.server");
  return get${g.pascal}OpenSession();
});
`;

  const anchor = `export const getGoldenPantherSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGoldenPantherOpenSession } = await import("../server/games/golden-panther.server");
  return getGoldenPantherOpenSession();
});
`;
  if (!text.includes(anchor)) throw new Error("GP session anchor missing in api.ts");
  if (!text.includes(`${g.camel}SpinFn`)) {
    text = text.replace(anchor, `${anchor}${block}`);
  }
  fs.writeFileSync(file, text, "utf8");
}

function upsertSaFns(g) {
  const file = path.join(ROOT, "src/functions/superadmin.ts");
  let text = fs.readFileSync(file, "utf8");
  // strip old get/save if present
  text = text.replace(
    new RegExp(
      `\\nexport const get${g.pascal}EngineConfigFn = createServerFn\\([\\s\\S]*?\\n\\}\\);\\n\\nexport const save${g.pascal}EngineConfigFn = createServerFn\\([\\s\\S]*?\\n\\}\\);`,
      "g",
    ),
    "",
  );
  text = text.replace(
    new RegExp(
      `\\nexport const get${g.pascal}EngineConfigFn = createServerFn\\([\\s\\S]*?\\n\\}\\);`,
      "g",
    ),
    "",
  );
  text = text.replace(
    new RegExp(
      `\\nexport const save${g.pascal}EngineConfigFn = createServerFn\\([\\s\\S]*?\\n\\}\\);`,
      "g",
    ),
    "",
  );

  const block = `
export const get${g.pascal}EngineConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  const { get${g.pascal}EngineConfig } = await import("../server/superadmin/services.server");
  return get${g.pascal}EngineConfig();
});

export const save${g.pascal}EngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { save${g.pascal}EngineConfig } = await import("../server/superadmin/services.server");
    return save${g.pascal}EngineConfig(data.config);
  });
`;

  const anchor = `export const saveGoldenPantherEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGoldenPantherEngineConfig } = await import("../server/superadmin/services.server");
    return saveGoldenPantherEngineConfig(data.config);
  });
`;
  if (!text.includes(`get${g.pascal}EngineConfigFn`)) {
    if (!text.includes(anchor)) throw new Error("GP save config anchor missing");
    text = text.replace(anchor, `${anchor}${block}`);
  }
  fs.writeFileSync(file, text, "utf8");
}

function appendServices(g) {
  const file = path.join(ROOT, "src/server/superadmin/services.server.ts");
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(`export async function get${g.pascal}EngineConfig`)) return;
  const block = `
export async function get${g.pascal}EngineConfig() {
  const {
    ${g.const}_GAME_ID,
    DEFAULT_${g.const}_CONFIG,
    normalize${g.pascal}Config,
  } = await import("@/lib/${g.id}-config");
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, ${g.const}_GAME_ID))
      .limit(1);
    return normalize${g.pascal}Config(parseEngineConfigJson(rows[0]?.engineConfig));
  } catch {
    return structuredClone(DEFAULT_${g.const}_CONFIG);
  }
}

export async function save${g.pascal}EngineConfig(raw: unknown) {
  const actor = await requireSuperadmin();
  const {
    ${g.const}_GAME_ID,
    normalize${g.pascal}Config,
  } = await import("@/lib/${g.id}-config");
  const catalog = slotGames.find((row) => row.id === ${g.const}_GAME_ID);
  if (!catalog) throw new Error("${g.name} not in catalog");

  const cfg = normalize${g.pascal}Config(raw);
  const db = getDb();
  const existing = await db
    .select()
    .from(gameControls)
    .where(eq(gameControls.gameId, ${g.const}_GAME_ID))
    .limit(1);

  const payload = JSON.stringify(cfg);

  if (!existing[0]) {
    await db.insert(gameControls).values({
      gameId: ${g.const}_GAME_ID,
      enabled: "yes",
      featured: "no",
      sortOrder: 0,
      tag: catalog.tag ?? null,
      rtp: catalog.rtp,
      volatility: catalog.volatility,
      minBet: catalog.minBet,
      maxBet: catalog.maxBet,
      engineConfig: payload,
    });
  } else {
    await db
      .update(gameControls)
      .set({ engineConfig: payload })
      .where(eq(gameControls.gameId, ${g.const}_GAME_ID));
  }

  await writeAuditLog({
    actor,
    action: "super.${g.id.replaceAll("-", "_")}_config",
    summary: \`Updated ${g.name} engine config (dead spin \${cfg.deadSpinChancePercent}%, FS \${cfg.freeSpinsBase})\`,
    targetType: "game",
    targetId: ${g.const}_GAME_ID,
    meta: {
      deadSpinChancePercent: cfg.deadSpinChancePercent,
      bombChanceBasePercent: cfg.bombChanceBasePercent,
      freeSpinsTriggerCount: cfg.freeSpinsTriggerCount,
      freeSpinsBase: cfg.freeSpinsBase,
    },
  });

  return cfg;
}
`;
  fs.writeFileSync(file, text + block, "utf8");
}

function wireRegistry(g) {
  const file = path.join(ROOT, "src/components/maxhigh/gamePlayRegistry.ts");
  let text = fs.readFileSync(file, "utf8");
  const line = `  "${g.id}": lazyNamed(() => import("./${g.pascal}Slot"), "${g.pascal}Slot"),\n`;
  const re = new RegExp(`  "${g.id}": lazyNamed\\([\\s\\S]*?\\),\\n`);
  if (re.test(text)) {
    text = text.replace(re, line);
  } else {
    text = text.replace(
      `  "wild-panther": lazyNamed(() => import("./WildPantherSlot"), "WildPantherSlot"),\n`,
      `  "wild-panther": lazyNamed(() => import("./WildPantherSlot"), "WildPantherSlot"),\n${line}`,
    );
  }
  fs.writeFileSync(file, text, "utf8");
}

function wireSaRoute(g) {
  const file = path.join(ROOT, "src/routes/superadmin/games.tsx");
  let text = fs.readFileSync(file, "utf8");

  if (!text.includes(`${g.const}_GAME_ID`)) {
    text = text.replace(
      `import { WILD_PANTHER_GAME_ID } from "@/lib/wild-panther-config";\n`,
      `import { WILD_PANTHER_GAME_ID } from "@/lib/wild-panther-config";\nimport { ${g.const}_GAME_ID } from "@/lib/${g.id}-config";\n`,
    );
  }
  if (!text.includes(`${g.pascal}ConfigModal`)) {
    text = text.replace(
      `import { WildPantherConfigModal } from "@/components/superadmin/games/WildPantherConfigModal";\n`,
      `import { WildPantherConfigModal } from "@/components/superadmin/games/WildPantherConfigModal";\nimport { ${g.pascal}ConfigModal } from "@/components/superadmin/games/${g.pascal}ConfigModal";\n`,
    );
  }
  if (!text.includes(`"${g.id}"`) || !text.includes(`${g.const}_GAME_ID,\n`)) {
    // add to engine id set near wild-panther
    if (!text.includes(`${g.const}_GAME_ID,`)) {
      text = text.replace(
        `    WILD_PANTHER_GAME_ID,\n    "wild-panther",\n  ]);`,
        `    WILD_PANTHER_GAME_ID,\n    "wild-panther",\n    ${g.const}_GAME_ID,\n    "${g.id}",\n  ]);`,
      );
    }
  }
  if (!text.includes(`is${g.pascal}`)) {
    text = text.replace(
      `  const isWildPanther =\n    selectedId === WILD_PANTHER_GAME_ID || selectedId === "wild-panther";\n`,
      `  const isWildPanther =\n    selectedId === WILD_PANTHER_GAME_ID || selectedId === "wild-panther";\n  const is${g.pascal} =\n    selectedId === ${g.const}_GAME_ID || selectedId === "${g.id}";\n`,
    );
  }
  if (!text.includes(`<${g.pascal}ConfigModal`)) {
    text = text.replace(
      `      ) : selected && !hasFullEngine ? (`,
      `      ) : selected && is${g.pascal} ? (
        <${g.pascal}ConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && !hasFullEngine ? (`,
    );
  }
  fs.writeFileSync(file, text, "utf8");
}

function appendPalette(g) {
  const file = path.join(ROOT, "src/components/maxhigh/panther-shared/palettes.ts");
  let text = fs.readFileSync(file, "utf8");
  if (text.includes(`export const ${g.const}_COLORS`)) return;
  // Derive soft/deep from accent hex roughly — use accent for key slots
  const accent = g.accent;
  text += `
export const ${g.const}_COLORS = buildThemeColors({
  accent: "${accent}",
  accentSoft: "${accent}",
  accentDeep: "#111827",
  rim: "${accent}88",
  spinFrom: "${accent}",
  spinMid: "${accent}",
  spinTo: "#111827",
  spinShadow: "${accent}88",
  hudBorder: "${accent}66",
  hudLabel: "${accent}bb",
  hudValue: "#F8FAFC",
  winBorder: "${accent}88",
  winFrom: "${accent}ee",
  winTo: "rgba(0,0,0,0.85)",
  winLabel: "#F8FAFC",
  winValue: "${accent}",
  tumbleFrom: "${accent}",
  tumbleTo: "#111827",
  tumbleBorder: "${accent}",
  tumbleText: "#F8FAFC",
  modalFrom: "#F8FAFC",
  modalMid: "${accent}",
  modalTo: "#111827",
  modalBorder: "${accent}73",
  modalTitle: "${accent}",
  menuFrom: "${accent}",
  menuTo: "#111827",
  menuAccent: "#F8FAFC",
  winRing: "${accent}59",
  bombBadgeBorder: "${accent}",
  bombBadgeFrom: "${accent}",
  bombBadgeTo: "#020617",
  bombBadgeText: "#F8FAFC",
  scatterBadgeFrom: "${accent}",
  scatterBadgeTo: "${accent}",
  payoutPillFrom: "#F8FAFC",
  payoutPillTo: "${accent}",
  payoutPillText: "#111827",
  muteBorder: "${accent}66",
  muteText: "#F8FAFC",
});
`;
  fs.writeFileSync(file, text, "utf8");
}

function wireBoot(g) {
  const file = path.join(ROOT, "src/components/maxhigh/GamePlayModal.tsx");
  let text = fs.readFileSync(file, "utf8");
  if (text.includes(`"${g.id}": pantherBoot(`)) return;
  const entry = `  "${g.id}": pantherBoot(
    "${g.id}",
    "${g.name}",
    "${g.name.toUpperCase()} ARCADE",
    "POWER ACTIVE",
    "${g.accent}",
    "from-[#111827]/80 via-[#0A0912]/80 to-[#020617]/95",
    "from-[${g.accent}] via-[${g.accent}] to-[#111827]",
    "shadow-[0_0_60px_rgba(0,0,0,0.6)] border-white/30",
    "from-[${g.accent}] via-[${g.accent}] to-[#111827]",
  ),
`;
  text = text.replace(
    `  "ruby-raven": pantherBoot(
    "ruby-raven",
    "Ruby Raven",
    "RUBY RAVEN ARCADE",
    "RAVEN POWER ACTIVE",
    "#F43F5E",
    "from-[#881337]/80 via-[#0A0912]/80 to-[#4C0519]/95",
    "from-[#FB7185] via-[#F43F5E] to-[#E11D48]",
    "shadow-[0_0_60px_rgba(244,63,94,0.8)] border-rose-400",
    "from-[#F43F5E] via-[#E11D48] to-[#881337]",
  ),
};`,
    `  "ruby-raven": pantherBoot(
    "ruby-raven",
    "Ruby Raven",
    "RUBY RAVEN ARCADE",
    "RAVEN POWER ACTIVE",
    "#F43F5E",
    "from-[#881337]/80 via-[#0A0912]/80 to-[#4C0519]/95",
    "from-[#FB7185] via-[#F43F5E] to-[#E11D48]",
    "shadow-[0_0_60px_rgba(244,63,94,0.8)] border-rose-400",
    "from-[#F43F5E] via-[#E11D48] to-[#881337]",
  ),
${entry}};`,
  );
  fs.writeFileSync(file, text, "utf8");
}

function updateLobby() {
  const file = path.join(ROOT, "src/lib/playable-games.ts");
  const ids = [
    "golden-panther",
    "wild-panther",
    "jade-jaguar",
    "ember-tiger",
    "lotus-lynx",
    "coral-cobra",
    "frost-fox",
    "solar-serpent",
    "honey-hive",
    "midnight-owl",
    "ruby-raven",
    ...CLONES.map((c) => c.id),
  ];
  const lobby = `/**
 * Soft-launch lobby: Golden Panther family (30 titles).
 * Art polish continues; engines are live.
 */
export const LOBBY_VISIBLE_GAME_IDS = [
${ids.map((id) => `  "${id}",`).join("\n")}
] as const;
`;
  let text = fs.readFileSync(file, "utf8");
  text = text.replace(
    /export const LOBBY_VISIBLE_GAME_IDS = \[[\s\S]*?\] as const;/,
    lobby.replace(/;\s*$/, "") + " as const;",
  );
  // Remove wave2 ids from thumbnail-only
  for (const g of CLONES) {
    text = text.replace(new RegExp(`\\n\\s*"${g.id}",`, "g"), "");
  }
  fs.writeFileSync(file, text, "utf8");
}

for (const g of CLONES) {
  cloneFiles(g);
  appendPalette(g);
  upsertPantherApi(g);
  upsertSaFns(g);
  appendServices(g);
  wireRegistry(g);
  wireSaRoute(g);
  wireBoot(g);
  console.log(`  wired ${g.id}`);
}

updateLobby();
console.log(`\nDone. ${CLONES.length} titles converted to panther engines.`);
console.log(`Lobby total ≈ ${11 + CLONES.length} panther-family games.`);
