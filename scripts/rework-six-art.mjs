import fs from "node:fs";
import sharp from "sharp";
import ts from "typescript";
export const version = "20261013";
export const games = [
  [
    "ruby-raven",
    "Ruby Raven",
    "garnet red, black feathers, antique gold and gothic jewel ornament",
    "a moonlit gothic ruby sanctuary with dark stone arches, red crystalline cliffs and velvet sky",
    [
      "a faceted garnet feather pendant",
      "an ornate ruby chalice",
      "a majestic black raven with ruby eyes and a jeweled gold collar",
      "a ruby raven sigil medallion",
      "a radiant ruby orb cradled by raven wings",
    ],
    ["Ruby Feather", "Ruby Chalice", "Raven"],
  ],
  [
    "midnight-owl",
    "Midnight Owl",
    "midnight indigo, moon silver, opal and intricate celestial feather ornament",
    "an ancient moonlit woodland observatory with silver constellations, violet mist and giant tree silhouettes",
    [
      "a silver crescent moon pendant with opal stars",
      "an ornate celestial telescope in silver and indigo",
      "a majestic snowy owl with luminous blue eyes and a moon-silver crown",
      "a silver owl constellation medallion",
      "a glowing indigo moonstone embraced by silver owl wings",
    ],
    ["Moon Pendant", "Celestial Telescope", "Midnight Owl"],
  ],
  [
    "lotus-lynx",
    "Lotus Lynx",
    "rose gold, blush lotus petals, jade and elegant water-garden ornament",
    "a tranquil lotus palace garden at pink twilight with jade terraces, lily ponds and misty waterfalls",
    [
      "an open jeweled pink lotus blossom",
      "an elegant jade perfume vessel with rose-gold fittings",
      "a regal lynx portrait with tufted ears, jade eyes and a lotus collar",
      "a rose-gold lotus guardian medallion",
      "a glowing jade pearl in lotus petals",
    ],
    ["Lotus Blossom", "Jade Vessel", "Lotus Lynx"],
  ],
  [
    "honey-hive",
    "Honey Hive",
    "honey amber, golden wax, warm ivory and ornate hexagonal honeycomb motifs",
    "a fantastical honeybee woodland kingdom at warm dusk with golden hive architecture, flowers and amber lanterns",
    [
      "a glossy golden honey dipper with amber droplets",
      "a jeweled honey jar with a hexagonal gold lid",
      "a charming regal queen honeybee with amber crown and translucent wings",
      "a golden hexagonal hive blessing medallion",
      "a radiant amber honey crystal in golden bee wings",
    ],
    ["Honey Dipper", "Honey Jar", "Queen Bee"],
  ],
  [
    "frost-fox",
    "Frost Fox",
    "ice silver, glacier cyan, sapphire and intricate snowflake ornament",
    "an arctic crystal sanctuary beneath a subtle aurora with snowy pine trees, frozen waterfalls and blue ice arches",
    [
      "an ornate faceted ice snowflake pendant",
      "a frost crystal chalice with sapphire jewels",
      "a majestic white arctic fox with blue eyes and silver ice crown",
      "a silver fox snowflake medallion",
      "a glowing sapphire frost orb encircled by crystalline fox tails",
    ],
    ["Ice Snowflake", "Frost Chalice", "Arctic Fox"],
  ],
  [
    "coral-cobra",
    "Coral Cobra",
    "coral orange, turquoise sea glass, pearl and ornate reef-gold ornament",
    "a submerged coral temple with turquoise water, coral columns, distant reef formations and soft filtered rays",
    [
      "a luminous pearl inside an ornate coral shell",
      "a golden sea-glass trident with turquoise gems",
      "a magnificent sea-themed cobra with coral hood patterns, turquoise eyes and pearl collar",
      "a golden coral cobra reef medallion",
      "a glowing turquoise sea pearl embraced by golden coral branches",
    ],
    ["Coral Pearl", "Sea Trident", "Coral Cobra"],
  ],
];
export const jobs = games.flatMap(([game, name, style, scene, subjects]) => [
  ...[
    ...["10", "J", "Q", "K", "A"].map((k, i) => [
      k,
      `the single ${k === "10" ? "numeral" : "letter"} ${k}, sculpted ${["jade", "sapphire", "amethyst", "ruby", "amber"][i]} gemstone face with themed metal edging`,
    ]),
    ...["premium-a", "premium-b", "premium-c", "scatter", "wild"].map((k, i) => [k, subjects[i]]),
  ].map(([asset, subject]) => ({
    game,
    asset,
    transparent: true,
    prompt: `Use case: stylized-concept. One standalone premium ${name} casino reel symbol: ${subject}. Art direction: ${style}. Exquisite detailed 3D fantasy gemstone and metal artwork, bold readable silhouette, square canvas. Complete object centered with generous transparent margins. Genuine transparent background. No card tile, backdrop, floor, extra objects, watermark or text except the requested numeral or letter. Never crop any part. One symbol only.`,
  })),
  {
    game,
    asset: "backdrop",
    transparent: false,
    prompt: `Use case: stylized-concept. Premium cinematic ${name} slot-game environment, 16:9 landscape. ${scene}. Art direction: ${style}. Rich architecture and themed details concentrated at far outer edges. Central 60 percent a calm dark atmospheric field for the reel grid; top and bottom center quiet for controls. Safe to center crop on portrait mobile. Full bleed, sophisticated depth and materials. No portraits, text, UI, reels, cards, logos or watermark.`,
  },
]);
export const dest = (j) =>
  `public/images/symbols/${j.game}/${j.asset}-v${version}.${j.transparent ? "png" : "webp"}`;
const [cmd, id, source] = process.argv.slice(2);
if (cmd === "jobs") console.log(JSON.stringify(jobs.filter((j) => !fs.existsSync(dest(j)))));
if (cmd === "install") {
  const j = jobs.find((j) => `${j.game}/${j.asset}` === id);
  if (!j) throw Error(id);
  if (j.transparent)
    await sharp(source)
      .trim()
      .resize(300, 300, { fit: "contain", background: "#00000000" })
      .extend({ top: 10, bottom: 10, left: 10, right: 10, background: "#00000000" })
      .png()
      .toFile(dest(j));
  else
    await sharp(source).resize(1920, 1080, { fit: "cover" }).webp({ quality: 88 }).toFile(dest(j));
  fs.writeFileSync(
    dest(j) + ".json",
    JSON.stringify({ prompt: j.prompt, source, mode: "built-in imagegen" }, null, 2),
  );
  console.log(id + " installed");
}
if (cmd === "finalize") {
  for (const [game, name, , , subjects, labels] of games.filter((g) => !id || g[0] === id)) {
    const group = jobs.filter((j) => j.game === game);
    if (group.some((j) => !fs.existsSync(dest(j)))) throw Error("Incomplete " + game);
    for (const j of group) {
      const m = await sharp(dest(j)).metadata();
      if (j.transparent) {
        const s = await sharp(dest(j)).stats();
        if (m.width !== 320 || m.height !== 320 || !m.hasAlpha || s.channels[3].min !== 0)
          throw Error("Invalid " + dest(j));
      } else if (m.width !== 1920 || m.height !== 1080) throw Error("Invalid " + dest(j));
    }
    const p = `src/components/maxhigh/${game}/theme.ts`;
    let s = fs.readFileSync(p, "utf8");
    const tree = ts.createSourceFile(p, s, ts.ScriptTarget.Latest, true);
    const edits = [];
    const keys = [
      "grape",
      "plum",
      "melon",
      "apple",
      "blue",
      "green",
      "purple",
      "heart",
      "lollipop",
      "bomb",
    ];
    const assets = [
      "10",
      "J",
      "Q",
      "K",
      "A",
      "premium-a",
      "premium-b",
      "premium-c",
      "scatter",
      "wild",
    ];
    const icons = Object.fromEntries(
      keys.map((k, i) => [
        k,
        "/" + dest(group.find((j) => j.asset === assets[i])).replace(/^public\//, ""),
      ]),
    );
    const walk = (n) => {
      if (
        ts.isPropertyAssignment(n) &&
        n.name.getText(tree) === "assets" &&
        ts.isObjectLiteralExpression(n.initializer)
      ) {
        for (const prop of n.initializer.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          const k = prop.name.getText(tree);
          if (k === "icons")
            edits.push([
              prop.initializer.getStart(tree),
              prop.initializer.end,
              JSON.stringify(icons, null, 2),
            ]);
          else if (k === "backdrop" || k === "loadingBg")
            edits.push([
              prop.initializer.getStart(tree),
              prop.initializer.end,
              JSON.stringify("/" + dest(group.at(-1)).replace(/^public\//, "")),
            ]);
        }
      }
      ts.forEachChild(n, walk);
    };
    walk(tree);
    if (edits.length !== 3) throw Error("Theme patch count " + p);
    for (const [a, b, v] of edits.sort((a, b) => b[0] - a[0])) s = s.slice(0, a) + v + s.slice(b);
    fs.writeFileSync(p, s);
    const ip = `src/components/maxhigh/${game}/PantherIcon.tsx`;
    fs.writeFileSync(
      ip,
      fs
        .readFileSync(ip, "utf8")
        .replace(
          new RegExp(`/images/symbols/${game}/10[^" ]+`),
          `/images/symbols/${game}/10-v${version}.png`,
        )
        .replace(/fit === "cover"[\s\S]*?"[^"\n]*p-\[6%\]"/, '"size-full object-contain p-[2%]"'),
    );
    const rp = `src/components/maxhigh/${game}/ReelCell.tsx`;
    fs.writeFileSync(
      rp,
      fs
        .readFileSync(rp, "utf8")
        .replace(
          /absolute inset-\[(6|12|14)%\] flex items-center justify-center/g,
          "absolute inset-[4%] flex items-center justify-center",
        )
        .replace(
          "icon is cropped to fill the card",
          "transparent symbol is centered inside the card",
        ),
    );
    const cp = `src/lib/${game}-config.ts`;
    let c = fs.readFileSync(cp, "utf8");
    for (const [i, k] of ["green", "purple", "heart"].entries()) {
      c = c
        .replace(new RegExp(`(${k}:\\s*)"[^"]+"`), `$1"${labels[i]}"`)
        .replace(
          new RegExp(`(id: "${k}",\\s*kind: "${k}",\\s*label:\\s*)"[^"]+"`),
          `$1"${labels[i]}"`,
        );
    }
    fs.writeFileSync(cp, c);
    fs.mkdirSync("output/six-art-review", { recursive: true });
    const overlays = await Promise.all(
      group
        .filter((j) => j.transparent)
        .map(async (j, i) => ({
          input: await sharp(dest(j)).resize(240, 240).toBuffer(),
          left: 110 + (i % 5) * 300,
          top: 150 + Math.floor(i / 5) * 320,
        })),
    );
    await sharp(dest(group.at(-1)))
      .resize(1600, 900)
      .composite(overlays)
      .webp({ quality: 90 })
      .toFile(`output/six-art-review/${game}.webp`);
    fs.writeFileSync(
      `public/images/symbols/${game}/ART-v${version}.md`,
      `# ${name} artwork\n\nBuilt-in imagegen. Ten transparent 320x320 symbols and one 1920x1080 WebP background. Original files retained.\n\n` +
        group.map((j) => `## ${dest(j)}\n\n${j.prompt}\n`).join("\n"),
    );
    console.log(game + " finalized");
  }
}
