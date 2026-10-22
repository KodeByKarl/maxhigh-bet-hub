/**
 * The 50 Realms titles — identity data only (names, worlds, boards, symbols,
 * palettes, voices). Math defaults are derived in ./defaults.ts and tuned by
 * the calibration table in ./calibration.ts.
 *
 * `icon` values are lucide glyph names; scripts/realms/generate-realms-art.ts
 * renders them into each title's symbol, backdrop and thumbnail files.
 */
import type {
  PeryaInstrument,
  PeryaSpinStyle,
} from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";
import type { PERYA_SCALES } from "@/components/maxhigh/panther-shared/createSoftPeryaAudio";

export type RealmsWorld =
  | "ocean"
  | "celestial"
  | "volcanic"
  | "frost"
  | "jungle"
  | "ancient"
  | "clockwork"
  | "arcane"
  | "cosmos"
  | "spirit";

export type RealmsVolatility = "Medium" | "High" | "Very High";

/** A themed symbol: display name + lucide glyph used by the art generator. */
export type RealmsMotif = { name: string; icon: string };

export type RealmsVoiceSpec = {
  instrument: PeryaInstrument;
  spin: PeryaSpinStyle;
  /** Melody root in Hz (196–523) */
  root: number;
  scale: keyof typeof PERYA_SCALES;
  tempo: number;
};

export type RealmsGameDef = {
  /** 1-based catalog number */
  no: number;
  id: string;
  name: string;
  world: RealmsWorld;
  description: string;
  board: { cols: number; rows: number };
  volatility: RealmsVolatility;
  /** Free spins awarded on trigger (retrigger comes from the volatility profile). */
  freeSpins: number;
  /** [primary, secondary, glow, deep] */
  palette: [string, string, string, string];
  premiums: [RealmsMotif, RealmsMotif, RealmsMotif];
  scatter: RealmsMotif;
  bomb: RealmsMotif;
  voice: RealmsVoiceSpec;
};

const m = (name: string, icon: string): RealmsMotif => ({ name, icon });

export const REALMS_GAMES: readonly RealmsGameDef[] = [
  // ── Ocean Depths ──────────────────────────────────────────────────────────
  {
    no: 1,
    id: "abyssal-pearls",
    name: "Abyssal Pearls",
    world: "ocean",
    description:
      "Dive below the twilight zone where giant oysters guard glowing pearls. Anglerfish and kraken eyes tumble on a 6×5 board, Pressure Orbs multiply wins up to 5×, and Abyss Pearls open free spins.",
    board: { cols: 6, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#2DD4BF", "#0F766E", "#5EEAD4", "#022C22"],
    premiums: [m("Giant Oyster", "shell"), m("Anglerfish", "fish"), m("Kraken Eye", "eye")],
    scatter: m("Abyss Pearl", "gem"),
    bomb: m("Pressure Orb", "droplet"),
    voice: { instrument: "glass", spin: "bubbles", root: 330, scale: "aeolian", tempo: 0.95 },
  },
  {
    no: 2,
    id: "sirens-lagoon",
    name: "Siren's Lagoon",
    world: "ocean",
    description:
      "Follow the siren's song into a moonlit lagoon. Conch horns and mermaid hearts tumble on a 5×5 board, Tide Orbs multiply wins, and Lagoon Moons bring free spins.",
    board: { cols: 5, rows: 5 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#F472B6", "#9D174D", "#F9A8D4", "#2A0A1C"],
    premiums: [m("Siren's Song", "music"), m("Conch Horn", "shell"), m("Mermaid's Heart", "heart")],
    scatter: m("Lagoon Moon", "moon"),
    bomb: m("Tide Orb", "droplets"),
    voice: { instrument: "harp", spin: "rain", root: 392, scale: "lydian", tempo: 1 },
  },
  {
    no: 3,
    id: "tidecaller-hoard",
    name: "Tidecaller Hoard",
    world: "ocean",
    description:
      "Raise the hoard of the Tidecaller from a storm-wracked sea. A wide 7×5 board of galleons and storm anchors, Rogue Wave multipliers, and Tide Compass free spins for big swings.",
    board: { cols: 7, rows: 5 },
    volatility: "Very High",
    freeSpins: 10,
    palette: ["#60A5FA", "#1E3A8A", "#93C5FD", "#0B1226"],
    premiums: [
      m("Storm Anchor", "anchor"),
      m("Captain's Wheel", "ship-wheel"),
      m("Tidecaller Galleon", "ship"),
    ],
    scatter: m("Tide Compass", "compass"),
    bomb: m("Rogue Wave", "waves"),
    voice: { instrument: "gong", spin: "thunder", root: 262, scale: "dorian", tempo: 0.9 },
  },
  {
    no: 4,
    id: "lighthouse-loot",
    name: "Lighthouse Loot",
    world: "ocean",
    description:
      "Keep the beacon burning and the harbor's loot rolls in. Ship's bells and harbor skiffs tumble on a 6×4 board, Golden Hook multipliers boost wins, and Beacon Flares light up free spins.",
    board: { cols: 6, rows: 4 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#FBBF24", "#B45309", "#FDE68A", "#1C1206"],
    premiums: [m("Beacon Lamp", "lamp"), m("Harbor Skiff", "sailboat"), m("Ship's Bell", "bell")],
    scatter: m("Beacon Flare", "sun"),
    bomb: m("Golden Hook", "fishing-hook"),
    voice: { instrument: "bell", spin: "chimes", root: 440, scale: "majorPent", tempo: 1.05 },
  },
  {
    no: 5,
    id: "moonjelly-bay",
    name: "Moonjelly Bay",
    world: "ocean",
    description:
      "Bioluminescent jellies drift through a glowing bay. Sea turtles and lantern shrimp tumble on a tall 5×6 board, Glow Spores multiply wins, and Jelly Moons bring free spins.",
    board: { cols: 5, rows: 6 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#A78BFA", "#5B21B6", "#C4B5FD", "#160B2E"],
    premiums: [m("Moon Snail", "snail"), m("Lantern Shrimp", "shrimp"), m("Sea Turtle", "turtle")],
    scatter: m("Jelly Moon", "moon-star"),
    bomb: m("Glow Spore", "sparkle"),
    voice: { instrument: "celesta", spin: "drip", root: 349, scale: "wholeTone", tempo: 0.9 },
  },

  // ── Celestial ─────────────────────────────────────────────────────────────
  {
    no: 6,
    id: "starfall-sanctum",
    name: "Starfall Sanctum",
    world: "celestial",
    description:
      "Fallen stars gather in a hidden sanctum. A square 6×6 board of astrolabes and sanctum crowns, Nova Orb multipliers, and Starfall scatters that open free spins.",
    board: { cols: 6, rows: 6 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#FDE047", "#A16207", "#FEF08A", "#1A1405"],
    premiums: [
      m("Fallen Star", "star"),
      m("Astrolabe Scope", "telescope"),
      m("Sanctum Crown", "crown"),
    ],
    scatter: m("Starfall", "sparkles"),
    bomb: m("Nova Orb", "circle-star"),
    voice: { instrument: "celesta", spin: "chimes", root: 523, scale: "lydian", tempo: 1 },
  },
  {
    no: 7,
    id: "aurora-spire",
    name: "Aurora Spire",
    world: "celestial",
    description:
      "Climb the spire where the northern lights are born. Aurora ribbons and polar winds tumble on a tall 4×6 board, Spark Prisms multiply wins, and Twin Lights trigger free spins.",
    board: { cols: 4, rows: 6 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#34D399", "#047857", "#A7F3D0", "#04201A"],
    premiums: [
      m("Spire Peak", "mountain-snow"),
      m("Polar Wind", "wind"),
      m("Aurora Ribbon", "rainbow"),
    ],
    scatter: m("Twin Lights", "sun-moon"),
    bomb: m("Spark Prism", "zap"),
    voice: { instrument: "glass", spin: "wind", root: 392, scale: "lydian", tempo: 0.85 },
  },
  {
    no: 8,
    id: "comet-carnival",
    name: "Comet Carnival",
    world: "celestial",
    description:
      "The carnival rides in on a comet's tail. Star balloons and carnival drums tumble across a 7×4 midway, Carnival Dice multiply wins, and Comet Rings send you into free spins.",
    board: { cols: 7, rows: 4 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#FB7185", "#BE123C", "#FDA4AF", "#26070F"],
    premiums: [
      m("Star Balloon", "balloon"),
      m("Carnival Drum", "drum"),
      m("Comet Rocket", "rocket"),
    ],
    scatter: m("Comet Ring", "orbit"),
    bomb: m("Carnival Dice", "dices"),
    voice: { instrument: "pizzicato", spin: "roulette", root: 440, scale: "major", tempo: 1.15 },
  },
  {
    no: 9,
    id: "moonwell-mysteries",
    name: "Moonwell Mysteries",
    world: "celestial",
    description:
      "Draw silver water from the moonwell and unlock its mysteries. Crescent idols and silver keys tumble on a 5×5 board, Moonstones multiply wins, and Moonwell Sigils grant free spins.",
    board: { cols: 5, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#CBD5E1", "#475569", "#E2E8F0", "#0B1120"],
    premiums: [
      m("Moonwell Water", "droplets"),
      m("Silver Key", "key-round"),
      m("Crescent Idol", "moon"),
    ],
    scatter: m("Moonwell Sigil", "moon-star"),
    bomb: m("Moonstone", "gem"),
    voice: { instrument: "vibes", spin: "drip", root: 311, scale: "harmonicMinor", tempo: 0.9 },
  },
  {
    no: 10,
    id: "constellation-keep",
    name: "Constellation Keep",
    world: "celestial",
    description:
      "Storm the keep where the constellations stand guard. Orion shields and Gemini blades tumble on a wide 8×4 board, Pole Star multipliers hit hard, and Constellation scatters bring free spins.",
    board: { cols: 8, rows: 4 },
    volatility: "Very High",
    freeSpins: 8,
    palette: ["#818CF8", "#3730A3", "#C7D2FE", "#0E0F2E"],
    premiums: [m("Orion Shield", "shield"), m("Gemini Blades", "swords"), m("Star Keep", "castle")],
    scatter: m("Constellation", "circle-star"),
    bomb: m("Pole Star", "star"),
    voice: { instrument: "vibes", spin: "arp", root: 330, scale: "dorian", tempo: 1 },
  },

  // ── Volcanic ──────────────────────────────────────────────────────────────
  {
    no: 11,
    id: "cinder-crown",
    name: "Cinder Crown",
    world: "volcanic",
    description:
      "Claim the crown forged in a volcano's heart. Living flames and magma rubies tumble on a 6×5 board, Ember Bursts multiply wins, and Cinder Pyres ignite free spins.",
    board: { cols: 6, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#F97316", "#9A3412", "#FDBA74", "#1F0A03"],
    premiums: [m("Magma Ruby", "gem"), m("Living Flame", "flame"), m("Cinder Crown", "crown")],
    scatter: m("Cinder Pyre", "flame-kindling"),
    bomb: m("Ember Burst", "zap"),
    voice: { instrument: "gong", spin: "crackle", root: 262, scale: "phrygianDom", tempo: 1 },
  },
  {
    no: 12,
    id: "magma-anvil",
    name: "Magma Anvil",
    world: "volcanic",
    description:
      "Strike while the iron glows. Forge hammers and obsidian picks tumble across a 7×5 forge, Molten Rivets multiply wins, and Forge Fire scatters stoke big free-spin rounds.",
    board: { cols: 7, rows: 5 },
    volatility: "Very High",
    freeSpins: 8,
    palette: ["#EF4444", "#7F1D1D", "#FCA5A5", "#1C0505"],
    premiums: [
      m("Obsidian Pick", "pickaxe"),
      m("Forge Hammer", "hammer"),
      m("Magma Anvil", "anvil"),
    ],
    scatter: m("Forge Fire", "flame"),
    bomb: m("Molten Rivet", "bolt"),
    voice: { instrument: "bell", spin: "taiko", root: 294, scale: "harmonicMinor", tempo: 1.05 },
  },
  {
    no: 13,
    id: "obsidian-oracle",
    name: "Obsidian Oracle",
    world: "volcanic",
    description:
      "Ask the oracle of black glass what fate holds. Ash hourglasses and obsidian skulls tumble on a 5×5 board, Obsidian Shards multiply wins, and Oracle Visions reveal free spins.",
    board: { cols: 5, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#C084FC", "#581C87", "#E9D5FF", "#12051F"],
    premiums: [
      m("Ash Hourglass", "hourglass"),
      m("Obsidian Skull", "skull"),
      m("Oracle Eye", "eye"),
    ],
    scatter: m("Oracle Vision", "scan-eye"),
    bomb: m("Obsidian Shard", "diamond"),
    voice: { instrument: "glass", spin: "drip", root: 311, scale: "inSen", tempo: 0.9 },
  },
  {
    no: 14,
    id: "salamander-sun",
    name: "Salamander Sun",
    world: "volcanic",
    description:
      "Fire salamanders bask under a blazing sun. Phoenix plumes and solar discs tumble on a 6×4 board, Solar Flares multiply wins, and Sunrise Altars start free spins.",
    board: { cols: 6, rows: 4 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#FACC15", "#CA8A04", "#FEF08A", "#1F1503"],
    premiums: [m("Fire Salamander", "worm"), m("Phoenix Plume", "feather"), m("Solar Disc", "sun")],
    scatter: m("Sunrise Altar", "sunrise"),
    bomb: m("Solar Flare", "sun-medium"),
    voice: { instrument: "marimba", spin: "shaker", root: 349, scale: "mixolydian", tempo: 1.15 },
  },
  {
    no: 15,
    id: "ashfall-citadel",
    name: "Ashfall Citadel",
    world: "volcanic",
    description:
      "A citadel stands defiant under a sky of falling ash. Basalt shields and lava blades tumble on a huge 7×6 board, Pyroclast multipliers erupt, and Ashfall Peaks trigger free spins.",
    board: { cols: 7, rows: 6 },
    volatility: "Very High",
    freeSpins: 8,
    palette: ["#FB923C", "#7C2D12", "#FED7AA", "#1A0B04"],
    premiums: [
      m("Basalt Shield", "shield-half"),
      m("Lava Blade", "sword"),
      m("Ash Citadel", "castle"),
    ],
    scatter: m("Ashfall Peak", "mountain"),
    bomb: m("Pyroclast", "flame"),
    voice: { instrument: "gong", spin: "thunder", root: 247, scale: "aeolian", tempo: 0.85 },
  },

  // ── Frost ─────────────────────────────────────────────────────────────────
  {
    no: 16,
    id: "glacier-glyphs",
    name: "Glacier Glyphs",
    world: "frost",
    description:
      "Ancient glyphs are frozen deep in the glacier wall. Frozen scrolls and glyph flakes tumble on a 6×5 board, Frost Gems multiply wins, and Ice Glyphs crack open free spins.",
    board: { cols: 6, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#7DD3FC", "#0369A1", "#BAE6FD", "#03141F"],
    premiums: [
      m("Frozen Scroll", "scroll-text"),
      m("Glyph Flake", "snowflake"),
      m("Glacier Wall", "mountain-snow"),
    ],
    scatter: m("Ice Glyph", "hexagon"),
    bomb: m("Frost Gem", "gem"),
    voice: { instrument: "glass", spin: "chimes", root: 466, scale: "majorPent", tempo: 0.9 },
  },
  {
    no: 17,
    id: "northwind-narwhal",
    name: "Northwind Narwhal",
    world: "frost",
    description:
      "Ride the north wind with the narwhal pod. Polar compasses and ice anchors tumble on a 7×4 board, Hail Orbs multiply wins, and North Wind scatters blow in free spins.",
    board: { cols: 7, rows: 4 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#38BDF8", "#075985", "#7DD3FC", "#04121C"],
    premiums: [
      m("Ice Anchor", "anchor"),
      m("Polar Compass", "compass"),
      m("Northwind Narwhal", "fish"),
    ],
    scatter: m("North Wind", "wind"),
    bomb: m("Hail Orb", "snowflake"),
    voice: { instrument: "flute", spin: "wind", root: 392, scale: "dorian", tempo: 1 },
  },
  {
    no: 18,
    id: "snowglobe-sorcery",
    name: "Snowglobe Sorcery",
    world: "frost",
    description:
      "Shake the globe and the winter spell begins. Frost wands and silver pines tumble on a 5×5 board, Snow Squall multipliers swirl in, and Globe Shimmers grant free spins.",
    board: { cols: 5, rows: 5 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#E0E7FF", "#6366F1", "#C7D2FE", "#0D0F24"],
    premiums: [
      m("Winter Gift", "gift"),
      m("Silver Pine", "tree-pine"),
      m("Frost Wand", "wand-sparkles"),
    ],
    scatter: m("Globe Shimmer", "sparkles"),
    bomb: m("Snow Squall", "cloud-snow"),
    voice: { instrument: "musicbox", spin: "chimes", root: 523, scale: "major", tempo: 1 },
  },
  {
    no: 19,
    id: "frostbound-fjord",
    name: "Frostbound Fjord",
    world: "frost",
    description:
      "Drakkars sail out of a fjord locked in ice. Frost axes and rime shields tumble on a wide 8×4 board, Rime Sparks multiply wins, and Fjord Peaks lead to free spins.",
    board: { cols: 8, rows: 4 },
    volatility: "Very High",
    freeSpins: 8,
    palette: ["#5EEAD4", "#115E59", "#99F6E4", "#021A17"],
    premiums: [m("Rime Shield", "shield"), m("Frost Axe", "axe"), m("Fjord Drakkar", "ship")],
    scatter: m("Fjord Peaks", "mountain-snow"),
    bomb: m("Rime Spark", "sparkles"),
    voice: { instrument: "gong", spin: "wind", root: 220, scale: "aeolian", tempo: 0.85 },
  },
  {
    no: 20,
    id: "polar-prism",
    name: "Polar Prism",
    world: "frost",
    description:
      "Polar light splits into a thousand colors. Light shards and ice crystals tumble on a square 6×6 board, Refraction multipliers boost wins, and Prism Light opens free spins.",
    board: { cols: 6, rows: 6 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#A5F3FC", "#0E7490", "#CFFAFE", "#04161B"],
    premiums: [m("Light Shard", "triangle"), m("Ice Crystal", "gem"), m("Polar Prism", "diamond")],
    scatter: m("Prism Light", "rainbow"),
    bomb: m("Refraction", "sparkle"),
    voice: { instrument: "glass", spin: "arp", root: 440, scale: "lydian", tempo: 1.1 },
  },

  // ── Jungle & Garden ───────────────────────────────────────────────────────
  {
    no: 21,
    id: "orchid-oasis",
    name: "Orchid Oasis",
    world: "jungle",
    description:
      "Rare orchids bloom around a hidden desert spring. Oasis palms and sun orchids tumble on a 6×5 board, Bloom Buds multiply wins, and Oasis Springs refresh with free spins.",
    board: { cols: 6, rows: 5 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#E879F9", "#86198F", "#F5D0FE", "#1E0622"],
    premiums: [
      m("Sun Orchid", "flower-2"),
      m("Oasis Palm", "tree-palm"),
      m("Moon Orchid", "flower"),
    ],
    scatter: m("Oasis Spring", "droplets"),
    bomb: m("Bloom Bud", "sprout"),
    voice: { instrument: "kalimba", spin: "rain", root: 349, scale: "majorPent", tempo: 1.05 },
  },
  {
    no: 22,
    id: "firefly-hollow",
    name: "Firefly Hollow",
    world: "jungle",
    description:
      "At dusk the hollow fills with fireflies. Hollow lanterns and elder trees tumble on a tall 5×6 board, Glow Swarms multiply wins, and the Hollow Moon brings free spins.",
    board: { cols: 5, rows: 6 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#BEF264", "#4D7C0F", "#D9F99D", "#0D1A04"],
    premiums: [m("Elder Hollow", "trees"), m("Hollow Lantern", "lamp"), m("Firefly", "bug")],
    scatter: m("Hollow Moon", "moon"),
    bomb: m("Glow Swarm", "sparkles"),
    voice: { instrument: "celesta", spin: "flutter", root: 392, scale: "hirajoshi", tempo: 1 },
  },
  {
    no: 23,
    id: "canopy-kingdom",
    name: "Canopy Kingdom",
    world: "jungle",
    description:
      "High above the rainforest floor lies a kingdom in the treetops. Toucan heralds and great kapoks tumble on a 7×5 board, Fruit Burst multipliers hit big, and Golden Leaves start free spins.",
    board: { cols: 7, rows: 5 },
    volatility: "Very High",
    freeSpins: 8,
    palette: ["#4ADE80", "#166534", "#BBF7D0", "#03190A"],
    premiums: [
      m("Great Kapok", "tree-deciduous"),
      m("Toucan Herald", "bird"),
      m("Canopy Crown", "crown"),
    ],
    scatter: m("Golden Leaf", "leaf"),
    bomb: m("Fruit Burst", "banana"),
    voice: { instrument: "marimba", spin: "gallop", root: 294, scale: "mixolydian", tempo: 1.1 },
  },
  {
    no: 24,
    id: "monsoon-grove",
    name: "Monsoon Grove",
    world: "jungle",
    description:
      "The monsoon rolls over terraced tea groves. Silk parasols and monsoon clouds tumble on a 6×4 board, Rain Pearls multiply wins, and Thunderheads bring a downpour of free spins.",
    board: { cols: 6, rows: 4 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#2DD4BF", "#115E59", "#99F6E4", "#03201C"],
    premiums: [
      m("Tea Leaf", "leafy-green"),
      m("Silk Parasol", "umbrella"),
      m("Monsoon Cloud", "cloud-rain"),
    ],
    scatter: m("Thunderhead", "cloud-lightning"),
    bomb: m("Rain Pearl", "droplet"),
    voice: { instrument: "koto", spin: "rain", root: 330, scale: "inSen", tempo: 0.95 },
  },
  {
    no: 25,
    id: "hummingbird-haven",
    name: "Hummingbird Haven",
    world: "jungle",
    description:
      "Hummingbirds dart between trumpet blooms in a sunlit haven. Wild cherries and hummingbirds tumble on a 5×5 board, Nectar Hearts multiply wins, and the Haven Sun triggers free spins.",
    board: { cols: 5, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#F43F5E", "#9F1239", "#FDA4AF", "#24050C"],
    premiums: [
      m("Wild Cherry", "cherry"),
      m("Trumpet Bloom", "flower-2"),
      m("Hummingbird", "bird"),
    ],
    scatter: m("Haven Sun", "sun"),
    bomb: m("Nectar Heart", "heart"),
    voice: { instrument: "flute", spin: "flutter", root: 523, scale: "majorPent", tempo: 1.2 },
  },

  // ── Ancient Realms ────────────────────────────────────────────────────────
  {
    no: 26,
    id: "babylon-gardens",
    name: "Babylon Gardens",
    world: "ancient",
    description:
      "Walk the terraces of the hanging gardens. Royal amphorae and ziggurats tumble on a square 6×6 board, Ishtar Sun multipliers shine, and the Hanging Gardens grant free spins.",
    board: { cols: 6, rows: 6 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#84CC16", "#3F6212", "#D9F99D", "#121A03"],
    premiums: [
      m("Royal Amphora", "amphora"),
      m("Hanging Bloom", "flower-2"),
      m("Ziggurat", "landmark"),
    ],
    scatter: m("Hanging Gardens", "trees"),
    bomb: m("Ishtar Sun", "sun"),
    voice: { instrument: "harp", spin: "harp", root: 294, scale: "phrygianDom", tempo: 0.95 },
  },
  {
    no: 27,
    id: "persian-peacock",
    name: "Persian Peacock",
    world: "ancient",
    description:
      "A jewelled peacock struts through the shah's palace. Palace keys and turquoise stones tumble on a 5×5 board, Jewel Bursts multiply wins, and Peacock Eyes unfold free spins.",
    board: { cols: 5, rows: 5 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#14B8A6", "#134E4A", "#5EEAD4", "#031716"],
    premiums: [m("Palace Key", "key"), m("Shah's Turquoise", "gem"), m("Peacock Plume", "feather")],
    scatter: m("Peacock Eye", "eye"),
    bomb: m("Jewel Burst", "sparkles"),
    voice: { instrument: "pluck", spin: "shaker", root: 311, scale: "doubleHarmonic", tempo: 1 },
  },
  {
    no: 28,
    id: "celtic-clover-court",
    name: "Celtic Clover Court",
    world: "ancient",
    description:
      "The fae hold court beneath an ancient oak. Court harps and druid shields tumble on a 7×4 board, Fae Sparks multiply wins, and Crocks of Coins open free spins.",
    board: { cols: 7, rows: 4 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#22C55E", "#14532D", "#86EFAC", "#04150A"],
    premiums: [
      m("Druid Shield", "shield"),
      m("Court Harp", "music"),
      m("Four-Leaf Clover", "clover"),
    ],
    scatter: m("Crock of Coins", "coins"),
    bomb: m("Fae Spark", "sparkle"),
    voice: { instrument: "harp", spin: "roll", root: 392, scale: "mixolydian", tempo: 1.15 },
  },
  {
    no: 29,
    id: "shogun-sakura",
    name: "Shogun Sakura",
    world: "ancient",
    description:
      "Cherry blossoms fall over the shogun's war camp. War fans and twin katana tumble on a 6×5 board, Taiko Strikes multiply wins, and the Shogun Keep calls free spins.",
    board: { cols: 6, rows: 5 },
    volatility: "Very High",
    freeSpins: 8,
    palette: ["#FB7185", "#881337", "#FECDD3", "#200510"],
    premiums: [m("Sakura Blossom", "flower"), m("War Fan", "fan"), m("Twin Katana", "swords")],
    scatter: m("Shogun Keep", "castle"),
    bomb: m("Taiko Strike", "drum"),
    voice: { instrument: "koto", spin: "taiko", root: 330, scale: "hirajoshi", tempo: 1 },
  },
  {
    no: 30,
    id: "longship-raiders",
    name: "Longship Raiders",
    world: "ancient",
    description:
      "Raiders beach their longships on a distant shore. Round shields and raider axes tumble on a wide 8×4 board, War Hammer multipliers smash in, and Sunstones guide free spins.",
    board: { cols: 8, rows: 4 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#F59E0B", "#78350F", "#FCD34D", "#1A0F03"],
    premiums: [
      m("Round Shield", "shield-half"),
      m("Raider Axe", "axe"),
      m("Dragon Longship", "ship"),
    ],
    scatter: m("Sunstone", "sun-dim"),
    bomb: m("War Hammer", "hammer"),
    voice: { instrument: "gong", spin: "gallop", root: 247, scale: "dorian", tempo: 1 },
  },

  // ── Clockwork ─────────────────────────────────────────────────────────────
  {
    no: 31,
    id: "clockwork-cache",
    name: "Clockwork Cache",
    world: "clockwork",
    description:
      "Crack the inventor's clockwork cache. Wind-up keys and brass clocks tumble on a 6×5 board, Spring Bolts multiply wins, and the Master Cog winds up free spins.",
    board: { cols: 6, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#D4A373", "#7C5A2B", "#F1D3A8", "#1A1208"],
    premiums: [m("Cache Lock", "lock"), m("Wind-up Key", "key-round"), m("Brass Clock", "clock")],
    scatter: m("Master Cog", "cog"),
    bomb: m("Spring Bolt", "bolt"),
    voice: { instrument: "musicbox", spin: "clock", root: 440, scale: "major", tempo: 1 },
  },
  {
    no: 32,
    id: "brass-zeppelin",
    name: "Brass Zeppelin",
    world: "clockwork",
    description:
      "Board a brass zeppelin bound for the jet stream. Spyglasses and sky compasses tumble on a 7×5 board, Pressure Gauge multipliers rise, and Jet Stream scatters carry you into free spins.",
    board: { cols: 7, rows: 5 },
    volatility: "Very High",
    freeSpins: 8,
    palette: ["#FCD34D", "#92400E", "#FDE68A", "#1C1104"],
    premiums: [
      m("Spyglass", "telescope"),
      m("Sky Compass", "compass"),
      m("Brass Zeppelin", "balloon"),
    ],
    scatter: m("Jet Stream", "wind"),
    bomb: m("Pressure Gauge", "gauge"),
    voice: { instrument: "vibes", spin: "wind", root: 349, scale: "lydian", tempo: 0.95 },
  },
  {
    no: 33,
    id: "tesla-tower",
    name: "Tesla Tower",
    world: "clockwork",
    description:
      "Power surges through the inventor's tower. Arc bulbs and wireless sets tumble on a 5×5 board, Plasma Orbs multiply wins, and the Tesla Tower charges up free spins.",
    board: { cols: 5, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#60A5FA", "#1D4ED8", "#BFDBFE", "#05102A"],
    premiums: [m("Wireless Set", "radio"), m("Arc Bulb", "lightbulb"), m("Tesla Coil", "zap")],
    scatter: m("Tesla Tower", "radio-tower"),
    bomb: m("Plasma Orb", "atom"),
    voice: { instrument: "glass", spin: "thunder", root: 466, scale: "wholeTone", tempo: 1.1 },
  },
  {
    no: 34,
    id: "gearspring-gala",
    name: "Gearspring Gala",
    world: "clockwork",
    description:
      "An automaton ball where every guest is wound by hand. Pocket watches and gala boxes tumble on a 6×4 board, Confetti Bursts multiply wins, and Gala Gears start free spins.",
    board: { cols: 6, rows: 4 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#F472B6", "#831843", "#FBCFE8", "#1F0613"],
    premiums: [m("Gala Box", "gift"), m("Clockwork Drum", "drum"), m("Pocket Watch", "watch")],
    scatter: m("Gala Gears", "settings"),
    bomb: m("Confetti Burst", "sparkles"),
    voice: { instrument: "pizzicato", spin: "clock", root: 392, scale: "major", tempo: 1.2 },
  },
  {
    no: 35,
    id: "steamforge-express",
    name: "Steamforge Express",
    world: "clockwork",
    description:
      "All aboard the express out of the steamforge. Engineer wrenches and steam engines tumble on a 7×4 board, Boiler Blasts multiply wins, and the Golden Rail runs free spins.",
    board: { cols: 7, rows: 4 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#FB923C", "#9A3412", "#FED7AA", "#1C0B03"],
    premiums: [
      m("Engineer Wrench", "wrench"),
      m("Steamforge", "factory"),
      m("Steam Express", "train-front"),
    ],
    scatter: m("Golden Rail", "train-track"),
    bomb: m("Boiler Blast", "flame"),
    voice: { instrument: "steelpan", spin: "roll", root: 294, scale: "mixolydian", tempo: 1.15 },
  },

  // ── Arcane ────────────────────────────────────────────────────────────────
  {
    no: 36,
    id: "alchemist-atelier",
    name: "Alchemist Atelier",
    world: "arcane",
    description:
      "Bubbling flasks fill the alchemist's workshop. Mercury beakers and alchemy tomes tumble on a 6×5 board, Transmute Flames multiply wins, and the Prime Element unlocks free spins.",
    board: { cols: 6, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#A3E635", "#3F6212", "#D9F99D", "#0F1703"],
    premiums: [
      m("Mercury Beaker", "beaker"),
      m("Alchemy Tome", "book-open"),
      m("Elixir Flask", "flask-conical"),
    ],
    scatter: m("Prime Element", "atom"),
    bomb: m("Transmute Flame", "flame"),
    voice: { instrument: "kalimba", spin: "bubbles", root: 349, scale: "dorian", tempo: 1 },
  },
  {
    no: 37,
    id: "crystal-grimoire",
    name: "Crystal Grimoire",
    world: "arcane",
    description:
      "A spellbook bound in living crystal. Rune wands and spell crystals tumble on a tall 5×6 board, Mana Shards multiply wins, and Arcane Sigils open free spins.",
    board: { cols: 5, rows: 6 },
    volatility: "Very High",
    freeSpins: 8,
    palette: ["#A78BFA", "#4C1D95", "#DDD6FE", "#120822"],
    premiums: [m("Rune Wand", "wand"), m("Spell Crystal", "gem"), m("Crystal Grimoire", "book")],
    scatter: m("Arcane Sigil", "sparkles"),
    bomb: m("Mana Shard", "diamond"),
    voice: {
      instrument: "celesta",
      spin: "chimes",
      root: 494,
      scale: "harmonicMinor",
      tempo: 0.95,
    },
  },
  {
    no: 38,
    id: "tarot-twilight",
    name: "Tarot Twilight",
    world: "arcane",
    description:
      "Turn the cards at twilight and read your fortune. The Star, the Moon and the Sun tumble on a 6×4 board, Fate Loops multiply wins, and the All-Seeing Card deals free spins.",
    board: { cols: 6, rows: 4 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#C084FC", "#6B21A8", "#E9D5FF", "#170828"],
    premiums: [m("The Star", "star"), m("The Moon", "moon"), m("The Sun", "sun")],
    scatter: m("All-Seeing Card", "eye"),
    bomb: m("Fate Loop", "infinity"),
    voice: { instrument: "harp", spin: "arp", root: 330, scale: "aeolian", tempo: 0.9 },
  },
  {
    no: 39,
    id: "potion-parlor",
    name: "Potion Parlor",
    world: "arcane",
    description:
      "Step into a parlor of fizzing tonics. Love potions and moon wine tumble on a 5×5 board, Potion Drops multiply wins, and the Parlor Hourglass turns over free spins.",
    board: { cols: 5, rows: 5 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#F472B6", "#9D174D", "#FBCFE8", "#22071A"],
    premiums: [
      m("Swift Tonic", "test-tube-diagonal"),
      m("Moon Wine", "wine"),
      m("Love Potion", "flask-round"),
    ],
    scatter: m("Parlor Hourglass", "hourglass"),
    bomb: m("Potion Drop", "droplet"),
    voice: { instrument: "musicbox", spin: "bubbles", root: 466, scale: "majorPent", tempo: 1.1 },
  },
  {
    no: 40,
    id: "hexbound-library",
    name: "Hexbound Library",
    world: "arcane",
    description:
      "Every book in this library is sealed by a hex. Archive keys and sealed scrolls tumble on a 7×5 board, Watcher Eyes multiply wins, and the Hexbound Tome opens free spins.",
    board: { cols: 7, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#FBBF24", "#78350F", "#FDE68A", "#170F04"],
    premiums: [
      m("Archive Key", "key"),
      m("Sealed Scroll", "scroll"),
      m("Hexbound Shelf", "library"),
    ],
    scatter: m("Hexbound Tome", "book-key"),
    bomb: m("Watcher Eye", "eye"),
    voice: { instrument: "pluck", spin: "flutter", root: 294, scale: "phrygianDom", tempo: 0.95 },
  },

  // ── Cosmos ────────────────────────────────────────────────────────────────
  {
    no: 41,
    id: "cosmic-koi",
    name: "Cosmic Koi",
    world: "cosmos",
    description:
      "Koi swim through a river of stars. Nebula lotuses and star streams tumble on a 6×5 board, Stardust multiplies wins, and the Koi Orbit pulls you into free spins.",
    board: { cols: 6, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#F97316", "#7C2D12", "#FDBA74", "#170A03"],
    premiums: [m("Star Stream", "waves"), m("Nebula Lotus", "flower"), m("Cosmic Koi", "fish")],
    scatter: m("Koi Orbit", "orbit"),
    bomb: m("Stardust", "sparkle"),
    voice: { instrument: "koto", spin: "bubbles", root: 349, scale: "hirajoshi", tempo: 1 },
  },
  {
    no: 42,
    id: "saturn-rings",
    name: "Saturn Rings",
    world: "cosmos",
    description:
      "Cruise the rings of the giant planet. Ring probes and Titan moons tumble on a 7×4 board, Ring Dust multiplies wins, and the Blue Planet calls you home with free spins.",
    board: { cols: 7, rows: 4 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#EAB308", "#713F12", "#FEF08A", "#161004"],
    premiums: [m("Titan Moon", "moon"), m("Ring Probe", "satellite"), m("Saturn", "orbit")],
    scatter: m("Blue Planet", "globe"),
    bomb: m("Ring Dust", "sparkles"),
    voice: { instrument: "vibes", spin: "roll", root: 392, scale: "lydian", tempo: 0.95 },
  },
  {
    no: 43,
    id: "rocket-rendezvous",
    name: "Rocket Rendezvous",
    world: "cosmos",
    description:
      "Two ships, one docking window. Deep-space dishes and shuttles tumble on a 5×5 board, Thruster Bursts multiply wins, and the Home Planet scatter launches free spins.",
    board: { cols: 5, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#F43F5E", "#881337", "#FDA4AF", "#1F050B"],
    premiums: [
      m("Deep Dish", "satellite-dish"),
      m("Shuttle", "plane"),
      m("Rendezvous Rocket", "rocket"),
    ],
    scatter: m("Home Planet", "earth"),
    bomb: m("Thruster Burst", "zap"),
    voice: { instrument: "steelpan", spin: "arp", root: 440, scale: "mixolydian", tempo: 1.2 },
  },
  {
    no: 44,
    id: "asteroid-miners",
    name: "Asteroid Miners",
    world: "cosmos",
    description:
      "Strike it rich in the belt. Astro picks and star ore tumble on a wide 8×4 board, Charge Bolts multiply wins hard, and Mining Beacons signal free spins.",
    board: { cols: 8, rows: 4 },
    volatility: "Very High",
    freeSpins: 8,
    palette: ["#94A3B8", "#334155", "#E2E8F0", "#0B1018"],
    premiums: [m("Miner Helmet", "hard-hat"), m("Star Ore", "gem"), m("Astro Pick", "pickaxe")],
    scatter: m("Mining Beacon", "satellite"),
    bomb: m("Charge Bolt", "bolt"),
    voice: { instrument: "bell", spin: "coins", root: 330, scale: "dorian", tempo: 1.05 },
  },
  {
    no: 45,
    id: "nebula-nomads",
    name: "Nebula Nomads",
    world: "cosmos",
    description:
      "Wanderers camp at the edge of a glowing nebula. Star compasses and nebula scopes tumble on a square 6×6 board, Ion Cores multiply wins, and the Nebula scatter opens free spins.",
    board: { cols: 6, rows: 6 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#E879F9", "#701A75", "#F5D0FE", "#1A0520"],
    premiums: [
      m("Nomad Camp", "tent"),
      m("Star Compass", "compass"),
      m("Nebula Scope", "telescope"),
    ],
    scatter: m("Nebula", "cloud-moon"),
    bomb: m("Ion Core", "atom"),
    voice: { instrument: "flute", spin: "wind", root: 311, scale: "doubleHarmonic", tempo: 0.9 },
  },

  // ── Spirit Animals ────────────────────────────────────────────────────────
  {
    no: 46,
    id: "stag-spirit-glade",
    name: "Stag Spirit Glade",
    world: "spirit",
    description:
      "A spirit stag walks the moonlit glade. Glade leaves and stag tracks tumble on a 6×5 board, Wisp Lights multiply wins, and the Spirit Moon reveals free spins.",
    board: { cols: 6, rows: 5 },
    volatility: "High",
    freeSpins: 10,
    palette: ["#4ADE80", "#14532D", "#BBF7D0", "#03140A"],
    premiums: [m("Glade Leaf", "leaf"), m("Stag Tracks", "paw-print"), m("Spirit Grove", "trees")],
    scatter: m("Spirit Moon", "moon-star"),
    bomb: m("Wisp Light", "sparkles"),
    voice: { instrument: "kalimba", spin: "flutter", root: 330, scale: "minorPent", tempo: 0.95 },
  },
  {
    no: 47,
    id: "tortoise-treasury",
    name: "Tortoise Treasury",
    world: "spirit",
    description:
      "An ancient tortoise carries a treasury on its shell. Jade coins and shell vaults tumble on a 5×5 board, Shell Plates multiply wins, and Treasury Jade grants free spins.",
    board: { cols: 5, rows: 5 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#10B981", "#065F46", "#A7F3D0", "#021A12"],
    premiums: [
      m("Jade Coins", "coins"),
      m("Shell Vault", "shell"),
      m("Ancient Tortoise", "turtle"),
    ],
    scatter: m("Treasury Jade", "gem"),
    bomb: m("Shell Plate", "hexagon"),
    voice: { instrument: "marimba", spin: "coins", root: 294, scale: "majorPent", tempo: 0.9 },
  },
  {
    no: 48,
    id: "crane-pavilion",
    name: "Crane Pavilion",
    world: "spirit",
    description:
      "Red-crowned cranes dance beside the lake pavilion. Paper cranes and pavilion fans tumble on a 7×4 board, Plum Blossoms multiply wins, and the Rising Sun brings free spins.",
    board: { cols: 7, rows: 4 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#F87171", "#7F1D1D", "#FECACA", "#1F0606"],
    premiums: [
      m("Pavilion Fan", "fan"),
      m("Paper Crane", "origami"),
      m("Red-Crowned Crane", "bird"),
    ],
    scatter: m("Rising Sun", "sunrise"),
    bomb: m("Plum Blossom", "flower"),
    voice: { instrument: "koto", spin: "chimes", root: 392, scale: "inSen", tempo: 0.95 },
  },
  {
    no: 49,
    id: "thunderbird-totem",
    name: "Thunderbird Totem",
    world: "spirit",
    description:
      "The thunderbird wakes above the totem. Storm feathers and totem drums tumble on a square 6×6 board, Thunderclaps multiply wins, and Storm Totems call down free spins.",
    board: { cols: 6, rows: 6 },
    volatility: "Very High",
    freeSpins: 8,
    palette: ["#38BDF8", "#0C4A6E", "#BAE6FD", "#03111C"],
    premiums: [m("Totem Drum", "drum"), m("Storm Feather", "feather"), m("Thunderbird", "bird")],
    scatter: m("Storm Totem", "cloud-lightning"),
    bomb: m("Thunderclap", "zap"),
    voice: { instrument: "gong", spin: "thunder", root: 262, scale: "minorPent", tempo: 1 },
  },
  {
    no: 50,
    id: "monarch-meadow",
    name: "Monarch Meadow",
    world: "spirit",
    description:
      "Monarchs gather in a meadow of wildflowers. Milkweed blooms and meadow sprouts tumble on a tall 5×6 board, Morning Dew multiplies wins, and the Monarch Flower opens free spins.",
    board: { cols: 5, rows: 6 },
    volatility: "Medium",
    freeSpins: 12,
    palette: ["#FB923C", "#9A3412", "#FED7AA", "#1F0B03"],
    premiums: [
      m("Meadow Sprout", "sprout"),
      m("Milkweed Bloom", "flower-2"),
      m("Meadow Sun", "sun"),
    ],
    scatter: m("Monarch Flower", "flower"),
    bomb: m("Morning Dew", "droplet"),
    voice: { instrument: "celesta", spin: "flutter", root: 440, scale: "major", tempo: 1.1 },
  },
];
