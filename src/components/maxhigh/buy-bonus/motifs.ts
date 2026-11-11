/**
 * Buy Bonus visual motifs. A motif is the *kind of world* a game lives in; it decides the ornament tile, the ambient particles and the
 * title typography. Colours, artwork and the featured symbol always come from the game itself (see ./theme.ts), so two games that share a
 * motif still look different.
 */
import type { RealmsWorld } from "@/lib/realms/catalog";

export type BuyBonusMotifId =
  | "jungle"
  | "olympus"
  | "egypt"
  | "fire"
  | "asia"
  | "frost"
  | "ocean"
  | "temple"
  | "night"
  | "storm"
  | "savanna"
  | "grove"
  | "celestial"
  | "arcane"
  | "clockwork"
  | "cosmos"
  | "spirit";

export type ParticleKind = "rise" | "fall" | "twinkle" | "drift" | "flash";

export type BuyBonusMotif = {
  id: BuyBonusMotifId;
  /** Ambient particle behaviour (CSS only). */
  particle: ParticleKind;
  /** Colour of the particles: the game's accent, its soft highlight, or a fixed ember/ice tone that reads on its own. */
  particleTone: "accent" | "soft" | "ember" | "ice";
  /** Title typeface stack: classical worlds use a serif, the rest a heavy sans. */
  titleFont: "classic" | "bold";
  /** Corner/edge ornament shape of the frame. */
  frame: "arch" | "bevel" | "round" | "notch";
};

export const BUY_BONUS_MOTIFS: Record<BuyBonusMotifId, BuyBonusMotif> = {
  jungle: {
    id: "jungle",
    particle: "drift",
    particleTone: "soft",
    titleFont: "bold",
    frame: "round",
  },
  olympus: {
    id: "olympus",
    particle: "flash",
    particleTone: "soft",
    titleFont: "classic",
    frame: "arch",
  },
  egypt: {
    id: "egypt",
    particle: "drift",
    particleTone: "soft",
    titleFont: "classic",
    frame: "notch",
  },
  fire: { id: "fire", particle: "rise", particleTone: "ember", titleFont: "bold", frame: "bevel" },
  asia: { id: "asia", particle: "drift", particleTone: "soft", titleFont: "bold", frame: "arch" },
  frost: { id: "frost", particle: "fall", particleTone: "ice", titleFont: "bold", frame: "bevel" },
  ocean: { id: "ocean", particle: "rise", particleTone: "soft", titleFont: "bold", frame: "round" },
  temple: {
    id: "temple",
    particle: "drift",
    particleTone: "accent",
    titleFont: "classic",
    frame: "notch",
  },
  night: {
    id: "night",
    particle: "twinkle",
    particleTone: "soft",
    titleFont: "classic",
    frame: "arch",
  },
  storm: { id: "storm", particle: "flash", particleTone: "ice", titleFont: "bold", frame: "bevel" },
  savanna: {
    id: "savanna",
    particle: "drift",
    particleTone: "accent",
    titleFont: "bold",
    frame: "notch",
  },
  grove: {
    id: "grove",
    particle: "drift",
    particleTone: "soft",
    titleFont: "bold",
    frame: "round",
  },
  celestial: {
    id: "celestial",
    particle: "twinkle",
    particleTone: "soft",
    titleFont: "classic",
    frame: "arch",
  },
  arcane: {
    id: "arcane",
    particle: "twinkle",
    particleTone: "accent",
    titleFont: "classic",
    frame: "bevel",
  },
  clockwork: {
    id: "clockwork",
    particle: "drift",
    particleTone: "accent",
    titleFont: "bold",
    frame: "notch",
  },
  cosmos: {
    id: "cosmos",
    particle: "twinkle",
    particleTone: "soft",
    titleFont: "bold",
    frame: "round",
  },
  spirit: {
    id: "spirit",
    particle: "drift",
    particleTone: "soft",
    titleFont: "bold",
    frame: "arch",
  },
};

/** The 30 hand-built games. Keys are the game ids used in the lobby. */
export const BESPOKE_GAME_MOTIF: Record<string, BuyBonusMotifId> = {
  "wild-panther": "jungle",
  "golden-panther": "jungle",
  "jade-jaguar": "jungle",
  "enchanted-grove": "grove",
  "honey-hive": "grove",
  "zeus-strike": "olympus",
  "olympus-wrath": "olympus",
  "godly-gates": "olympus",
  "thor-thunder": "storm",
  "gate-of-ra": "egypt",
  "cleopatra-gold": "egypt",
  "pharaoh-fire": "egypt",
  "desert-riches": "egypt",
  "ember-tiger": "fire",
  "solar-serpent": "fire",
  "fortune-mouse": "asia",
  "fortune-ox": "asia",
  "fortune-rabbit": "asia",
  "fortune-tiger": "asia",
  "lucky-neko": "asia",
  "lotus-lynx": "asia",
  "prosperity-lion": "asia",
  "frost-fox": "frost",
  "coral-cobra": "ocean",
  "maya-gold": "temple",
  "temple-rush": "temple",
  "midnight-owl": "night",
  "ruby-raven": "night",
  "safari-gold": "savanna",
  "buffalo-reign": "savanna",
};

export const BESPOKE_GAME_IDS = Object.keys(BESPOKE_GAME_MOTIF);

/** Realms: one motif per world (each world holds five titles). */
export const REALMS_WORLD_MOTIF: Record<RealmsWorld, BuyBonusMotifId> = {
  ocean: "ocean",
  celestial: "celestial",
  volcanic: "fire",
  frost: "frost",
  jungle: "jungle",
  ancient: "temple",
  clockwork: "clockwork",
  arcane: "arcane",
  cosmos: "cosmos",
  spirit: "spirit",
};
