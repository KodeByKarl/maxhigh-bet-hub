/**
 * Clone Deep Bass family fishing games (files + stub assets only).
 * Does NOT wire catalog / GamePlayModal / superadmin services.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const CLONES = [
  {
    id: "shark-hunter",
    name: "Shark Hunter",
    parent: "deep-bass",
    parentName: "Deep Bass",
    parentPascal: "DeepBass",
    parentConst: "DEEP_BASS",
    parentCamel: "deepBass",
    pascal: "SharkHunter",
    const: "SHARK_HUNTER",
    camel: "sharkHunter",
  },
  {
    id: "octopus-armada",
    name: "Octopus Armada",
    parent: "crab-cannon",
    parentName: "Crab Cannon",
    parentPascal: "CrabCannon",
    parentConst: "CRAB_CANNON",
    parentCamel: "crabCannon",
    pascal: "OctopusArmada",
    const: "OCTOPUS_ARMADA",
    camel: "octopusArmada",
  },
  {
    id: "turtle-tide",
    name: "Turtle Tide",
    parent: "dragon-fisher",
    parentName: "Dragon Fisher",
    parentPascal: "DragonFisher",
    parentConst: "DRAGON_FISHER",
    parentCamel: "dragonFisher",
    pascal: "TurtleTide",
    const: "TURTLE_TIDE",
    camel: "turtleTide",
  },
  {
    id: "whale-war",
    name: "Whale War",
    parent: "phoenix-fisher",
    parentName: "Phoenix Fisher",
    parentPascal: "PhoenixFisher",
    parentConst: "PHOENIX_FISHER",
    parentCamel: "phoenixFisher",
    pascal: "WhaleWar",
    const: "WHALE_WAR",
    camel: "whaleWar",
  },
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function rewrite(text, g) {
  // Order matters: longer / more specific first
  const pairs = [
    [`${g.parent}-boss`, `${g.id}-boss`],
    [g.parentPascal, g.pascal],
    [g.parentConst, g.const],
    [g.parentCamel, g.camel],
    [g.parentName, g.name],
    [g.parent, g.id],
  ];
  let out = text;
  for (const [from, to] of pairs) {
    out = out.split(from).join(to);
  }
  return out;
}

function copyTextTree(srcDir, destDir, g, renameFile) {
  if (!fs.existsSync(srcDir)) {
    console.warn("missing", srcDir);
    return;
  }
  ensureDir(destDir);
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, ent.name);
    let name = ent.name;
    if (renameFile) name = renameFile(name);
    const dest = path.join(destDir, name);
    if (ent.isDirectory()) {
      copyTextTree(src, dest, g, renameFile);
      continue;
    }
    const ext = path.extname(name).toLowerCase();
    if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".txt", ".md", ".svg"].includes(ext)) {
      const raw = fs.readFileSync(src, "utf8");
      fs.writeFileSync(dest, rewrite(raw, g), "utf8");
    } else {
      copyFile(src, dest);
    }
  }
}

function cloneOne(g) {
  console.log(`\n=== ${g.id} ← ${g.parent} ===`);

  // 1) lib config
  const cfgSrc = path.join(ROOT, "src/lib", `${g.parent}-config.ts`);
  const cfgDest = path.join(ROOT, "src/lib", `${g.id}-config.ts`);
  fs.writeFileSync(cfgDest, rewrite(fs.readFileSync(cfgSrc, "utf8"), g), "utf8");
  console.log("config", path.relative(ROOT, cfgDest));

  // 2) UI folder
  const uiSrc = path.join(ROOT, "src/components/maxhigh/games", g.parent);
  const uiDest = path.join(ROOT, "src/components/maxhigh/games", g.id);
  if (fs.existsSync(uiDest)) fs.rmSync(uiDest, { recursive: true, force: true });
  copyTextTree(uiSrc, uiDest, g, (name) => {
    // DeepBassGame.tsx → SharkHunterGame.tsx
    return name
      .split(g.parentPascal)
      .join(g.pascal)
      .split(g.parent)
      .join(g.id);
  });
  console.log("ui", path.relative(ROOT, uiDest));

  // 3) server
  const srvSrc = path.join(ROOT, "src/server/games", `${g.parent}.server.ts`);
  const srvDest = path.join(ROOT, "src/server/games", `${g.id}.server.ts`);
  fs.writeFileSync(srvDest, rewrite(fs.readFileSync(srvSrc, "utf8"), g), "utf8");
  console.log("server", path.relative(ROOT, srvDest));

  // 4) functions
  const fnSrc = path.join(ROOT, "src/functions", `${g.parent}.ts`);
  const fnDest = path.join(ROOT, "src/functions", `${g.id}.ts`);
  fs.writeFileSync(fnDest, rewrite(fs.readFileSync(fnSrc, "utf8"), g), "utf8");
  console.log("functions", path.relative(ROOT, fnDest));

  // 5) ConfigModal
  const modalSrc = path.join(
    ROOT,
    "src/components/superadmin/games",
    `${g.parentPascal}ConfigModal.tsx`,
  );
  const modalDest = path.join(
    ROOT,
    "src/components/superadmin/games",
    `${g.pascal}ConfigModal.tsx`,
  );
  fs.writeFileSync(modalDest, rewrite(fs.readFileSync(modalSrc, "utf8"), g), "utf8");
  console.log("modal", path.relative(ROOT, modalDest));

  // 6) thumb stub
  const thumbSrc = path.join(ROOT, "public/games", `${g.parent}.png`);
  const thumbDest = path.join(ROOT, "public/games", `${g.id}.png`);
  copyFile(thumbSrc, thumbDest);
  console.log("thumb", path.relative(ROOT, thumbDest));

  // 7) symbols
  const symSrc = path.join(ROOT, "public/images/symbols", g.parent);
  const symDest = path.join(ROOT, "public/images/symbols", g.id);
  if (fs.existsSync(symDest)) fs.rmSync(symDest, { recursive: true, force: true });
  copyTextTree(symSrc, symDest, g, (name) =>
    name.split(`${g.parent}-boss`).join(`${g.id}-boss`).split(g.parent).join(g.id),
  );
  console.log("symbols", path.relative(ROOT, symDest));

  // 8) sounds
  const sndSrc = path.join(ROOT, "public/sounds", g.parent);
  const sndDest = path.join(ROOT, "public/sounds", g.id);
  if (fs.existsSync(sndDest)) fs.rmSync(sndDest, { recursive: true, force: true });
  ensureDir(sndDest);
  for (const f of fs.readdirSync(sndSrc)) {
    copyFile(path.join(sndSrc, f), path.join(sndDest, f));
  }
  console.log("sounds", path.relative(ROOT, sndDest));
}

for (const g of CLONES) cloneOne(g);

console.log("\nDone. Not wired into catalog/GamePlayModal/superadmin services.");
