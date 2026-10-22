/**
 * Lazy game engine registry for GamePlayModal.
 * Only the selected gameId is loaded; unknown IDs fall back to Coming Soon.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { isThumbnailOnlyGame } from "@/lib/playable-games";
import { REALMS_GAME_IDS } from "@/lib/realms";

export type GamePlayProps = {
  gameId?: string;
  gameName?: string;
};

type LazyGame = LazyExoticComponent<ComponentType<GamePlayProps>>;

function lazyNamed<K extends string>(
  loader: () => Promise<Record<K, ComponentType<GamePlayProps>>>,
  exportName: K,
): LazyGame {
  return lazy(async () => {
    const mod = await loader();
    const Comp = mod[exportName];
    if (!Comp) throw new Error(`Missing export ${exportName}`);
    return { default: Comp };
  });
}

/** Canonical gameId → lazy shell. */
const GAME_LAZY: Record<string, LazyGame> = {
  "golden-panther": lazyNamed(() => import("./GoldenPantherSlot"), "GoldenPantherSlot"),
  "wild-panther": lazyNamed(() => import("./WildPantherSlot"), "WildPantherSlot"),
  "jade-jaguar": lazyNamed(() => import("./JadeJaguarSlot"), "JadeJaguarSlot"),
  "ember-tiger": lazyNamed(() => import("./EmberTigerSlot"), "EmberTigerSlot"),
  "lotus-lynx": lazyNamed(() => import("./LotusLynxSlot"), "LotusLynxSlot"),
  "coral-cobra": lazyNamed(() => import("./CoralCobraSlot"), "CoralCobraSlot"),
  "frost-fox": lazyNamed(() => import("./FrostFoxSlot"), "FrostFoxSlot"),
  "solar-serpent": lazyNamed(() => import("./SolarSerpentSlot"), "SolarSerpentSlot"),
  "honey-hive": lazyNamed(() => import("./HoneyHiveSlot"), "HoneyHiveSlot"),
  "midnight-owl": lazyNamed(() => import("./MidnightOwlSlot"), "MidnightOwlSlot"),
  "ruby-raven": lazyNamed(() => import("./RubyRavenSlot"), "RubyRavenSlot"),
  "lucky-neko": lazyNamed(() => import("./LuckyNekoSlot"), "LuckyNekoSlot"),
  "fortune-tiger": lazyNamed(() => import("./FortuneTigerSlot"), "FortuneTigerSlot"),
  "fortune-ox": lazyNamed(() => import("./FortuneOxSlot"), "FortuneOxSlot"),
  "fortune-rabbit": lazyNamed(() => import("./FortuneRabbitSlot"), "FortuneRabbitSlot"),
  "fortune-mouse": lazyNamed(() => import("./FortuneMouseSlot"), "FortuneMouseSlot"),
  "prosperity-lion": lazyNamed(() => import("./ProsperityLionSlot"), "ProsperityLionSlot"),
  "buffalo-reign": lazyNamed(() => import("./BuffaloReignSlot"), "BuffaloReignSlot"),
  "safari-gold": lazyNamed(() => import("./SafariGoldSlot"), "SafariGoldSlot"),
  "cleopatra-gold": lazyNamed(() => import("./CleopatraGoldSlot"), "CleopatraGoldSlot"),
  "maya-gold": lazyNamed(() => import("./MayaGoldSlot"), "MayaGoldSlot"),
  "temple-rush": lazyNamed(() => import("./TempleRushSlot"), "TempleRushSlot"),
  "pharaoh-fire": lazyNamed(() => import("./PharaohFireSlot"), "PharaohFireSlot"),
  "desert-riches": lazyNamed(() => import("./DesertRichesSlot"), "DesertRichesSlot"),
  "gate-of-ra": lazyNamed(() => import("./GateOfRaSlot"), "GateOfRaSlot"),
  "zeus-strike": lazyNamed(() => import("./ZeusStrikeSlot"), "ZeusStrikeSlot"),
  "thor-thunder": lazyNamed(() => import("./ThorThunderSlot"), "ThorThunderSlot"),
  "godly-gates": lazyNamed(() => import("./GodlyGatesSlot"), "GodlyGatesSlot"),
  "olympus-wrath": lazyNamed(() => import("./OlympusWrathSlot"), "OlympusWrathSlot"),
  "enchanted-grove": lazyNamed(() => import("./EnchantedGroveSlot"), "EnchantedGroveSlot"),
  "fire-spike": lazyNamed(() => import("./FireSpikeSlot"), "FireSpikeSlot"),
  "coin-volcano": lazyNamed(() => import("./CoinVolcanoSlot"), "CoinVolcanoSlot"),
  // Cards & fishing
  "ace-high": lazyNamed(() => import("./AceHighSlot"), "AceHighSlot"),
  "color-game": lazyNamed(() => import("./games/color-game"), "ColorGameTable"),
  "tongits-arena": lazyNamed(() => import("./games/tongits-arena"), "TongitsArenaTable"),
  "lucky-drop": lazyNamed(() => import("./games/lucky-drop"), "LuckyDropTable"),
  "color-game-pro": lazyNamed(() => import("./games/color-game-pro"), "ColorGameProTable"),
  "lucky-nine-plus": lazyNamed(() => import("./games/lucky-nine-plus"), "LuckyNinePlusTable"),
  "drop-deluxe": lazyNamed(() => import("./games/drop-deluxe"), "DropDeluxeTable"),
  "poker-showdown": lazyNamed(() => import("./games/poker-showdown"), "PokerShowdownTable"),
  "deep-bass": lazyNamed(() => import("./games/deep-bass"), "DeepBassGame"),
  "dragon-fisher": lazyNamed(() => import("./games/dragon-fisher"), "DragonFisherGame"),
  "crab-cannon": lazyNamed(() => import("./games/crab-cannon"), "CrabCannonGame"),
  "shark-hunter": lazyNamed(() => import("./games/shark-hunter"), "SharkHunterGame"),
  "octopus-armada": lazyNamed(() => import("./games/octopus-armada"), "OctopusArmadaGame"),
  "turtle-tide": lazyNamed(() => import("./games/turtle-tide"), "TurtleTideGame"),
  "whale-war": lazyNamed(() => import("./games/whale-war"), "WhaleWarGame"),
  baccarat: lazyNamed(() => import("./games/baccarat"), "BaccaratTable"),
  lucky9: lazyNamed(() => import("./games/lucky9"), "Lucky9Table"),
  threecardpoker: lazyNamed(() => import("./games/threecardpoker"), "ThreeCardPokerTable"),
};

/** Realms family — one shared shell; the gameId prop selects the title. */
const REALMS_LAZY = lazyNamed(() => import("./RealmsSlot"), "RealmsSlot");
for (const id of REALMS_GAME_IDS) {
  if (GAME_LAZY[id]) throw new Error(`Realms id collides with an existing game: ${id}`);
  GAME_LAZY[id] = REALMS_LAZY;
}

/**
 * Returns a lazy game component, or null for Coming Soon / thumbnail-only.
 * Synchronous lookup — no Suspense flash for unknown IDs.
 */
export function resolveLazyGame(gameId: string): LazyGame | null {
  if (isThumbnailOnlyGame(gameId)) return null;
  return GAME_LAZY[gameId] ?? null;
}

export function isRegisteredPlayableGame(gameId: string): boolean {
  return resolveLazyGame(gameId) != null;
}
