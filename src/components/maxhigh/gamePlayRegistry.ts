/**
 * Lazy game engine registry for GamePlayModal.
 * Only the selected gameId is loaded; unknown / thumbnail-only IDs stay on Coming Soon.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { isThumbnailOnlyGame } from "@/lib/playable-games";

export type GamePlayProps = {
  gameId?: string;
  gameName?: string;
};

type LazyGame = LazyExoticComponent<ComponentType<GamePlayProps>>;

function lazyNamed(
  loader: () => Promise<Record<string, ComponentType<GamePlayProps>>>,
  exportName: string,
): LazyGame {
  return lazy(async () => {
    const mod = await loader();
    const Comp = mod[exportName];
    if (!Comp) throw new Error(`Missing export ${exportName}`);
    return { default: Comp };
  });
}

/** Canonical gameId → lazy shell. Aliases resolved in resolveLazyGame. */
const GAME_LAZY: Record<string, LazyGame> = {
  "candy-peak": lazyNamed(() => import("./CandyPeakSlot"), "CandyPeakSlot"),
  "sugar-surge": lazyNamed(() => import("./SugarSurgeSlot"), "SugarSurgeSlot"),
  "boracay-bounce": lazyNamed(() => import("./BoracayBounceSlot"), "BoracayBounceSlot"),
  "godly-gates": lazyNamed(() => import("./GodlyGatesSlot"), "GodlyGatesSlot"),
  "olympus-wrath": lazyNamed(() => import("./OlympusWrathSlot"), "OlympusWrathSlot"),
  "enchanted-grove": lazyNamed(() => import("./EnchantedGroveSlot"), "EnchantedGroveSlot"),
  "golden-panther": lazyNamed(() => import("./GoldenPantherSlot"), "GoldenPantherSlot"),
  "aztec-treasure": lazyNamed(() => import("./AztecTreasureSlot"), "AztecTreasureSlot"),
  "pirate-plunder": lazyNamed(() => import("./PiratePlunderSlot"), "PiratePlunderSlot"),
  "mermaid-riches": lazyNamed(() => import("./MermaidRichesSlot"), "MermaidRichesSlot"),
  "chinese-new-year": lazyNamed(() => import("./ChineseNewYearSlot"), "ChineseNewYearSlot"),
  "fiesta-fireworks": lazyNamed(() => import("./FiestaFireworksSlot"), "FiestaFireworksSlot"),
  "mahjong-ways": lazyNamed(() => import("./MahjongWaysSlot"), "MahjongWaysSlot"),
  "mahjong-ways-2": lazyNamed(() => import("./MahjongWays2Slot"), "MahjongWays2Slot"),
  "dragon-phoenix": lazyNamed(() => import("./DragonPhoenixSlot"), "DragonPhoenixSlot"),
  "starlight-ace": lazyNamed(() => import("./StarlightAceSlot"), "StarlightAceSlot"),
  "manila-nights": lazyNamed(() => import("./ManilaNightsSlot"), "ManilaNightsSlot"),
  "super-ace": lazyNamed(() => import("./SuperAceSlot"), "SuperAceSlot"),
  "mega-ace": lazyNamed(() => import("./MegaAceSlot"), "MegaAceSlot"),
  "frontier-gold": lazyNamed(() => import("./FrontierGoldSlot"), "FrontierGoldSlot"),
  "dust-dollars": lazyNamed(() => import("./DustDollarsSlot"), "DustDollarsSlot"),
  "gold-mine": lazyNamed(() => import("./GoldMineSlot"), "GoldMineSlot"),
  "jeepney-jackpot": lazyNamed(() => import("./JeepneyJackpotSlot"), "JeepneyJackpotSlot"),
  "buffalo-reign": lazyNamed(() => import("./WildFrontierStampedeSlot"), "WildFrontierStampedeSlot"),
  "cleopatra-gold": lazyNamed(() => import("./CleopatraGoldSlot"), "CleopatraGoldSlot"),
  "carabao-charge": lazyNamed(() => import("./CarabaoChargeSlot"), "CarabaoChargeSlot"),
  "fire-spike": lazyNamed(() => import("./FireSpikeSlot"), "FireSpikeSlot"),
  "boxing-king": lazyNamed(() => import("./BoxingKingSlot"), "BoxingKingSlot"),
  "goal-rush": lazyNamed(() => import("./GoalRushSlot"), "GoalRushSlot"),
  "money-coming": lazyNamed(() => import("./MoneyComingSlot"), "MoneyComingSlot"),
  "fortune-gems": lazyNamed(() => import("./FortuneGemsSlot"), "FortuneGemsSlot"),
  "fortune-ox": lazyNamed(() => import("./FortuneOxSlot"), "FortuneOxSlot"),
  "sari-sari-spin": lazyNamed(() => import("./SariSariSpinSlot"), "SariSariSpinSlot"),
  "fortune-tiger": lazyNamed(() => import("./FortuneTigerSlot"), "FortuneTigerSlot"),
  "fortune-rabbit": lazyNamed(() => import("./FortuneRabbitSlot"), "FortuneRabbitSlot"),
  "pug-den": lazyNamed(() => import("./PugLifeSlot"), "PugLifeSlot"),
  "fruit-riot": lazyNamed(() => import("./ReelRiotSlot"), "ReelRiotSlot"),
  "lucky-neko": lazyNamed(() => import("./LuckyNekoSlot"), "LuckyNekoSlot"),
  "fortune-mouse": lazyNamed(() => import("./FortuneMouseSlot"), "FortuneMouseSlot"),
  "prosperity-lion": lazyNamed(() => import("./ProsperityLionSlot"), "ProsperityLionSlot"),
  "coin-volcano": lazyNamed(() => import("./CoinVolcanoSlot"), "CoinVolcanoSlot"),
  "cash-mania": lazyNamed(() => import("./CashManiaSlot"), "CashManiaSlot"),
  "zeus-strike": lazyNamed(() => import("./ZeusStrikeSlot"), "ZeusStrikeSlot"),
  "thor-thunder": lazyNamed(() => import("./ThorThunderSlot"), "ThorThunderSlot"),
  "maya-gold": lazyNamed(() => import("./MayaGoldSlot"), "MayaGoldSlot"),
  "temple-rush": lazyNamed(() => import("./TempleRushSlot"), "TempleRushSlot"),
  "mahjong-ways-3": lazyNamed(() => import("./MahjongWays3Slot"), "MahjongWays3Slot"),
  "wild-ace": lazyNamed(() => import("./WildAceSlot"), "WildAceSlot"),
  "royal-ace": lazyNamed(() => import("./RoyalAceSlot"), "RoyalAceSlot"),
  "neon-fruits": lazyNamed(() => import("./NeonFruitsSlot"), "NeonFruitsSlot"),
  "lucky-bars": lazyNamed(() => import("./LuckyBarsSlot"), "LuckyBarsSlot"),
  "crazy-sevens": lazyNamed(() => import("./CrazySevensSlot"), "CrazySevensSlot"),
  "pinata-wins": lazyNamed(() => import("./PinataWinsSlot"), "PinataWinsSlot"),
  "ace-high": lazyNamed(() => import("./AceHighSlot"), "AceHighSlot"),
  baccarat: lazyNamed(() => import("./games/baccarat"), "BaccaratTable"),
  lucky9: lazyNamed(() => import("./games/lucky9"), "Lucky9Table"),
  threecardpoker: lazyNamed(() => import("./games/threecardpoker"), "ThreeCardPokerTable"),
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
  "phoenix-fisher": lazyNamed(() => import("./games/phoenix-fisher"), "PhoenixFisherGame"),
  "shark-hunter": lazyNamed(() => import("./games/shark-hunter"), "SharkHunterGame"),
  "octopus-armada": lazyNamed(() => import("./games/octopus-armada"), "OctopusArmadaGame"),
  "turtle-tide": lazyNamed(() => import("./games/turtle-tide"), "TurtleTideGame"),
  "whale-war": lazyNamed(() => import("./games/whale-war"), "WhaleWarGame"),
  "halo-halo-hits": lazyNamed(() => import("./HaloHaloHitsSlot"), "HaloHaloHitsSlot"),
  "balut-bonus": lazyNamed(() => import("./BalutBonusSlot"), "BalutBonusSlot"),
  "sinigang-spin": lazyNamed(() => import("./SinigangSpinSlot"), "SinigangSpinSlot"),
  "lechon-luck": lazyNamed(() => import("./LechonLuckSlot"), "LechonLuckSlot"),
  "lantern-luck": lazyNamed(() => import("./LanternLuckSlot"), "LanternLuckSlot"),
  "palengke-pays": lazyNamed(() => import("./PalengkePaysSlot"), "PalengkePaysSlot"),
  "tricycle-treasure": lazyNamed(() => import("./TricycleTreasureSlot"), "TricycleTreasureSlot"),
  "beach-bonanza": lazyNamed(() => import("./BeachBonanzaSlot"), "BeachBonanzaSlot"),
  "island-fever": lazyNamed(() => import("./IslandFeverSlot"), "IslandFeverSlot"),
  "neon-makati": lazyNamed(() => import("./NeonMakatiSlot"), "NeonMakatiSlot"),
  "quezon-quest": lazyNamed(() => import("./QuezonQuestSlot"), "QuezonQuestSlot"),
  "carabao-cash": lazyNamed(() => import("./CarabaoCashSlot"), "CarabaoCashSlot"),
  "rice-field-riches": lazyNamed(() => import("./RiceFieldRichesSlot"), "RiceFieldRichesSlot"),
  "wild-panther": lazyNamed(() => import("./WildPantherSlot"), "WildPantherSlot"),
};

const ALIASES: Record<string, string> = {
  "pup-den": "pug-den",
};

/**
 * Returns a lazy game component, or null for Coming Soon / thumbnail-only.
 * Synchronous lookup — no Suspense flash for unknown IDs.
 */
export function resolveLazyGame(gameId: string): LazyGame | null {
  if (isThumbnailOnlyGame(gameId)) return null;
  const canonical = ALIASES[gameId] ?? gameId;
  return GAME_LAZY[canonical] ?? null;
}

export function isRegisteredPlayableGame(gameId: string): boolean {
  return resolveLazyGame(gameId) != null;
}
