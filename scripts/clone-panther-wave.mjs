/**
 * Clone current Golden Panther (42.5× Buy Bonus, +1 bet, quantity)
 * into themed skins and wire catalog / API / superadmin.
 *
 *   node scripts/clone-panther-wave.mjs
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

const CLONES = [
  {
    id: "jade-jaguar",
    name: "Jade Jaguar",
    pascal: "JadeJaguar",
    const: "JADE_JAGUAR",
    camel: "jadeJaguar",
    blurb:
      "Prowl a jade temple for cascading cluster wins, bomb multipliers, and an adjustable Buy Bonus.",
  },
  {
    id: "ember-tiger",
    name: "Ember Tiger",
    pascal: "EmberTiger",
    const: "EMBER_TIGER",
    camel: "emberTiger",
    blurb:
      "Hunt volcanic gold with cascading wins, fire bombs, and an adjustable Buy Bonus.",
  },
  {
    id: "lotus-lynx",
    name: "Lotus Lynx",
    pascal: "LotusLynx",
    const: "LOTUS_LYNX",
    camel: "lotusLynx",
    blurb:
      "Stalk the night garden for cluster tumbles, lotus bombs, and an adjustable Buy Bonus.",
  },
  {
    id: "coral-cobra",
    name: "Coral Cobra",
    pascal: "CoralCobra",
    const: "CORAL_COBRA",
    camel: "coralCobra",
    blurb:
      "Dive the reef for cascading clusters, pearl bombs, and an adjustable Buy Bonus.",
  },
  {
    id: "frost-fox",
    name: "Frost Fox",
    pascal: "FrostFox",
    const: "FROST_FOX",
    camel: "frostFox",
    blurb:
      "Race the tundra for ice-cluster wins, frost bombs, and an adjustable Buy Bonus.",
  },
  {
    id: "solar-serpent",
    name: "Solar Serpent",
    pascal: "SolarSerpent",
    const: "SOLAR_SERPENT",
    camel: "solarSerpent",
    blurb:
      "Chase the desert sun for cascading wins, solar bombs, and an adjustable Buy Bonus.",
  },
  {
    id: "honey-hive",
    name: "Honey Hive",
    pascal: "HoneyHive",
    const: "HONEY_HIVE",
    camel: "honeyHive",
    blurb:
      "Raid the hive for sweet cluster tumbles, honeycomb bombs, and an adjustable Buy Bonus.",
  },
  {
    id: "midnight-owl",
    name: "Midnight Owl",
    pascal: "MidnightOwl",
    const: "MIDNIGHT_OWL",
    camel: "midnightOwl",
    blurb:
      "Hunt after dark for cascading clusters, moon bombs, and an adjustable Buy Bonus.",
  },
  {
    id: "ruby-raven",
    name: "Ruby Raven",
    pascal: "RubyRaven",
    const: "RUBY_RAVEN",
    camel: "rubyRaven",
    blurb:
      "Loot gothic vaults for cluster wins, ruby bombs, and an adjustable Buy Bonus.",
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

function insertOnce(file, needle, insertion) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(needle)) return false;
  const norm = text.replaceAll("\r\n", "\n");
  const anchor = insertion.anchor.replaceAll("\r\n", "\n");
  if (!norm.includes(anchor)) {
    throw new Error(`anchor not found in ${file}: ${anchor.slice(0, 80)}`);
  }
  const nextNorm = insertion.after
    ? norm.replace(anchor, `${anchor}${insertion.block}`)
    : norm.replace(anchor, `${insertion.block}${anchor}`);
  fs.writeFileSync(file, nextNorm, "utf8");
  return true;
}

function cloneFiles(g) {
  console.log(`\n=== files ${g.id} ===`);

  const cfgSrc = path.join(ROOT, "src/lib/golden-panther-config.ts");
  const cfgDest = path.join(ROOT, "src/lib", `${g.id}-config.ts`);
  fs.writeFileSync(cfgDest, rewrite(fs.readFileSync(cfgSrc, "utf8"), g), "utf8");

  const uiSrc = path.join(ROOT, "src/components/maxhigh/golden-panther");
  const uiDest = path.join(ROOT, "src/components/maxhigh", g.id);
  if (fs.existsSync(uiDest)) fs.rmSync(uiDest, { recursive: true, force: true });
  copyTextTree(uiSrc, uiDest, g, (name) =>
    name.split(PARENT.pascal).join(g.pascal).split(PARENT.id).join(g.id),
  );

  const slotSrc = path.join(ROOT, "src/components/maxhigh/GoldenPantherSlot.tsx");
  const slotDest = path.join(ROOT, "src/components/maxhigh", `${g.pascal}Slot.tsx`);
  fs.writeFileSync(slotDest, rewrite(fs.readFileSync(slotSrc, "utf8"), g), "utf8");

  const srvSrc = path.join(ROOT, "src/server/games/golden-panther.server.ts");
  const srvDest = path.join(ROOT, "src/server/games", `${g.id}.server.ts`);
  fs.writeFileSync(srvDest, rewrite(fs.readFileSync(srvSrc, "utf8"), g), "utf8");

  const modalSrc = path.join(ROOT, "src/components/superadmin/games/GoldenPantherConfigModal.tsx");
  const modalDest = path.join(ROOT, "src/components/superadmin/games", `${g.pascal}ConfigModal.tsx`);
  fs.writeFileSync(modalDest, rewrite(fs.readFileSync(modalSrc, "utf8"), g), "utf8");

  console.log("  config, folder, Slot, server, SA modal");
}

function wireOne(g) {
  const gamesTs = path.join(ROOT, "src/lib/games.ts");
  insertOnce(gamesTs, `id: "${g.id}"`, {
    after: false,
    anchor: `\n];\n\nexport function gamesByCategory`,
    block: `
  {
    ...defaults,
    id: "${g.id}",
    name: "${g.name}",
    thumb: "/images/thumbnails/panther_thumb.png",
    category: "slot",
    tag: "New",
    description: "${g.blurb}",
    rating: 4.9,
    reviews: 420,
    rtp: "96.5%",
    volatility: "High",
    maxWin: "10,000x",
    minBet: "₱0.20",
    maxBet: "₱200",
    features: ["Cascading Wins", "Free Spins", "Buy Bonus", "Adjustable Qty", "Multipliers"],
  },
`,
  });

  const registry = path.join(ROOT, "src/components/maxhigh/gamePlayRegistry.ts");
  insertOnce(registry, `"${g.id}"`, {
    after: true,
    anchor: `  "wild-panther": lazyNamed(() => import("./WildPantherSlot"), "WildPantherSlot"),
`,
    block: `  "${g.id}": lazyNamed(() => import("./${g.pascal}Slot"), "${g.pascal}Slot"),
`,
  });

  const api = path.join(ROOT, "src/functions/api.ts");
  insertOnce(api, `${g.camel}SpinFn`, {
    after: true,
    anchor: `export const getGoldenPantherSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getGoldenPantherOpenSession } = await import("../server/games/golden-panther.server");
  return getGoldenPantherOpenSession();
});
`,
    block: `
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
`,
  });

  const saFn = path.join(ROOT, "src/functions/superadmin.ts");
  insertOnce(saFn, `get${g.pascal}EngineConfigFn`, {
    after: true,
    anchor: `export const saveGoldenPantherEngineConfigFn = createServerFn({ method: "POST" })
  .validator(z.object({ config: z.unknown() }))
  .handler(async ({ data }) => {
    const { saveGoldenPantherEngineConfig } = await import("../server/superadmin/services.server");
    return saveGoldenPantherEngineConfig(data.config);
  });
`,
    block: `
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
`,
  });

  const saRoute = path.join(ROOT, "src/routes/superadmin/games.tsx");
  insertOnce(saRoute, `${g.const}_GAME_ID`, {
    after: true,
    anchor: `import { WILD_PANTHER_GAME_ID } from "@/lib/wild-panther-config";
`,
    block: `import { ${g.const}_GAME_ID } from "@/lib/${g.id}-config";
`,
  });
  insertOnce(saRoute, `${g.pascal}ConfigModal`, {
    after: true,
    anchor: `import { WildPantherConfigModal } from "@/components/superadmin/games/WildPantherConfigModal";
`,
    block: `import { ${g.pascal}ConfigModal } from "@/components/superadmin/games/${g.pascal}ConfigModal";
`,
  });
  insertOnce(saRoute, `"${g.id}"`, {
    after: false,
    anchor: `    WILD_PANTHER_GAME_ID,
    "wild-panther",
  ]);`,
    block: `    ${g.const}_GAME_ID,
    "${g.id}",
`,
  });
  insertOnce(saRoute, `is${g.pascal}`, {
    after: true,
    anchor: `  const isWildPanther =
    selectedId === WILD_PANTHER_GAME_ID || selectedId === "wild-panther";
`,
    block: `  const is${g.pascal} =
    selectedId === ${g.const}_GAME_ID || selectedId === "${g.id}";
`,
  });
  insertOnce(saRoute, `<${g.pascal}ConfigModal`, {
    after: false,
    anchor: `      ) : selected && !hasFullEngine ? (`,
    block: `      ) : selected && is${g.pascal} ? (
        <${g.pascal}ConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
`,
  });

  console.log(`  wired ${g.id}`);
}

function appendServicesIfMissing(g) {
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

for (const g of CLONES) {
  cloneFiles(g);
  wireOne(g);
  appendServicesIfMissing(g);
}

console.log("\nDone. Nine Golden Panther skins copied and wired.");
