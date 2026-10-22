/**
 * Per-game cast of creatures. Each fishing game has its own species per tier
 * (common → boss + crate), matched to that game's seabed theme.
 */
import type { Pal, Spec, TierKey } from "./species";

export type FishingGameKey =
  | "deep-bass"
  | "dragon-fisher"
  | "crab-cannon"
  | "shark-hunter"
  | "octopus-armada"
  | "turtle-tide"
  | "whale-war";

type Cast = Record<TierKey, Spec> & { crate: Spec };

const pal = (
  body: string,
  mid: string,
  dark: string,
  fin: string,
  accent: string,
  glow: string,
  belly?: string,
): Pal => ({
  body,
  mid,
  dark,
  fin,
  accent,
  glow,
  belly,
});

const GOLD_CRATE = pal(
  "#fbbf24",
  "#d97706",
  "#78350f",
  "#fde68a",
  "#fbbf24",
  "rgba(253,224,71,.8)",
);

function make(c: Omit<Cast, "super" | "crate"> & { crate?: Spec }): Cast {
  const crate: Spec = c.crate ?? { kind: "fish", pal: GOLD_CRATE };
  return { ...c, super: c.elite, crate };
}

/* Lake — freshwater predators. */
const DEEP_BASS: Cast = make({
  common: {
    kind: "fish",
    pal: pal("#e5e7eb", "#9ca3af", "#4b5563", "#9ca3af", "#cbd5e1", "rgba(203,213,225,.6)"),
    o: { slim: 0.8, pattern: "scales" },
  }, // silver shiner
  uncommon: {
    kind: "fish",
    pal: pal("#7dd3fc", "#2563eb", "#1e3a8a", "#f97316", "#fb923c", "rgba(56,189,248,.6)"),
    o: { slim: 1.15, wide: 0.9, pattern: "stripes", forkTail: false },
  }, // bluegill
  rare: {
    kind: "fish",
    pal: pal("#a3e635", "#4d7c0f", "#1a2e05", "#3f6212", "#1a2e05", "rgba(132,204,22,.6)"),
    o: { pattern: "blotches" },
  }, // largemouth bass
  elite: {
    kind: "fish",
    pal: pal("#d9f99d", "#65a30d", "#365314", "#4d7c0f", "#fef9c3", "rgba(190,242,100,.65)"),
    o: { slim: 0.7, pattern: "spots" },
    aspect: 1.15,
  }, // northern pike
  boss: {
    kind: "fish",
    pal: pal("#94a3b8", "#475569", "#0f172a", "#334155", "#f43f5e", "rgba(244,63,94,.7)"),
    o: { slim: 1.1, pattern: "blotches", barbels: true, wide: 1.05 },
    aspect: 1.1,
  }, // giant catfish
});

/* Koi pond / jade temple. */
const DRAGON_FISHER: Cast = make({
  common: {
    kind: "fish",
    pal: pal("#fff7ed", "#fdba74", "#c2410c", "#fed7aa", "#f97316", "rgba(251,146,60,.6)"),
    o: { slim: 0.85, pattern: "koi" },
  }, // orange koi
  uncommon: {
    kind: "fish",
    pal: pal("#fde68a", "#f59e0b", "#92400e", "#fbbf24", "#dc2626", "rgba(251,191,36,.6)"),
    o: { slim: 0.9, pattern: "koi" },
    aspect: 1.05,
  }, // kohaku-gold koi
  rare: {
    kind: "fish",
    pal: pal("#fef3c7", "#eab308", "#713f12", "#fde047", "#a16207", "rgba(250,204,21,.7)"),
    o: { slim: 0.78, pattern: "scales", barbels: true },
    aspect: 1.2,
  }, // golden arowana
  elite: {
    kind: "fish",
    pal: pal("#fecaca", "#dc2626", "#7f1d1d", "#fb7185", "#fde047", "rgba(244,63,94,.7)"),
    o: { slim: 0.8, pattern: "koi", barbels: true },
    aspect: 1.25,
  }, // crimson dragon koi
  boss: {
    kind: "dragon",
    pal: pal(
      "#5eead4",
      "#0d9488",
      "#134e4a",
      "#2dd4bf",
      "#fde047",
      "rgba(45,212,191,.8)",
      "#fef9c3",
    ),
    aspect: 1.15,
  }, // azure sea dragon
  crate: {
    kind: "fish",
    pal: pal("#fde047", "#dc2626", "#7f1d1d", "#fde68a", "#dc2626", "rgba(248,113,113,.8)"),
  },
});

/* Rocky reef — crustaceans. */
const CRAB_CANNON: Cast = make({
  common: {
    kind: "crab",
    pal: pal("#fde68a", "#d6a85a", "#78521d", "#c2955a", "#f59e0b", "rgba(251,191,36,.5)"),
  }, // sand crab
  uncommon: {
    kind: "crab",
    pal: pal("#7dd3fc", "#2563eb", "#1e3a8a", "#1d4ed8", "#38bdf8", "rgba(59,130,246,.6)"),
  }, // blue crab
  rare: {
    kind: "crab",
    pal: pal("#fdba74", "#ea580c", "#7c2d12", "#c2410c", "#fed7aa", "rgba(249,115,22,.6)"),
    o: { longLegs: true },
  }, // spider crab
  elite: {
    kind: "crab",
    pal: pal("#fca5a5", "#dc2626", "#7f1d1d", "#b91c1c", "#fecaca", "rgba(239,68,68,.65)"),
    o: { lobster: true },
    aspect: 1.15,
  }, // lobster
  boss: {
    kind: "crab",
    pal: pal("#fb923c", "#9a3412", "#431407", "#7c2d12", "#fde047", "rgba(251,146,60,.8)"),
    o: { spiky: true, barnacles: true, glowEyes: true, longLegs: true },
    aspect: 1.1,
  }, // king crab
  crate: {
    kind: "fish",
    pal: pal("#fcd34d", "#f97316", "#7c2d12", "#fed7aa", "#ea580c", "rgba(251,146,60,.8)"),
  },
});

/* Open-ocean predators. */
const SHARK_HUNTER: Cast = make({
  common: {
    kind: "fish",
    pal: pal("#93c5fd", "#1d4ed8", "#172554", "#3b82f6", "#e0f2fe", "rgba(96,165,250,.6)"),
    o: { slim: 0.85, pattern: "stripes" },
  }, // mackerel
  uncommon: {
    kind: "fish",
    pal: pal("#e2e8f0", "#64748b", "#1e293b", "#475569", "#94a3b8", "rgba(148,163,184,.6)"),
    o: { slim: 0.55, pattern: "spots" },
    aspect: 1.2,
  }, // barracuda
  rare: {
    kind: "shark",
    pal: pal("#cbd5e1", "#64748b", "#1e293b", "#475569", "#e2e8f0", "rgba(148,163,184,.6)"),
    o: { hammer: true },
  }, // hammerhead
  elite: {
    kind: "shark",
    pal: pal("#a5b4c4", "#475569", "#0f172a", "#334155", "#1e293b", "rgba(148,163,184,.7)"),
    o: { pattern: "tiger" },
    aspect: 1.1,
  }, // tiger shark
  boss: {
    kind: "shark",
    pal: pal("#94a3b8", "#334155", "#020617", "#1e293b", "#f1f5f9", "rgba(239,68,68,.75)"),
    o: { scars: true, glowEyes: true },
    aspect: 1.15,
  }, // megalodon
  crate: {
    kind: "fish",
    pal: pal("#60a5fa", "#1d4ed8", "#172554", "#bfdbfe", "#1d4ed8", "rgba(96,165,250,.8)"),
  },
});

/* Sunken armada — cephalopods & jellies. */
const OCTOPUS_ARMADA: Cast = make({
  common: {
    kind: "jelly",
    pal: pal("#e9d5ff", "#c084fc", "#7e22ce", "#d8b4fe", "#f0abfc", "rgba(216,180,254,.7)"),
  }, // moon jelly
  uncommon: {
    kind: "squid",
    pal: pal("#fbcfe8", "#ec4899", "#831843", "#f472b6", "#fce7f3", "rgba(244,114,182,.6)"),
  }, // reef squid
  rare: {
    kind: "octopus",
    pal: pal("#fde68a", "#d97706", "#451a03", "#b45309", "#38bdf8", "rgba(56,189,248,.6)"),
    o: { rings: true },
  }, // blue-ringed octopus
  elite: {
    kind: "octopus",
    pal: pal("#fca5a5", "#dc2626", "#450a0a", "#b91c1c", "#fecaca", "rgba(248,113,113,.7)"),
    o: { arms: 8 },
    aspect: 1.1,
  }, // giant red octopus
  boss: {
    kind: "octopus",
    pal: pal("#a78bfa", "#6d28d9", "#1e1b4b", "#4c1d95", "#2dd4bf", "rgba(167,139,250,.85)"),
    o: { spiky: true, glowEyes: true, arms: 8 },
    aspect: 1.2,
  }, // kraken
  crate: {
    kind: "fish",
    pal: pal("#fde047", "#a16207", "#422006", "#fef08a", "#7c3aed", "rgba(167,139,250,.85)"),
  },
});

/* Tropical lagoon. */
const TURTLE_TIDE: Cast = make({
  common: {
    kind: "fish",
    pal: pal("#fb923c", "#ea580c", "#7c2d12", "#fdba74", "#fff7ed", "rgba(251,146,60,.65)"),
    o: { slim: 0.8, wide: 0.75, pattern: "bands", forkTail: false },
  }, // clownfish
  uncommon: {
    kind: "fish",
    pal: pal("#fef3c7", "#d6c46a", "#78601c", "#e7d27a", "#a16207", "rgba(250,204,21,.55)"),
    o: { slim: 1.5, wide: 0.7, pattern: "spots", forkTail: false },
    aspect: 0.8,
  }, // pufferfish
  rare: {
    kind: "ray",
    pal: pal(
      "#7dd3fc",
      "#0369a1",
      "#082f49",
      "#0c4a6e",
      "#e0f2fe",
      "rgba(56,189,248,.6)",
      "#f8fafc",
    ),
  }, // manta ray
  elite: {
    kind: "turtle",
    pal: pal("#bef264", "#4d7c0f", "#1a2e05", "#65a30d", "#d9f99d", "rgba(163,230,53,.65)"),
    aspect: 1.05,
  }, // green sea turtle
  boss: {
    kind: "turtle",
    pal: pal("#5eead4", "#115e59", "#042f2e", "#0f766e", "#fde047", "rgba(45,212,191,.8)"),
    o: { barnacles: true, glowEyes: true },
    aspect: 1.15,
  }, // ancient leatherback
  crate: {
    kind: "fish",
    pal: pal("#5eead4", "#0f766e", "#134e4a", "#99f6e4", "#0f766e", "rgba(45,212,191,.8)"),
  },
});

/* Arctic — cold-water giants. */
const WHALE_WAR: Cast = make({
  common: {
    kind: "fish",
    pal: pal("#cbd5e1", "#64748b", "#1e293b", "#94a3b8", "#475569", "rgba(148,163,184,.6)"),
    o: { slim: 0.9, pattern: "spots" },
  }, // arctic cod
  uncommon: {
    kind: "whale",
    pal: pal("#ffffff", "#e2e8f0", "#94a3b8", "#e2e8f0", "#cbd5e1", "rgba(226,232,240,.65)"),
    o: { beluga: true },
  }, // beluga
  rare: {
    kind: "whale",
    pal: pal("#cbd5e1", "#64748b", "#334155", "#94a3b8", "#334155", "rgba(148,163,184,.6)"),
    o: { tusk: true, pattern: "spots" },
    aspect: 1.1,
  }, // narwhal
  elite: {
    kind: "whale",
    pal: pal("#475569", "#1e293b", "#020617", "#0f172a", "#f8fafc", "rgba(148,163,184,.7)"),
    o: { orca: true },
    aspect: 1.15,
  }, // orca
  boss: {
    kind: "whale",
    pal: pal("#7dd3fc", "#2563eb", "#172554", "#1d4ed8", "#bfdbfe", "rgba(56,189,248,.85)"),
    o: { pattern: "spots", glowEyes: true },
    aspect: 1.25,
  }, // blue whale
  crate: {
    kind: "fish",
    pal: pal("#bae6fd", "#0284c7", "#082f49", "#e0f2fe", "#0284c7", "rgba(125,211,252,.85)"),
  },
});

export const FAUNA: Record<FishingGameKey, Cast> = {
  "deep-bass": DEEP_BASS,
  "dragon-fisher": DRAGON_FISHER,
  "crab-cannon": CRAB_CANNON,
  "shark-hunter": SHARK_HUNTER,
  "octopus-armada": OCTOPUS_ARMADA,
  "turtle-tide": TURTLE_TIDE,
  "whale-war": WHALE_WAR,
};

// Distinct silhouettes for each game's treasure pickup, beyond palette changes.
DEEP_BASS.crate.treasure = "lure";
DRAGON_FISHER.crate.treasure = "pearl";
CRAB_CANNON.crate.treasure = "coral";
SHARK_HUNTER.crate.treasure = "anchor";
TURTLE_TIDE.crate.treasure = "shell";
WHALE_WAR.crate.treasure = "ice";
// Octopus Armada keeps the sunken wooden treasure chest.
