import type { CSSProperties } from "react";
import { REALMS_GAMES } from "@/lib/realms/catalog";
import { realmsAssetBase } from "@/components/maxhigh/realms/theme";

/** Audited client-active slots, from CODEX_SPIN_INVENTORY.json (not a runtime access policy). */
type Treatment = {
  title: string;
  radius: string;
  contour: string;
  engraving: string;
  finish: "metal" | "glass" | "wood" | "silk" | "stone";
  angle: number;
};

// Each contour is drawn in a 120×120 coordinate space. The central area stays clear
// for the existing action label; original p3 symbol artwork supplies the title's crest.
export const GAME_SPIN_TREATMENTS = {
  // Batch 1: the star keep, volcanic regalia and northern relics.
  "constellation-keep": {
    title: "Orion's star keep",
    radius: "24% 24% 40% 40%",
    contour: "M12 28L28 28V12L44 20L60 8L76 20L92 12V28H108V78L60 112L12 78Z",
    engraving: "M20 42L30 35L38 43M82 43L90 35L100 42M28 84L36 89M84 89L92 84M60 12V22",
    finish: "metal",
    angle: 135,
  },
  "cinder-crown": {
    title: "Molten coronation",
    radius: "30% 30% 18% 18%",
    contour: "M10 38L16 14L38 30L60 8L82 30L104 14L110 38L100 108H20Z",
    engraving: "M22 46H98M26 98H94M16 36L23 44M104 36L97 44M56 18L60 24L64 18",
    finish: "metal",
    angle: 170,
  },
  "magma-anvil": {
    title: "Hammered forge plate",
    radius: "12%",
    contour: "M26 8H94L112 26V94L94 112H26L8 94V26Z",
    engraving: "M15 37L24 31L20 47M100 73L96 89L106 84M29 14V22M91 98V106M14 60H20M100 60H106",
    finish: "metal",
    angle: 25,
  },
  "obsidian-oracle": {
    title: "Obsidian seer's eye",
    radius: "50% 12% 50% 12%",
    contour: "M8 60Q34 8 60 12Q90 8 112 60Q88 112 60 108Q32 112 8 60Z",
    engraving: "M16 60Q30 39 36 34M84 86Q102 68 104 60M51 19L60 28L69 19M51 101L60 92L69 101",
    finish: "glass",
    angle: 145,
  },
  "salamander-sun": {
    title: "Salamander solar seal",
    radius: "43%",
    contour:
      "M60 6L70 16L84 12L90 26L106 30L104 46L114 60L104 74L106 90L90 94L84 108L70 104L60 114L50 104L36 108L30 94L14 90L16 74L6 60L16 46L14 30L30 26L36 12L50 16Z",
    engraving: "M22 48L29 55L22 62M98 58L91 65L98 72M48 21L60 26L72 21M48 99L60 94L72 99",
    finish: "metal",
    angle: 35,
  },
  "ashfall-citadel": {
    title: "Ashen fortress gate",
    radius: "8% 8% 20% 20%",
    contour: "M10 110V26H18V10H34V26H50V10H70V26H86V10H102V26H110V110Z",
    engraving: "M18 40H30M90 40H102M18 88H30M90 88H102M22 100H98M28 30V36M92 30V36",
    finish: "stone",
    angle: 180,
  },
  "glacier-glyphs": {
    title: "Glacial rune tablet",
    radius: "14% 34% 14% 34%",
    contour: "M30 8H82L110 36V86L86 112H34L10 88V34Z",
    engraving: "M22 42V62L30 54L22 46M98 58V78L90 70L98 62M43 18L51 26M69 94L77 102M42 103H54",
    finish: "glass",
    angle: 115,
  },
  "northwind-narwhal": {
    title: "Ivory tusk compass",
    radius: "50% 50% 34% 34%",
    contour: "M60 8C94 8 110 30 110 62C110 94 88 112 60 112C32 112 10 94 10 62C10 30 26 8 60 8Z",
    engraving: "M18 64Q25 80 32 80M88 80Q95 80 102 64M51 19L60 12L69 19M60 96V106M51 102H69",
    finish: "glass",
    angle: 70,
  },
  "snowglobe-sorcery": {
    title: "Enchanted snowglass",
    radius: "48% 48% 20% 20%",
    contour: "M24 92C-4 52 14 8 60 8C106 8 124 52 96 92L104 110H16Z",
    engraving: "M30 98H90M27 104H93M23 35L27 39M93 29L97 33M18 58H24M96 58H102",
    finish: "glass",
    angle: 160,
  },
  "frostbound-fjord": {
    title: "Rime-bound drakkar shield",
    radius: "22% 22% 48% 48%",
    contour: "M12 14L60 8L108 14V66Q102 96 60 112Q18 96 12 66Z",
    engraving: "M21 29L30 36V50M99 29L90 36V50M29 80L38 89M82 89L91 80M60 17V25",
    finish: "wood",
    angle: 90,
  },
  // Batch 2: crystals, botanicals and ancient courts.
  "polar-prism": {
    title: "Auroral cut crystal",
    radius: "24% 10%",
    contour: "M35 8H85L112 38V82L85 112H35L8 82V38Z",
    engraving:
      "M35 8L43 25M85 8L77 25M8 38L26 43M112 38L94 43M35 112L43 95M85 112L77 95M8 82L26 77M112 82L94 77",
    finish: "glass",
    angle: 45,
  },
  "orchid-oasis": {
    title: "Orchid petal clasp",
    radius: "50% 16% 50% 16%",
    contour:
      "M60 14Q82 -1 96 24Q123 34 104 60Q123 86 96 96Q82 121 60 106Q38 121 24 96Q-3 86 16 60Q-3 34 24 24Q38 -1 60 14Z",
    engraving: "M23 40Q31 43 33 50M87 70Q89 77 97 80M41 24Q48 27 50 33M70 87Q73 92 80 96",
    finish: "silk",
    angle: 125,
  },
  "firefly-hollow": {
    title: "Hollow lantern",
    radius: "42% 42% 25% 25%",
    contour: "M38 10H82V18Q108 24 108 60V92L90 110H30L12 92V60Q12 24 38 18Z",
    engraving: "M19 55L23 59M97 45L101 49M31 95L35 99M82 23L86 27M47 16H73M24 88H30M90 88H96",
    finish: "wood",
    angle: 95,
  },
  "canopy-kingdom": {
    title: "Emerald canopy crest",
    radius: "35% 35% 15% 15%",
    contour: "M14 44Q4 20 30 22Q37 0 60 14Q83 0 90 22Q116 20 106 44L106 108H14Z",
    engraving: "M20 49Q27 37 33 36M87 36Q94 37 100 49M23 88L28 96M97 88L92 96M38 104H82",
    finish: "wood",
    angle: 50,
  },
  "monsoon-grove": {
    title: "Rain-carved riverstone",
    radius: "44% 20% 44% 20%",
    contour: "M34 10Q68 2 94 18L110 40V86L86 110H34L10 86V38Z",
    engraving: "M24 32L20 42M33 24L29 34M91 86L87 96M100 78L96 88M35 101Q60 91 85 101",
    finish: "stone",
    angle: 140,
  },
  "hummingbird-haven": {
    title: "Ruby hummingbird bloom",
    radius: "18% 50% 18% 50%",
    contour:
      "M60 16Q88 -2 98 28Q120 42 104 60Q120 78 98 92Q88 122 60 104Q32 122 22 92Q0 78 16 60Q0 42 22 28Q32 -2 60 16Z",
    engraving: "M23 47L34 40L28 53M97 73L86 80L92 67M46 22Q60 29 74 22M46 98Q60 91 74 98",
    finish: "silk",
    angle: 25,
  },
  "babylon-gardens": {
    title: "Hanging garden terraces",
    radius: "12% 12% 28% 28%",
    contour: "M10 110V52H20V32H34V18H48V8H72V18H86V32H100V52H110V110Z",
    engraving: "M15 64H24M96 64H105M15 82H24M96 82H105M24 102H96M40 28H48M72 28H80",
    finish: "stone",
    angle: 180,
  },
  "persian-peacock": {
    title: "Turquoise peacock fan",
    radius: "48% 48% 16% 16%",
    contour: "M18 110L8 48Q9 18 28 24Q34 0 48 16Q60 0 72 16Q86 0 92 24Q111 18 112 48L102 110Z",
    engraving:
      "M20 42Q25 33 30 42Q25 51 20 42M90 42Q95 33 100 42Q95 51 90 42M36 23L40 32M80 32L84 23M26 102H94",
    finish: "metal",
    angle: 100,
  },
  "celtic-clover-court": {
    title: "Clover court knotwork",
    radius: "38%",
    contour:
      "M60 18C24 -8 -8 24 18 60C-8 96 24 128 60 102C96 128 128 96 102 60C128 24 96 -8 60 18Z",
    engraving: "M24 40Q16 20 36 24M80 24Q100 16 96 36M96 80Q104 100 84 96M40 96Q20 104 24 84",
    finish: "metal",
    angle: 140,
  },
  "shogun-sakura": {
    title: "Lacquered sakura war fan",
    radius: "42% 42% 12% 12%",
    contour: "M8 42Q60 -14 112 42L94 108H26Z",
    engraving:
      "M18 44L30 53M34 30L41 44M86 30L79 44M102 44L90 53M34 100H86M49 18L52 30M71 18L68 30",
    finish: "silk",
    angle: 90,
  },
  // Batch 3: Norse wood, brass instruments and arcane craft.
  "longship-raiders": {
    title: "Bronze longship boss",
    radius: "50%",
    contour: "M60 8A52 52 0 1 1 59.9 8Z",
    engraving:
      "M18 60H28M92 60H102M60 18V28M60 92V102M30 30L37 37M83 83L90 90M30 90L37 83M83 37L90 30",
    finish: "wood",
    angle: 90,
  },
  "clockwork-cache": {
    title: "Vault winding mechanism",
    radius: "20%",
    contour: "M26 8H94V16H104V26H112V94H104V104H94V112H26V104H16V94H8V26H16V16H26Z",
    engraving: "M24 38V24H38M82 24H96V38M96 82V96H82M38 96H24V82M17 56V64M103 56V64",
    finish: "metal",
    angle: 10,
  },
  "brass-zeppelin": {
    title: "Airship navigation porthole",
    radius: "50% 50% 30% 30%",
    contour: "M60 8Q108 8 112 52V80L92 104L60 112L28 104L8 80V52Q12 8 60 8Z",
    engraving: "M19 51Q24 25 43 23M77 23Q96 25 101 51M18 77L26 84M94 84L102 77M48 103H72",
    finish: "metal",
    angle: 125,
  },
  "tesla-tower": {
    title: "Induction coil terminal",
    radius: "16% 16% 8% 8%",
    contour: "M24 8H96L112 24V96L96 112H24L8 96V24Z",
    engraving: "M16 40H26L20 48H28M104 72H94L100 80H92M36 17H84M36 103H84M16 56H22M98 56H104",
    finish: "metal",
    angle: 170,
  },
  "gearspring-gala": {
    title: "Rose-gold musical watch",
    radius: "50% 50% 38% 38%",
    contour: "M44 8H76V16Q110 24 110 62Q110 110 60 112Q10 110 10 62Q10 24 44 16Z",
    engraving:
      "M50 15H70M22 50V61M98 50V61M28 90L34 96M86 96L92 90M48 102H72M20 43L26 39M94 39L100 43",
    finish: "metal",
    angle: 40,
  },
  "steamforge-express": {
    title: "Locomotive pressure valve",
    radius: "28% 28% 10% 10%",
    contour: "M26 8H94V18L108 32V94L98 112H22L12 94V32L26 18Z",
    engraving: "M20 42H28M92 42H100M20 82H28M92 82H100M29 102H91M43 17H77M17 90L26 96M94 96L103 90",
    finish: "metal",
    angle: 180,
  },
  "alchemist-atelier": {
    title: "Alchemist's emerald flask",
    radius: "38% 38% 24% 24%",
    contour: "M42 8H78V22L102 50Q122 94 94 110H26Q-2 94 18 50L42 22Z",
    engraving: "M48 17H72M25 84Q35 96 46 99M94 67L98 75M23 64L27 58M34 103H86M18 75H25M95 88H102",
    finish: "glass",
    angle: 35,
  },
  "crystal-grimoire": {
    title: "Amethyst book clasp",
    radius: "8% 22% 22% 8%",
    contour: "M10 12Q34 5 60 16Q86 5 110 12V104Q84 98 60 112Q36 98 10 104Z",
    engraving: "M18 22L25 20V35M95 20L102 22V35M18 86V95L28 93M92 93L102 95V86M60 20V27M60 98V104",
    finish: "glass",
    angle: 115,
  },
  "tarot-twilight": {
    title: "Twilight tarot arcana",
    radius: "12%",
    contour: "M24 8H96Q110 8 110 22V98Q110 112 96 112H24Q10 112 10 98V22Q10 8 24 8Z",
    engraving:
      "M21 36V21H36M84 21H99V36M21 84V99H36M84 99H99V84M53 18L60 25L67 18M53 102L60 95L67 102",
    finish: "silk",
    angle: 145,
  },
  "potion-parlor": {
    title: "Rose elixir stopper",
    radius: "42% 42% 28% 28%",
    contour: "M40 8H80V24Q104 30 108 58V90Q108 112 86 112H34Q12 112 12 90V58Q16 30 40 24Z",
    engraving:
      "M46 17H74M22 61Q26 43 33 41M95 78L100 69M27 100Q60 106 93 100M20 81L24 87M91 39L96 45",
    finish: "glass",
    angle: 70,
  },
  // Batch 4: enchanted books, cosmic equipment and spirit emblems.
  "hexbound-library": {
    title: "Hexbound tome seal",
    radius: "8% 26% 8% 26%",
    contour: "M24 8H96L112 24V96L96 112H24L8 96V24Z",
    engraving:
      "M20 28V44M20 76V92M100 28V44M100 76V92M32 16H46M74 16H88M32 104H46M74 104H88M12 60H28M92 60H108",
    finish: "wood",
    angle: 20,
  },
  "cosmic-koi": {
    title: "Twin-current koi medallion",
    radius: "50% 30% 50% 30%",
    contour: "M60 8C110 0 122 60 104 86C86 120 30 124 14 82C-4 40 20 14 60 8Z",
    engraving: "M20 47Q24 26 45 22M75 98Q96 94 100 73M19 69L24 79L32 83M88 37L96 41L101 51",
    finish: "glass",
    angle: 140,
  },
  "saturn-rings": {
    title: "Saturn orbital dial",
    radius: "50%",
    contour: "M60 12A48 48 0 1 1 59.9 12Z",
    engraving:
      "M12 84Q4 70 29 48M91 36Q116 24 112 42M12 84Q34 101 100 48M20 92Q50 103 108 56M48 18L44 24M82 96L76 102",
    finish: "metal",
    angle: 55,
  },
  "rocket-rendezvous": {
    title: "Rocket mission patch",
    radius: "48% 48% 20% 20%",
    contour: "M60 8Q96 12 102 50L112 78L100 108H20L8 78L18 50Q24 12 60 8Z",
    engraving: "M22 62L16 79L26 87M98 62L104 79L94 87M38 103L42 94M78 94L82 103M49 20L60 14L71 20",
    finish: "metal",
    angle: 150,
  },
  "asteroid-miners": {
    title: "Star-ore locking collar",
    radius: "22% 14% 28% 10%",
    contour: "M28 8L82 12L110 34L106 86L88 110L30 112L8 86L12 32Z",
    engraving:
      "M23 26L32 18L44 20M91 92L83 102L73 100M18 66L26 58L21 51M98 43L92 48L100 57M40 103L49 98",
    finish: "stone",
    angle: 30,
  },
  "nebula-nomads": {
    title: "Nomad astral compass",
    radius: "34% 34% 46% 46%",
    contour:
      "M60 6L80 18L100 20L104 42L114 60L102 80L100 100L78 104L60 114L40 102L20 100L16 78L6 60L18 40L20 20L42 16Z",
    engraving: "M24 41L32 34M86 88L94 81M47 21L60 28L73 21M47 99L60 92L73 99M17 60H26M94 60H103",
    finish: "silk",
    angle: 120,
  },
  "stag-spirit-glade": {
    title: "Spirit antler talisman",
    radius: "35% 35% 46% 46%",
    contour: "M20 18L38 30L60 10L82 30L100 18L108 52L102 84L60 112L18 84L12 52Z",
    engraving:
      "M22 32L28 45L22 55M98 32L92 45L98 55M31 88L40 94M80 94L89 88M60 19V27M19 67L28 71M92 71L101 67",
    finish: "wood",
    angle: 90,
  },
  "tortoise-treasury": {
    title: "Jade treasury shell",
    radius: "42% 42% 34% 34%",
    contour: "M34 12L60 6L86 12L108 38L114 66L100 94L80 110H40L20 94L6 66L12 38Z",
    engraving:
      "M34 12L40 28M86 12L80 28M12 38L27 45M108 38L93 45M20 94L32 84M100 94L88 84M40 110L45 96M80 110L75 96",
    finish: "stone",
    angle: 130,
  },
  "crane-pavilion": {
    title: "Vermilion pavilion seal",
    radius: "18% 18% 36% 36%",
    contour: "M8 30L28 22L60 8L92 22L112 30L104 42V102L60 112L16 102V42Z",
    engraving:
      "M18 32L60 18L102 32M24 45V58M96 45V58M24 84V95M96 84V95M37 103H83M16 37H29M91 37H104",
    finish: "silk",
    angle: 170,
  },
  "thunderbird-totem": {
    title: "Storm feather totem",
    radius: "12% 12% 42% 42%",
    contour: "M8 18L40 26L60 8L80 26L112 18L104 60L94 92L60 112L26 92L16 60Z",
    engraving:
      "M16 30L30 34L22 42L35 46M104 30L90 34L98 42L85 46M28 83L38 88L34 95M92 83L82 88L86 95M60 17V27",
    finish: "wood",
    angle: 105,
  },
  // Final eligible slot: nine other active titles are cards/fishing, intentionally excluded.
  "monarch-meadow": {
    title: "Monarch wing brooch",
    radius: "42% 42% 34% 34%",
    contour:
      "M60 28Q24 -4 10 22Q0 52 26 62Q2 88 24 108Q44 120 60 98Q76 120 96 108Q118 88 94 62Q120 52 110 22Q96 -4 60 28Z",
    engraving:
      "M19 30Q25 20 36 26M84 26Q95 20 101 30M24 89Q28 101 39 99M81 99Q92 101 96 89M16 48L23 52M97 52L104 48",
    finish: "silk",
    angle: 35,
  },
} as const satisfies Record<string, Treatment>;

export type SpinGameId = keyof typeof GAME_SPIN_TREATMENTS;

export function gameSpinThemeStyle(gameId: string): CSSProperties {
  const treatment: Treatment | undefined = (GAME_SPIN_TREATMENTS as Record<string, Treatment>)[
    gameId
  ];
  const game = REALMS_GAMES.find((item) => item.id === gameId);
  if (!treatment || !game) return {};
  const [accent, , soft, deep] = game.palette;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" preserveAspectRatio="none"><path d="${treatment.contour}" fill="${deep}" stroke="${accent}" stroke-width="3"/><path d="${treatment.contour}" fill="none" stroke="${soft}" stroke-width=".7" transform="translate(5 5) scale(.9167)"/><path d="${treatment.engraving}" fill="none" stroke="${soft}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return {
    "--spin-frame": `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    "--spin-crest": `url("${realmsAssetBase(gameId)}/p3.webp?v=1")`,
    "--spin-accent": accent,
    "--spin-soft": soft,
    "--spin-deep": deep,
    "--spin-radius": treatment.radius,
    "--spin-angle": `${treatment.angle}deg`,
  } as CSSProperties;
}

export function gameSpinTreatment(gameId: string) {
  return (GAME_SPIN_TREATMENTS as Record<string, Treatment>)[gameId];
}
