import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLONES = [
  ["lucky-neko", "Lucky Neko", "#F472B6"],
  ["fortune-tiger", "Fortune Tiger", "#F97316"],
  ["fortune-ox", "Fortune Ox", "#EAB308"],
  ["fortune-rabbit", "Fortune Rabbit", "#A78BFA"],
  ["fortune-mouse", "Fortune Mouse", "#94A3B8"],
  ["prosperity-lion", "Prosperity Lion", "#F59E0B"],
  ["buffalo-reign", "Buffalo Reign", "#D97706"],
  ["safari-gold", "Safari Gold", "#CA8A04"],
  ["cleopatra-gold", "Cleopatra Gold", "#EAB308"],
  ["maya-gold", "Maya Gold", "#F59E0B"],
  ["temple-rush", "Temple Rush", "#FB923C"],
  ["pharaoh-fire", "Pharaoh Fire", "#EF4444"],
  ["desert-riches", "Desert Riches", "#F59E0B"],
  ["gate-of-ra", "Gate of Ra", "#FBBF24"],
  ["zeus-strike", "Zeus Strike", "#38BDF8"],
  ["thor-thunder", "Thor Thunder", "#60A5FA"],
  ["godly-gates", "Godly Gates", "#818CF8"],
  ["olympus-wrath", "Olympus Wrath", "#A78BFA"],
  ["enchanted-grove", "Enchanted Grove", "#34D399"],
];

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
  ...CLONES.map((c) => c[0]),
];

const thumbOnly = [
  "knockout-king",
  "arena-champ",
  "outlaw-coins",
  "crystal-cave",
  "diamond-dig",
  "candy-blast",
  "sweet-rush",
  "starlight-ways",
  "galaxy-ace",
  "mystic-runes",
];

fs.writeFileSync(
  path.join(ROOT, "src/lib/playable-games.ts"),
  `/**
 * Soft-launch lobby: Golden Panther family (~30 titles).
 * Art polish continues; engines are live.
 */
export const LOBBY_VISIBLE_GAME_IDS = [
${ids.map((id) => `  "${id}",`).join("\n")}
] as const;

const LOBBY_VISIBLE_GAME_ID_SET = new Set<string>(LOBBY_VISIBLE_GAME_IDS);

export function isLobbyVisibleGame(gameId: string): boolean {
  return LOBBY_VISIBLE_GAME_ID_SET.has(gameId);
}

/**
 * Catalog titles that only have lobby thumbnails for now — no playable engine
 * mounted in GamePlayModal (falls through to Coming Soon).
 */
export const THUMBNAIL_ONLY_GAME_IDS = new Set<string>([
${thumbOnly.map((id) => `  "${id}",`).join("\n")}
]);

export function isThumbnailOnlyGame(gameId: string): boolean {
  return THUMBNAIL_ONLY_GAME_IDS.has(gameId);
}

export function isPlayableGame(gameId: string): boolean {
  return !THUMBNAIL_ONLY_GAME_IDS.has(gameId);
}
`,
);

const modalPath = path.join(ROOT, "src/components/maxhigh/GamePlayModal.tsx");
let m = fs.readFileSync(modalPath, "utf8");
const needle = `  "ruby-raven": pantherBoot(
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
};`;

if (!m.includes(needle)) {
  throw new Error("ruby-raven boot block not found exactly");
}

let boots = "";
for (const [id, name, accent] of CLONES) {
  if (m.includes(`"${id}": pantherBoot(`)) continue;
  boots += `  "${id}": pantherBoot(
    "${id}",
    "${name}",
    "${name.toUpperCase()} ARCADE",
    "POWER ACTIVE",
    "${accent}",
    "from-[#111827]/80 via-[#0A0912]/80 to-[#020617]/95",
    "from-[${accent}] via-[${accent}] to-[#111827]",
    "shadow-[0_0_60px_rgba(0,0,0,0.6)] border-white/30",
    "from-[${accent}] via-[${accent}] to-[#111827]",
  ),
`;
}

m = m.replace(
  needle,
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
${boots}};`,
);
fs.writeFileSync(modalPath, m);

console.log("lobby", ids.length);
console.log("new boots", boots.split("pantherBoot").length - 1);
