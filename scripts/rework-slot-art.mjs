import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const version = "20261012";
const root = process.cwd();
export const games = [
  [
    "safari-gold",
    "Safari Gold",
    "warm savannah gold, amber gems and acacia-leaf engravings",
    "African savannah at golden dusk, acacia silhouettes, rocky overlooks and distant waterfalls",
    [
      "an elegant giraffe portrait with gold leaf collar",
      "a majestic African elephant portrait with ivory tusks and ornate gold head ornament",
      "a regal African lion portrait with flowing mane and amber crown",
      "a golden acacia tree medallion",
      "a radiant amber sun orb in gold acacia branches",
    ],
    ["Giraffe", "Elephant", "Safari Lion"],
  ],
  [
    "buffalo-reign",
    "Buffalo Reign",
    "bronze and gold, turquoise inlay and rugged prairie ornament",
    "dramatic prairie canyon at sunset, monumental red cliffs, grasslands and storm clouds",
    [
      "a soaring golden eagle with turquoise breast ornament",
      "a powerful wild stallion portrait with bronze and turquoise tack",
      "a majestic American bison portrait with dark mane and gold accents",
      "a gold prairie mountain medallion",
      "a turquoise lightning orb in a bronze sun ring",
    ],
    ["Eagle", "Wild Stallion", "Buffalo"],
  ],
  [
    "prosperity-lion",
    "Prosperity Lion",
    "imperial red enamel, gold filigree, jade gems and Chinese cloud motifs",
    "imperial Chinese palace garden at evening, red pillars, gold roofs, peonies and lanterns",
    [
      "a jade prosperity seal with gold dragon-carved base",
      "an ornate gold treasure ingot filled with red and jade jewels",
      "a majestic Chinese guardian lion with gold mane and ruby ornament",
      "a gold lion-face blessing medallion",
      "a glowing ruby pearl held in golden cloud scrolls",
    ],
    ["Jade Seal", "Treasure Ingot", "Guardian Lion"],
  ],
  [
    "fortune-mouse",
    "Fortune Mouse",
    "royal purple, polished gold and jade, Chinese lucky-cloud ornament",
    "moonlit Chinese treasure pavilion, purple silk banners, golden lanterns and bamboo",
    [
      "a golden cheese-shaped treasure wedge studded with jade",
      "a red silk lucky pouch spilling gold coins",
      "a charming regal mouse with violet silk vest and gold ornament",
      "a round golden mouse zodiac medallion",
      "a glowing jade pearl encircled by gold coin motifs",
    ],
    ["Jade Treasure", "Lucky Pouch", "Fortune Mouse"],
  ],
  [
    "fortune-ox",
    "Fortune Ox",
    "deep crimson enamel, gold and emerald, Chinese knot ornament",
    "Chinese harvest palace at dawn, red lacquer pillars, golden terraces and misty rice fields",
    [
      "a jade harvest bell suspended from a compact gold knot",
      "an ornate golden treasure cart filled with red gems",
      "a powerful ox portrait with polished gold horns and red brocade collar",
      "a golden ox zodiac medallion",
      "a brilliant emerald orb in gold harvest wreath",
    ],
    ["Harvest Bell", "Treasure Cart", "Fortune Ox"],
  ],
  [
    "fortune-rabbit",
    "Fortune Rabbit",
    "moon silver, rose gold, pink jade and delicate Chinese lunar ornament",
    "lunar Chinese garden with peach blossom trees, jade palace terraces and warm lanterns",
    [
      "a jeweled peach blossom branch in a compact gold vase",
      "an ornate mooncake treasure box with pink jade centerpiece",
      "an elegant white rabbit with pink silk bow and rose gold moon ornament",
      "a gold rabbit-and-crescent medallion",
      "a glowing pink moon pearl encircled by rose gold clouds",
    ],
    ["Peach Blossom", "Mooncake Treasure", "Fortune Rabbit"],
  ],
  [
    "fortune-tiger",
    "Fortune Tiger",
    "rich orange amber, black enamel and gold, bold Chinese cloud engraving",
    "dramatic Chinese mountain temple at sunset, gold roofs, bamboo and amber lanterns",
    [
      "a gold tiger-claw pendant with amber centerpiece",
      "a red and gold ceremonial drum with jade fittings",
      "a majestic orange tiger portrait with black stripes and a gold forehead ornament",
      "a golden tiger zodiac medallion",
      "a blazing amber pearl cradled in gold tiger-claw scrolls",
    ],
    ["Tiger Claw", "Ceremonial Drum", "Fortune Tiger"],
  ],
  [
    "lucky-neko",
    "Lucky Neko",
    "cream porcelain, coral pink, polished gold and Japanese floral ornament",
    "Japanese lantern shrine at blue hour, vermilion torii gates, cherry blossoms and gold-lit wooden halls",
    [
      "an elegant gold koi fish curved around a pink pearl",
      "a gold koban coin treasure with cherry blossom engraving",
      "a smiling white maneki-neko beckoning cat with red collar and gold bell",
      "a round gold cat-face lucky medallion",
      "a glowing coral-pink pearl enclosed in golden cherry blossoms",
    ],
    ["Golden Koi", "Koban Treasure", "Lucky Neko"],
  ],
  [
    "cleopatra-gold",
    "Cleopatra Gold",
    "royal lapis blue, turquoise and polished Egyptian gold",
    "luxurious ancient Egyptian palace on the Nile at dusk, lotus pillars, gold reliefs and warm braziers",
    [
      "an ornate golden lotus chalice with turquoise jewels",
      "a gold Egyptian falcon with lapis wings",
      "a regal Cleopatra portrait with black hair, lapis headdress and gold collar",
      "a winged golden scarab medallion",
      "a radiant lapis orb cradled by gold cobra ornament",
    ],
    ["Lotus Chalice", "Golden Falcon", "Cleopatra"],
  ],
  [
    "desert-riches",
    "Desert Riches",
    "warm copper, desert gold, teal jewels and intricate oasis arabesques",
    "lavish desert oasis palace at twilight, sandstone arches, palms, dunes and lantern-lit terraces",
    [
      "an ornate golden perfume vessel with teal gem stopper",
      "a gold treasure chest overflowing with amber and teal gems",
      "a magnificent jeweled golden lamp with elegant curved spout",
      "a golden oasis palm medallion",
      "a glowing teal magic pearl surrounded by golden arabesques",
    ],
    ["Perfume Treasure", "Treasure Chest", "Golden Lamp"],
  ],
  [
    "gate-of-ra",
    "Gate of Ra",
    "sun gold, carnelian red, turquoise and Egyptian solar engraving",
    "monumental Egyptian solar gate during an eclipse, carved pylons, glowing sun reliefs and desert mist",
    [
      "a golden ankh with carnelian gemstone center",
      "a golden solar barque with turquoise inlays",
      "a majestic falcon-headed Ra bust with gold sun disk crown",
      "a circular winged sun disk medallion",
      "a radiant carnelian solar orb framed by golden falcon wings",
    ],
    ["Solar Ankh", "Sun Barque", "Ra"],
  ],
  [
    "maya-gold",
    "Maya Gold",
    "jade green, turquoise mosaic, polished gold and stepped Mesoamerican geometric ornament",
    "ancient Maya jungle city at emerald twilight, stepped pyramids, carved pillars and waterfalls",
    [
      "a brilliant quetzal bird with jade feathers and gold accents",
      "an ornate jade and gold ceremonial chalice",
      "a powerful golden jaguar guardian mask with jade eyes and mosaic crown",
      "a golden stepped temple medallion",
      "a glowing jade sunstone encircled by geometric gold rays",
    ],
    ["Quetzal", "Jade Chalice", "Jaguar Guardian"],
  ],
  [
    "pharaoh-fire",
    "Pharaoh Fire",
    "obsidian black, molten gold, ruby gems and Egyptian flame engraving",
    "ancient Egyptian fire temple at night, obsidian pylons, lava-lit channels and crimson desert sky",
    [
      "a golden cobra with ruby eyes and raised hood",
      "a black obsidian ankh edged with molten gold and rubies",
      "a regal pharaoh portrait with black and gold nemes crown and ruby collar",
      "a winged ruby scarab medallion",
      "a glowing ruby fire orb in a golden solar ring",
    ],
    ["Royal Cobra", "Obsidian Ankh", "Pharaoh"],
  ],
  [
    "enchanted-grove",
    "Enchanted Grove",
    "moss emerald, lilac crystal, rose gold and intricate woodland leaf filigree",
    "magical ancient woodland sanctuary at twilight, glowing flowers, giant tree roots, waterfalls and fireflies",
    [
      "a luminous lilac butterfly with gold-edged wings",
      "a golden acorn treasure with emerald leaves",
      "a majestic white stag portrait with branching golden antlers and emerald ornaments",
      "a round ancient tree medallion with emerald leaves",
      "a glowing violet magic crystal cradled in rose gold branches",
    ],
    ["Luminous Butterfly", "Golden Acorn", "White Stag"],
  ],
  [
    "godly-gates",
    "Godly Gates",
    "ivory marble, celestial gold, sapphire gems and elegant Greek scrollwork",
    "celestial Greek gateway high above clouds, ivory gold pillars, sapphire twilight and distant floating temples",
    [
      "a golden winged sandal with sapphire jewels",
      "a golden divine chalice with white marble and sapphire center",
      "a majestic golden eagle with spread wings and celestial sapphire armor",
      "an ornate miniature pair of golden heavenly gates",
      "a radiant sapphire star orb inside a gold laurel ring",
    ],
    ["Winged Sandal", "Divine Chalice", "Celestial Eagle"],
  ],
  [
    "olympus-wrath",
    "Olympus Wrath",
    "storm violet, electric blue, antique gold and bold Greek meander engraving",
    "storm-ravaged Mount Olympus at night, colossal marble temples, violet clouds and blue lightning along outer edges",
    [
      "a gold Greek war helmet with amethyst crest",
      "a powerful golden thunderbolt wrapped in restrained violet electricity",
      "a fierce original Zeus portrait with silver beard, glowing violet eyes and gold laurel crown",
      "a gold Olympus temple medallion with amethyst sky",
      "a brilliant violet storm orb held by golden lightning prongs",
    ],
    ["War Helmet", "Thunderbolt", "Wrathful Zeus"],
  ],
];
export const jobs = games.flatMap(([id, name, style, scene, subjects]) => {
  const glyphs = [
    ["10", "emerald"],
    ["J", "sapphire"],
    ["Q", "amethyst"],
    ["K", "ruby"],
    ["A", "amber"],
  ];
  const symbols = [
    ...glyphs.map(([glyph, gem]) => [
      glyph,
      `the ${glyph === "10" ? "numeral" : "letter"} ${glyph}, faceted ${gem} face, themed ornate gold edging`,
    ]),
    ...["premium-a", "premium-b", "premium-c", "scatter", "wild"].map((key, i) => [
      key,
      subjects[i],
    ]),
  ];
  return [
    ...symbols.map(([asset, subject]) => ({
      id: `${id}/${asset}`,
      game: id,
      asset,
      transparent: true,
      prompt: `Use case: stylized-concept. ONE standalone ${name} casino reel symbol: ${subject}. Art direction: ${style}. Exquisite detailed premium 3D gemstone and polished metal fantasy slot artwork, bold clear silhouette readable at small reel sizes. Square canvas. Complete object centered, fully inside frame with 10 percent transparent margin. Genuine transparent background. Crisp bevels, controlled rich lighting. No card plaque, backdrop, floor, extra objects, logos, watermark or text except requested letter or numeral. Never crop any part. One symbol only.`,
    })),
    {
      id: `${id}/backdrop`,
      game: id,
      asset: "backdrop",
      transparent: false,
      prompt: `Use case: stylized-concept. ${name} full-screen slot game background, cinematic landscape 16:9. Environment: ${scene}. Art direction: ${style}. Premium detailed fantasy 3D environment, gorgeous architecture and atmosphere along far left and right edges. Central 60 percent a calm dark atmospheric field, minimal detail and no dominant object, for an overlaid reel grid; top and bottom center quiet for controls. Warm highlights at edges, sophisticated depth and materials. Full bleed environment, safe to center crop on portrait mobile. No people, animal portraits, words, numbers, UI, reels, cards, logos or watermark. No bright central sky.`,
    },
  ];
});
const base = (game) => path.join(root, "public/images/symbols", game);
const dest = (job) =>
  path.join(base(job.game), `${job.asset}-v${version}.${job.transparent ? "png" : "webp"}`);
const logPath = path.join(root, "docs/slot-art-rework-progress.json");
function status() {
  return fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf8")) : {};
}
function saveStatus(s) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(s, null, 2) + "\n");
}
const [cmd, id, source] = process.argv.slice(2);
if (cmd === "jobs") console.log(JSON.stringify(jobs.filter((j) => !fs.existsSync(dest(j)))));
if (cmd === "install") {
  const job = jobs.find((j) => j.id === id);
  if (!job) throw Error("Unknown job");
  if (job.transparent)
    await sharp(source)
      .trim()
      .resize(300, 300, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(dest(job));
  else
    await sharp(source)
      .resize(1920, 1080, { fit: "cover" })
      .webp({ quality: 88 })
      .toFile(dest(job));
  const s = status();
  s[id] = { file: path.relative(root, dest(job)).replaceAll("\\", "/"), source, complete: true };
  saveStatus(s);
  console.log(id + " installed");
}
if (cmd === "status")
  console.log(
    JSON.stringify(
      games.map(([id, name]) => ({
        id,
        name,
        ready: jobs.filter((j) => j.game === id && fs.existsSync(dest(j))).length,
        total: 11,
      })),
      null,
      2,
    ),
  );
if (cmd === "preview") {
  const group = jobs.filter((j) => j.game === id);
  if (group.length !== 11 || group.some((j) => !fs.existsSync(dest(j))))
    throw Error("Set incomplete");
  const overlays = [];
  for (const [i, j] of group.filter((j) => j.transparent).entries()) {
    overlays.push({
      input: await sharp(dest(j)).resize(240, 240).toBuffer(),
      left: 110 + (i % 5) * 300,
      top: 150 + Math.floor(i / 5) * 320,
    });
  }
  const out = path.join(root, "output/slot-art-review");
  fs.mkdirSync(out, { recursive: true });
  await sharp(dest(group.find((j) => !j.transparent)))
    .resize(1600, 900)
    .composite(overlays)
    .webp({ quality: 88 })
    .toFile(path.join(out, `${id}.webp`));
  console.log(path.join(out, `${id}.webp`));
}
if (cmd === "finalize") {
  const selected = games.filter((g) => !id || g[0] === id);
  for (const [game, name, style, scene, subjects, labels] of selected) {
    const group = jobs.filter((j) => j.game === game);
    if (group.some((j) => !fs.existsSync(dest(j)))) {
      console.log(game + " pending");
      continue;
    }
    for (const j of group) {
      const m = await sharp(dest(j)).metadata();
      if (j.transparent) {
        const s = await sharp(dest(j)).stats();
        if (m.width !== 320 || m.height !== 320 || !m.hasAlpha || s.channels[3].min !== 0)
          throw Error("Invalid symbol " + j.id);
      } else if (m.width !== 1920 || m.height !== 1080) throw Error("Invalid backdrop " + j.id);
    }
    const theme = path.join(root, "src/components/maxhigh", game, "theme.ts");
    let t = fs.readFileSync(theme, "utf8");
    t = t
      .replace(
        /backdrop: "[^"]+"/,
        `backdrop: "/images/symbols/${game}/backdrop-v${version}.webp?v=${version}"`,
      )
      .replace(
        /loadingBg: "[^"]+"/,
        `loadingBg: "/images/symbols/${game}/backdrop-v${version}.webp?v=${version}"`,
      );
    const mapping = `icons: Object.fromEntries(Object.entries(themedIconPack("${game}", "${version}")).map(([kind, src]) => [kind, src.replace(".png", "-v${version}.png")])) as PantherTheme["assets"]["icons"]`;
    t = t.replace(/icons: themedIconPack\([^\n]+\)/, mapping);
    fs.writeFileSync(theme, t);
    const icon = path.join(root, "src/components/maxhigh", game, "PantherIcon.tsx");
    let it = fs.readFileSync(icon, "utf8");
    it = it.replace(
      new RegExp(`/images/symbols/${game}/10\\.png\\?v=\\d+`),
      `/images/symbols/${game}/10-v${version}.png?v=${version}`,
    );
    fs.writeFileSync(icon, it);
    const cfg = path.join(root, "src/lib", `${game}-config.ts`);
    let c = fs.readFileSync(cfg, "utf8");
    for (const [i, k] of ["green", "purple", "heart"].entries()) {
      c = c.replace(new RegExp(`(${k}: )"[^"]+"`), `$1"${labels[i]}"`);
      c = c.replace(new RegExp(`(id: "${k}", kind: "${k}", label: )"[^"]+"`), `$1"${labels[i]}"`);
    }
    fs.writeFileSync(cfg, c);
    fs.writeFileSync(
      path.join(base(game), `ART-v${version}.md`),
      `# ${name} artwork\n\nGenerated with the built-in imagegen tool. Ten transparent 320×320 PNG symbols and one 1920×1080 WebP background, used for gameplay and loading. Original files preserved.\n\n` +
        group.map((j) => `## ${path.basename(dest(j))}\n\n${j.prompt}\n`).join("\n"),
    );
    console.log(game + " finalized");
  }
}
