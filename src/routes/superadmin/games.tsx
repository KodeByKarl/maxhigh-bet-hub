import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { bulkApplyGameOutcomesFn, getBulkOutcomeSettingsFn, listGameSettingsLogsFn, listSuperGamesFn, superUpdateGameFn } from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { CANDY_PEAK_GAME_ID } from "@/lib/candy-peak-config";
import { MERMAID_RICHES_GAME_ID } from "@/lib/mermaid-riches-config";
import { GODLY_GATES_GAME_ID } from "@/lib/godly-gates-config";
import { OLYMPUS_WRATH_GAME_ID } from "@/lib/olympus-wrath-config";
import { ENCHANTED_GROVE_GAME_ID } from "@/lib/enchanted-grove-config";
import { SUGAR_SURGE_GAME_ID } from "@/lib/sugar-surge-config";
import { BORACAY_BOUNCE_GAME_ID } from "@/lib/boracay-bounce-config";
import { GOLDEN_PANTHER_GAME_ID } from "@/lib/golden-panther-config";
import { AZTEC_TREASURE_GAME_ID } from "@/lib/aztec-treasure-config";
import { PIRATE_PLUNDER_GAME_ID } from "@/lib/pirate-plunder-config";
import { MAHJONG_WAYS_GAME_ID } from "@/lib/mahjong-ways-config";
import { MAHJONG_WAYS_2_GAME_ID } from "@/lib/mahjong-ways-2-config";
import { DRAGON_PHOENIX_GAME_ID } from "@/lib/dragon-phoenix-config";
import { STARLIGHT_ACE_GAME_ID } from "@/lib/starlight-ace-config";
import { MANILA_NIGHTS_GAME_ID } from "@/lib/manila-nights-config";
import { SUPER_ACE_GAME_ID } from "@/lib/super-ace-config";
import { MEGA_ACE_GAME_ID } from "@/lib/mega-ace-config";
import { FRONTIER_GOLD_GAME_ID } from "@/lib/frontier-gold-config";
import { BUFFALO_REIGN_GAME_ID } from "@/lib/buffalo-reign-config";
import { CHINESE_NEW_YEAR_GAME_ID } from "@/lib/chinese-new-year-config";
import { FIESTA_FIREWORKS_GAME_ID } from "@/lib/fiesta-fireworks-config";
import { FIRE_SPIKE_GAME_ID } from "@/lib/fire-spike-config";
import { BOXING_KING_GAME_ID } from "@/lib/boxing-king-config";
import { GOAL_RUSH_GAME_ID } from "@/lib/goal-rush-config";
import { MONEY_COMING_GAME_ID } from "@/lib/money-coming-config";
import { FORTUNE_GEMS_GAME_ID } from "@/lib/fortune-gems-config";
import { FORTUNE_OX_GAME_ID } from "@/lib/fortune-ox-config";
import { FORTUNE_TIGER_GAME_ID } from "@/lib/fortune-tiger-config";
import { FORTUNE_RABBIT_GAME_ID } from "@/lib/fortune-rabbit-config";
import { DUST_DOLLARS_GAME_ID } from "@/lib/dust-dollars-config";
import { CLEOPATRA_GOLD_GAME_ID } from "@/lib/cleopatra-gold-config";
import { GOLD_MINE_GAME_ID } from "@/lib/gold-mine-config";
import { JEEPNEY_JACKPOT_GAME_ID } from "@/lib/jeepney-jackpot-config";
import { SARI_SARI_SPIN_GAME_ID } from "@/lib/sari-sari-spin-config";
import { CARABAO_CHARGE_GAME_ID } from "@/lib/carabao-charge-config";
import { PUG_LIFE_GAME_ID } from "@/lib/pug-life-config";
import { REEL_RIOT_GAME_ID } from "@/lib/reel-riot-config";
import { CRAZY_SEVENS_GAME_ID } from "@/lib/crazy-sevens-config";
import { LUCKY_NEKO_GAME_ID } from "@/lib/lucky-neko-config";
import { FORTUNE_MOUSE_GAME_ID } from "@/lib/fortune-mouse-config";
import { PROSPERITY_LION_GAME_ID } from "@/lib/prosperity-lion-config";
import { COIN_VOLCANO_GAME_ID } from "@/lib/coin-volcano-config";
import { CASH_MANIA_GAME_ID } from "@/lib/cash-mania-config";
import { ZEUS_STRIKE_GAME_ID } from "@/lib/zeus-strike-config";
import { THOR_THUNDER_GAME_ID } from "@/lib/thor-thunder-config";
import { MAYA_GOLD_GAME_ID } from "@/lib/maya-gold-config";
import { TEMPLE_RUSH_GAME_ID } from "@/lib/temple-rush-config";
import { MAHJONG_WAYS_3_GAME_ID } from "@/lib/mahjong-ways-3-config";
import { WILD_ACE_GAME_ID } from "@/lib/wild-ace-config";
import { ROYAL_ACE_GAME_ID } from "@/lib/royal-ace-config";
import { NEON_FRUITS_GAME_ID } from "@/lib/neon-fruits-config";
import { LUCKY_BARS_GAME_ID } from "@/lib/lucky-bars-config";
import { KNOCKOUT_KING_GAME_ID } from "@/lib/knockout-king-config";
import { ARENA_CHAMP_GAME_ID } from "@/lib/arena-champ-config";
import { SAFARI_GOLD_GAME_ID } from "@/lib/safari-gold-config";
import { PHARAOH_FIRE_GAME_ID } from "@/lib/pharaoh-fire-config";
import { DESERT_RICHES_GAME_ID } from "@/lib/desert-riches-config";
import { OUTLAW_COINS_GAME_ID } from "@/lib/outlaw-coins-config";
import { CRYSTAL_CAVE_GAME_ID } from "@/lib/crystal-cave-config";
import { DIAMOND_DIG_GAME_ID } from "@/lib/diamond-dig-config";
import { CANDY_BLAST_GAME_ID } from "@/lib/candy-blast-config";
import { SWEET_RUSH_GAME_ID } from "@/lib/sweet-rush-config";
import { STARLIGHT_WAYS_GAME_ID } from "@/lib/starlight-ways-config";
import { GALAXY_ACE_GAME_ID } from "@/lib/galaxy-ace-config";
import { GATE_OF_RA_GAME_ID } from "@/lib/gate-of-ra-config";
import { MYSTIC_RUNES_GAME_ID } from "@/lib/mystic-runes-config";
import { WILD_PANTHER_GAME_ID } from "@/lib/wild-panther-config";
import { RICE_FIELD_RICHES_GAME_ID } from "@/lib/rice-field-riches-config";
import { CARABAO_CASH_GAME_ID } from "@/lib/carabao-cash-config";
import { QUEZON_QUEST_GAME_ID } from "@/lib/quezon-quest-config";
import { NEON_MAKATI_GAME_ID } from "@/lib/neon-makati-config";
import { ISLAND_FEVER_GAME_ID } from "@/lib/island-fever-config";
import { BEACH_BONANZA_GAME_ID } from "@/lib/beach-bonanza-config";
import { TRICYCLE_TREASURE_GAME_ID } from "@/lib/tricycle-treasure-config";
import { PALENGKE_PAYS_GAME_ID } from "@/lib/palengke-pays-config";
import { LANTERN_LUCK_GAME_ID } from "@/lib/lantern-luck-config";
import { LECHON_LUCK_GAME_ID } from "@/lib/lechon-luck-config";
import { SINIGANG_SPIN_GAME_ID } from "@/lib/sinigang-spin-config";
import { BALUT_BONUS_GAME_ID } from "@/lib/balut-bonus-config";
import { HALO_HALO_HITS_GAME_ID } from "@/lib/halo-halo-hits-config";
import { PINATA_WINS_GAME_ID } from "@/lib/pinata-wins-config";
import { ACE_HIGH_GAME_ID } from "@/lib/ace-high-config";
import { BACCARAT_GAME_ID } from "@/lib/baccarat-config";
import { LUCKY9_GAME_ID } from "@/lib/lucky9-config";
import { THREE_CARD_POKER_GAME_ID } from "@/lib/threecardpoker-config";
import { COLOR_GAME_GAME_ID } from "@/lib/color-game-config";
import { TONGITS_ARENA_GAME_ID } from "@/lib/tongits-arena-config";
import { LUCKY_DROP_GAME_ID } from "@/lib/lucky-drop-config";
import { DEEP_BASS_GAME_ID } from "@/lib/deep-bass-config";
import { DRAGON_FISHER_GAME_ID } from "@/lib/dragon-fisher-config";
import { CRAB_CANNON_GAME_ID } from "@/lib/crab-cannon-config";
import { PHOENIX_FISHER_GAME_ID } from "@/lib/phoenix-fisher-config";
import { SHARK_HUNTER_GAME_ID } from "@/lib/shark-hunter-config";
import { OCTOPUS_ARMADA_GAME_ID } from "@/lib/octopus-armada-config";
import { TURTLE_TIDE_GAME_ID } from "@/lib/turtle-tide-config";
import { WHALE_WAR_GAME_ID } from "@/lib/whale-war-config";
import { COLOR_GAME_PRO_GAME_ID } from "@/lib/color-game-pro-config";
import { LUCKY_NINE_PLUS_GAME_ID } from "@/lib/lucky-nine-plus-config";
import { DROP_DELUXE_GAME_ID } from "@/lib/drop-deluxe-config";
import { POKER_SHOWDOWN_GAME_ID } from "@/lib/poker-showdown-config";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CandyPeakConfigModal } from "@/components/superadmin/games/CandyPeakConfigModal";
import { MermaidRichesConfigModal } from "@/components/superadmin/games/MermaidRichesConfigModal";
import { GodlyGatesConfigModal } from "@/components/superadmin/games/GodlyGatesConfigModal";
import { OlympusWrathConfigModal } from "@/components/superadmin/games/OlympusWrathConfigModal";
import { EnchantedGroveConfigModal } from "@/components/superadmin/games/EnchantedGroveConfigModal";
import { SugarSurgeConfigModal } from "@/components/superadmin/games/SugarSurgeConfigModal";
import { BoracayBounceConfigModal } from "@/components/superadmin/games/BoracayBounceConfigModal";
import { GoldenPantherConfigModal } from "@/components/superadmin/games/GoldenPantherConfigModal";
import { AztecTreasureConfigModal } from "@/components/superadmin/games/AztecTreasureConfigModal";
import { PiratePlunderConfigModal } from "@/components/superadmin/games/PiratePlunderConfigModal";
import { MahjongWaysConfigModal } from "@/components/superadmin/games/MahjongWaysConfigModal";
import { MahjongWays2ConfigModal } from "@/components/superadmin/games/MahjongWays2ConfigModal";
import { DragonPhoenixConfigModal } from "@/components/superadmin/games/DragonPhoenixConfigModal";
import { StarlightAceConfigModal } from "@/components/superadmin/games/StarlightAceConfigModal";
import { ManilaNightsConfigModal } from "@/components/superadmin/games/ManilaNightsConfigModal";
import { SuperAceConfigModal } from "@/components/superadmin/games/SuperAceConfigModal";
import { MegaAceConfigModal } from "@/components/superadmin/games/MegaAceConfigModal";
import { FrontierGoldConfigModal } from "@/components/superadmin/games/FrontierGoldConfigModal";
import { BuffaloReignConfigModal } from "@/components/superadmin/games/BuffaloReignConfigModal";
import { ChineseNewYearConfigModal } from "@/components/superadmin/games/ChineseNewYearConfigModal";
import { FiestaFireworksConfigModal } from "@/components/superadmin/games/FiestaFireworksConfigModal";
import { FireSpikeConfigModal } from "@/components/superadmin/games/FireSpikeConfigModal";
import { BoxingKingConfigModal } from "@/components/superadmin/games/BoxingKingConfigModal";
import { GoalRushConfigModal } from "@/components/superadmin/games/GoalRushConfigModal";
import { MoneyComingConfigModal } from "@/components/superadmin/games/MoneyComingConfigModal";
import { FortuneGemsConfigModal } from "@/components/superadmin/games/FortuneGemsConfigModal";
import { FortuneOxConfigModal } from "@/components/superadmin/games/FortuneOxConfigModal";
import { FortuneTigerConfigModal } from "@/components/superadmin/games/FortuneTigerConfigModal";
import { FortuneRabbitConfigModal } from "@/components/superadmin/games/FortuneRabbitConfigModal";
import { DustDollarsConfigModal } from "@/components/superadmin/games/DustDollarsConfigModal";
import { CleopatraGoldConfigModal } from "@/components/superadmin/games/CleopatraGoldConfigModal";
import { GoldMineConfigModal } from "@/components/superadmin/games/GoldMineConfigModal";
import { JeepneyJackpotConfigModal } from "@/components/superadmin/games/JeepneyJackpotConfigModal";
import { SariSariSpinConfigModal } from "@/components/superadmin/games/SariSariSpinConfigModal";
import { CarabaoChargeConfigModal } from "@/components/superadmin/games/CarabaoChargeConfigModal";
import { PugDenConfigModal } from "@/components/superadmin/games/PugDenConfigModal";
import { FruitRiotConfigModal } from "@/components/superadmin/games/FruitRiotConfigModal";
import { CrazySevensConfigModal } from "@/components/superadmin/games/CrazySevensConfigModal";
import { LuckyNekoConfigModal } from "@/components/superadmin/games/LuckyNekoConfigModal";
import { FortuneMouseConfigModal } from "@/components/superadmin/games/FortuneMouseConfigModal";
import { ProsperityLionConfigModal } from "@/components/superadmin/games/ProsperityLionConfigModal";
import { CoinVolcanoConfigModal } from "@/components/superadmin/games/CoinVolcanoConfigModal";
import { CashManiaConfigModal } from "@/components/superadmin/games/CashManiaConfigModal";
import { ZeusStrikeConfigModal } from "@/components/superadmin/games/ZeusStrikeConfigModal";
import { ThorThunderConfigModal } from "@/components/superadmin/games/ThorThunderConfigModal";
import { MayaGoldConfigModal } from "@/components/superadmin/games/MayaGoldConfigModal";
import { TempleRushConfigModal } from "@/components/superadmin/games/TempleRushConfigModal";
import { MahjongWays3ConfigModal } from "@/components/superadmin/games/MahjongWays3ConfigModal";
import { WildAceConfigModal } from "@/components/superadmin/games/WildAceConfigModal";
import { RoyalAceConfigModal } from "@/components/superadmin/games/RoyalAceConfigModal";
import { NeonFruitsConfigModal } from "@/components/superadmin/games/NeonFruitsConfigModal";
import { LuckyBarsConfigModal } from "@/components/superadmin/games/LuckyBarsConfigModal";
import { KnockoutKingConfigModal } from "@/components/superadmin/games/KnockoutKingConfigModal";
import { ArenaChampConfigModal } from "@/components/superadmin/games/ArenaChampConfigModal";
import { SafariGoldConfigModal } from "@/components/superadmin/games/SafariGoldConfigModal";
import { PharaohFireConfigModal } from "@/components/superadmin/games/PharaohFireConfigModal";
import { DesertRichesConfigModal } from "@/components/superadmin/games/DesertRichesConfigModal";
import { OutlawCoinsConfigModal } from "@/components/superadmin/games/OutlawCoinsConfigModal";
import { CrystalCaveConfigModal } from "@/components/superadmin/games/CrystalCaveConfigModal";
import { DiamondDigConfigModal } from "@/components/superadmin/games/DiamondDigConfigModal";
import { CandyBlastConfigModal } from "@/components/superadmin/games/CandyBlastConfigModal";
import { SweetRushConfigModal } from "@/components/superadmin/games/SweetRushConfigModal";
import { StarlightWaysConfigModal } from "@/components/superadmin/games/StarlightWaysConfigModal";
import { GalaxyAceConfigModal } from "@/components/superadmin/games/GalaxyAceConfigModal";
import { GateOfRaConfigModal } from "@/components/superadmin/games/GateOfRaConfigModal";
import { MysticRunesConfigModal } from "@/components/superadmin/games/MysticRunesConfigModal";
import { WildPantherConfigModal } from "@/components/superadmin/games/WildPantherConfigModal";
import { RiceFieldRichesConfigModal } from "@/components/superadmin/games/RiceFieldRichesConfigModal";
import { CarabaoCashConfigModal } from "@/components/superadmin/games/CarabaoCashConfigModal";
import { QuezonQuestConfigModal } from "@/components/superadmin/games/QuezonQuestConfigModal";
import { NeonMakatiConfigModal } from "@/components/superadmin/games/NeonMakatiConfigModal";
import { IslandFeverConfigModal } from "@/components/superadmin/games/IslandFeverConfigModal";
import { BeachBonanzaConfigModal } from "@/components/superadmin/games/BeachBonanzaConfigModal";
import { TricycleTreasureConfigModal } from "@/components/superadmin/games/TricycleTreasureConfigModal";
import { PalengkePaysConfigModal } from "@/components/superadmin/games/PalengkePaysConfigModal";
import { LanternLuckConfigModal } from "@/components/superadmin/games/LanternLuckConfigModal";
import { LechonLuckConfigModal } from "@/components/superadmin/games/LechonLuckConfigModal";
import { SinigangSpinConfigModal } from "@/components/superadmin/games/SinigangSpinConfigModal";
import { BalutBonusConfigModal } from "@/components/superadmin/games/BalutBonusConfigModal";
import { HaloHaloHitsConfigModal } from "@/components/superadmin/games/HaloHaloHitsConfigModal";
import { PinataWinsConfigModal } from "@/components/superadmin/games/PinataWinsConfigModal";
import { AceHighConfigModal } from "@/components/superadmin/games/AceHighConfigModal";
import { BaccaratConfigModal } from "@/components/superadmin/games/BaccaratConfigModal";
import { Lucky9ConfigModal } from "@/components/superadmin/games/Lucky9ConfigModal";
import { ThreeCardPokerConfigModal } from "@/components/superadmin/games/ThreeCardPokerConfigModal";
import { ColorGameConfigModal } from "@/components/superadmin/games/ColorGameConfigModal";
import { TongitsArenaConfigModal } from "@/components/superadmin/games/TongitsArenaConfigModal";
import { LuckyDropConfigModal } from "@/components/superadmin/games/LuckyDropConfigModal";
import { DeepBassConfigModal } from "@/components/superadmin/games/DeepBassConfigModal";
import { DragonFisherConfigModal } from "@/components/superadmin/games/DragonFisherConfigModal";
import { CrabCannonConfigModal } from "@/components/superadmin/games/CrabCannonConfigModal";
import { PhoenixFisherConfigModal } from "@/components/superadmin/games/PhoenixFisherConfigModal";
import { SharkHunterConfigModal } from "@/components/superadmin/games/SharkHunterConfigModal";
import { OctopusArmadaConfigModal } from "@/components/superadmin/games/OctopusArmadaConfigModal";
import { TurtleTideConfigModal } from "@/components/superadmin/games/TurtleTideConfigModal";
import { WhaleWarConfigModal } from "@/components/superadmin/games/WhaleWarConfigModal";
import { ColorGameProConfigModal } from "@/components/superadmin/games/ColorGameProConfigModal";
import { LuckyNinePlusConfigModal } from "@/components/superadmin/games/LuckyNinePlusConfigModal";
import { DropDeluxeConfigModal } from "@/components/superadmin/games/DropDeluxeConfigModal";
import { PokerShowdownConfigModal } from "@/components/superadmin/games/PokerShowdownConfigModal";
import { saGlass } from "@/components/superadmin/ui/glass";
import { toast } from "sonner";
import { Sliders, ShieldCheck, Zap, History, Search } from "lucide-react";

export const Route = createFileRoute("/superadmin/games")({
  component: SuperGamesPage,
});

type GameSettingsLogRow = {
  id: string;
  actorId: string | null;
  actorUsername: string;
  scope: string;
  affectedCount: number;
  deadSpinPct: number;
  winChancePct: number;
  maxMultiplier: number;
  rtp: number;
  createdAt: string;
};

type OutcomeSnapshot = {
  deadSpinPct: number;
  winChancePct: number;
  maxMultiplier: number;
  rtp: number;
};

const BULK_DRAFT_KEY = "mh-bulk-outcome-draft";

function readDraft(): OutcomeSnapshot | null {
  try {
    const raw = sessionStorage.getItem(BULK_DRAFT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as OutcomeSnapshot;
    if (
      Number.isFinite(v.deadSpinPct) &&
      Number.isFinite(v.winChancePct) &&
      Number.isFinite(v.maxMultiplier) &&
      Number.isFinite(v.rtp)
    ) {
      return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeDraft(snapshot: OutcomeSnapshot) {
  try {
    sessionStorage.setItem(BULK_DRAFT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(BULK_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function snapshotsEqual(a: OutcomeSnapshot, b: OutcomeSnapshot) {
  return (
    a.deadSpinPct === b.deadSpinPct &&
    a.winChancePct === b.winChancePct &&
    a.maxMultiplier === b.maxMultiplier &&
    a.rtp === b.rtp
  );
}

function BulkOutcomePanel({ onApplied }: { onApplied: () => void }) {
  const [scope, setScope] = useState<"all" | "slots" | "cards" | "fishing">("all");
  const [deadSpinPct, setDeadSpinPct] = useState(40);
  const [winChancePct, setWinChancePct] = useState(60);
  const [maxMultiplier, setMaxMultiplier] = useState(5000);
  const [rtp, setRtp] = useState(96);
  const [savedLive, setSavedLive] = useState<OutcomeSnapshot | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [applying, setApplying] = useState(false);
  const [logs, setLogs] = useState<GameSettingsLogRow[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const currentSnapshot = useMemo<OutcomeSnapshot>(
    () => ({ deadSpinPct, winChancePct, maxMultiplier, rtp }),
    [deadSpinPct, winChancePct, maxMultiplier, rtp],
  );
  const hasUnsavedChanges = savedLive != null && !snapshotsEqual(currentSnapshot, savedLive);

  const applySnapshot = useCallback((s: OutcomeSnapshot) => {
    setDeadSpinPct(s.deadSpinPct);
    setWinChancePct(s.winChancePct);
    setMaxMultiplier(s.maxMultiplier);
    setRtp(s.rtp);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const live = await getBulkOutcomeSettingsFn();
      const liveSnap: OutcomeSnapshot = {
        deadSpinPct: live.deadSpinPct,
        winChancePct: live.winChancePct,
        maxMultiplier: live.maxMultiplier,
        rtp: live.rtp,
      };
      setSavedLive(liveSnap);

      const draft = readDraft();
      if (draft && !snapshotsEqual(draft, liveSnap)) {
        applySnapshot(draft);
      } else {
        applySnapshot(liveSnap);
        clearDraft();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load live game settings");
    } finally {
      setLoadingSettings(false);
    }
  }, [applySnapshot]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await listGameSettingsLogsFn();
      setLogs(res as GameSettingsLogRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load change history");
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void fetchLogs();
  }, [loadSettings, fetchLogs]);

  useEffect(() => {
    if (loadingSettings || !hasUnsavedChanges) return;
    writeDraft(currentSnapshot);
  }, [currentSnapshot, hasUnsavedChanges, loadingSettings]);

  async function handleBulkApply() {
    // Validation before submission
    if (deadSpinPct < 0 || deadSpinPct > 100) {
      toast.error("Dead spin % must be between 0% and 100%");
      return;
    }
    if (winChancePct < 0 || winChancePct > 100) {
      toast.error("Win chance % must be between 0% and 100%");
      return;
    }
    if (rtp < 80 || rtp > 98) {
      toast.error("RTP % must be between 80% and 98%");
      return;
    }
    if (maxMultiplier < 1) {
      toast.error("Max payout multiplier must be at least 1x");
      return;
    }

    setApplying(true);
    try {
      const result = await bulkApplyGameOutcomesFn({
        data: {
          scope,
          deadSpinPct,
          winChancePct,
          maxMultiplier,
          rtp,
        },
      });
      toast.success(
        `Bulk updated ${result.affectedCount} games! (RTP: ${result.rtp}%, DeadSpin: ${result.deadSpinPct}%, WinChance: ${result.winChancePct}%)`,
      );
      const applied: OutcomeSnapshot = {
        deadSpinPct: result.deadSpinPct,
        winChancePct: result.winChancePct,
        maxMultiplier: result.maxMultiplier,
        rtp: result.rtp,
      };
      setSavedLive(applied);
      applySnapshot(applied);
      clearDraft();
      await fetchLogs();
      await loadSettings();
      onApplied();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk apply failed");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Bulk Control Box */}
      <div className="rounded-2xl border border-amber-500/30 bg-black/60 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-amber-400" />
              <h2 className="text-xl font-black uppercase tracking-wide text-foreground">
                Global Outcome Control Panel
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage RTP, dead spin rates, and payout limits across all games in one batch operation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-white/10"
          >
            <History className="h-3.5 w-3.5" />
            {showLogs ? "Hide Change Logs" : `View Audit Log (${logs.length})`}
          </button>
        </div>

        {hasUnsavedChanges && (
          <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            <span className="font-bold uppercase tracking-wide text-amber-300">Unsaved changes</span>
            <span className="mt-1 block text-amber-100/90">
              Moving the sliders does not change live games yet. Tap{" "}
              <strong className="text-amber-200">Apply to {scope === "all" ? "All Games" : scope}</strong> before
              playing — otherwise spins still use the last saved settings.
            </span>
          </div>
        )}

        {/* Category Scope Selection */}
        <div className="pt-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Target Category Scope
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { id: "all", label: "All Games (Global)" },
              { id: "slots", label: "Slots" },
              { id: "cards", label: "Table & Card Games" },
              { id: "fishing", label: "Fishing Games" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setScope(cat.id as any)}
                className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
                  scope === cat.id
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
                    : "border border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/10"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Control Sliders Grid */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Dead Spin % */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>Dead Spin %</span>
              <span className="text-amber-400">{deadSpinPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={deadSpinPct}
              onChange={(e) => setDeadSpinPct(Number(e.target.value))}
              className="h-2 w-full accent-amber-400 cursor-pointer"
            />
            <div className="text-[10px] text-muted-foreground">Frequency of non-winning spins</div>
          </div>

          {/* Win Chance % */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>Win Chance %</span>
              <span className="text-amber-400">{winChancePct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={winChancePct}
              onChange={(e) => setWinChancePct(Number(e.target.value))}
              className="h-2 w-full accent-amber-400 cursor-pointer"
            />
            <div className="text-[10px] text-muted-foreground">Overall winning hit rate target</div>
          </div>

          {/* Max Payout Multiplier */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>Max Multiplier</span>
              <span className="text-amber-400">{maxMultiplier}x</span>
            </div>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={maxMultiplier}
              onChange={(e) => setMaxMultiplier(Number(e.target.value))}
              className="h-2 w-full accent-amber-400 cursor-pointer"
            />
            <div className="text-[10px] text-muted-foreground">Upper payout multiplier cap</div>
          </div>

          {/* RTP % */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>RTP % (80–98%)</span>
              <span className="text-emerald-400">{rtp.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="80"
              max="98"
              step="0.5"
              value={rtp}
              onChange={(e) => setRtp(Number(e.target.value))}
              className="h-2 w-full accent-emerald-400 cursor-pointer"
            />
            <div className="text-[10px] text-muted-foreground">Return-to-player target ratio</div>
          </div>
        </div>

        {/* Apply Action Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Instant live apply · Batch update with audit trail</span>
          </div>

          <button
            type="button"
            disabled={applying || loadingSettings}
            onClick={() => void handleBulkApply()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            {applying
              ? "Applying..."
              : hasUnsavedChanges
                ? `Save & apply to ${scope === "all" ? "all games" : scope}`
                : `Apply to ${scope === "all" ? "All Games" : scope}`}
          </button>
        </div>
      </div>

      {/* Audit History Logs Table */}
      {showLogs && (
        <div className="rounded-2xl border border-white/10 bg-panel p-4 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Bulk Outcome Change History Log
          </h3>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No bulk changes recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Actor</th>
                    <th className="py-2 px-3">Scope</th>
                    <th className="py-2 px-3">Games</th>
                    <th className="py-2 px-3">RTP</th>
                    <th className="py-2 px-3">Dead Spin %</th>
                    <th className="py-2 px-3">Win Chance %</th>
                    <th className="py-2 px-3">Max Mult</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-muted-foreground">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2 px-3 font-mono text-foreground">
                        {new Date(log.createdAt).toLocaleString("en-PH")}
                      </td>
                      <td className="py-2 px-3 font-semibold text-amber-300">@{log.actorUsername}</td>
                      <td className="py-2 px-3 uppercase">{log.scope}</td>
                      <td className="py-2 px-3 font-bold text-foreground">{log.affectedCount}</td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">{log.rtp}%</td>
                      <td className="py-2 px-3">{log.deadSpinPct}%</td>
                      <td className="py-2 px-3">{log.winChancePct}%</td>
                      <td className="py-2 px-3">{log.maxMultiplier}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuperGamesPage() {
  const { user, isReady } = useAuth();
  const [games, setGames] = useState<SuperGameRow[]>([]);
  const [selected, setSelected] = useState<SuperGameRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    const rows = await listSuperGamesFn();
    setGames(rows);
    setSelected((prev) => (prev ? (rows.find((g) => g.gameId === prev.gameId) ?? null) : null));
  }, []);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    void load().catch(() => setGames([]));
  }, [isReady, user, load]);

  async function patch(
    gameId: string,
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) {
    try {
      await superUpdateGameFn({
        data: {
          gameId,
          enabled: data.enabled,
          featured: data.featured,
          tag: data.tag,
          rtp: data.rtp,
          volatility: data.volatility,
          minBet: data.minBet,
          maxBet: data.maxBet,
          notes: data.notes,
          sortOrder: data.sortOrder,
        },
      });
      toast.success("Game updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const filteredGames = games.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.gameId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const FULL_ENGINE_IDS = new Set([
    CANDY_PEAK_GAME_ID,
    MERMAID_RICHES_GAME_ID,
    "mermaid-riches",
    GODLY_GATES_GAME_ID,
    OLYMPUS_WRATH_GAME_ID,
    "olympus-wrath",
    ENCHANTED_GROVE_GAME_ID,
    "enchanted-grove",
    SUGAR_SURGE_GAME_ID,
    BORACAY_BOUNCE_GAME_ID,
    "boracay-bounce",
    GOLDEN_PANTHER_GAME_ID,
    "golden-panther",
    AZTEC_TREASURE_GAME_ID,
    "aztec-treasure",
    PIRATE_PLUNDER_GAME_ID,
    "pirate-plunder",
    MAHJONG_WAYS_GAME_ID,
    "mahjong-ways",
    MAHJONG_WAYS_2_GAME_ID,
    "mahjong-ways-2",
    DRAGON_PHOENIX_GAME_ID,
    "dragon-phoenix",
    STARLIGHT_ACE_GAME_ID,
    "starlight-ace",
    MANILA_NIGHTS_GAME_ID,
    "manila-nights",
    SUPER_ACE_GAME_ID,
    "super-ace",
    MEGA_ACE_GAME_ID,
    "mega-ace",
    FRONTIER_GOLD_GAME_ID,
    "frontier-gold",
    DUST_DOLLARS_GAME_ID,
    "dust-dollars",
    GOLD_MINE_GAME_ID,
    "gold-mine",
    JEEPNEY_JACKPOT_GAME_ID,
    "jeepney-jackpot",
    BUFFALO_REIGN_GAME_ID,
    "buffalo-reign",
    CLEOPATRA_GOLD_GAME_ID,
    "cleopatra-gold",
    CARABAO_CHARGE_GAME_ID,
    "carabao-charge",
    CHINESE_NEW_YEAR_GAME_ID,
    "chinese-new-year",
    FIESTA_FIREWORKS_GAME_ID,
    "fiesta-fireworks",
    FIRE_SPIKE_GAME_ID,
    "fire-spike",
    BOXING_KING_GAME_ID,
    "boxing-king",
    GOAL_RUSH_GAME_ID,
    "goal-rush",
    MONEY_COMING_GAME_ID,
    "money-coming",
    FORTUNE_GEMS_GAME_ID,
    "fortune-gems",
    FORTUNE_OX_GAME_ID,
    "fortune-ox",
    SARI_SARI_SPIN_GAME_ID,
    "sari-sari-spin",
    FORTUNE_TIGER_GAME_ID,
    "fortune-tiger",
    FORTUNE_RABBIT_GAME_ID,
    "fortune-rabbit",
    PUG_LIFE_GAME_ID,
    "pug-den",
    REEL_RIOT_GAME_ID,
    "fruit-riot",
    CRAZY_SEVENS_GAME_ID,
    "crazy-sevens",
    LUCKY_NEKO_GAME_ID,
    "lucky-neko",
    FORTUNE_MOUSE_GAME_ID,
    "fortune-mouse",
    PROSPERITY_LION_GAME_ID,
    "prosperity-lion",
    COIN_VOLCANO_GAME_ID,
    "coin-volcano",
    CASH_MANIA_GAME_ID,
    "cash-mania",
    ZEUS_STRIKE_GAME_ID,
    "zeus-strike",
    THOR_THUNDER_GAME_ID,
    "thor-thunder",
    MAYA_GOLD_GAME_ID,
    "maya-gold",
    TEMPLE_RUSH_GAME_ID,
    "temple-rush",
    MAHJONG_WAYS_3_GAME_ID,
    "mahjong-ways-3",
    WILD_ACE_GAME_ID,
    "wild-ace",
    ROYAL_ACE_GAME_ID,
    "royal-ace",
    NEON_FRUITS_GAME_ID,
    "neon-fruits",
    LUCKY_BARS_GAME_ID,
    "lucky-bars",
    PINATA_WINS_GAME_ID,
    "pinata-wins",
    ACE_HIGH_GAME_ID,
    "ace-high",
    BACCARAT_GAME_ID,
    "baccarat",
    LUCKY9_GAME_ID,
    "lucky9",
    THREE_CARD_POKER_GAME_ID,
    "threecardpoker",
    COLOR_GAME_GAME_ID,
    "color-game",
    TONGITS_ARENA_GAME_ID,
    "tongits-arena",
    LUCKY_DROP_GAME_ID,
    "lucky-drop",
    DEEP_BASS_GAME_ID,
    "deep-bass",
    DRAGON_FISHER_GAME_ID,
    "dragon-fisher",
    CRAB_CANNON_GAME_ID,
    "crab-cannon",
    PHOENIX_FISHER_GAME_ID,
    "phoenix-fisher",
    SHARK_HUNTER_GAME_ID,
    "shark-hunter",
    OCTOPUS_ARMADA_GAME_ID,
    "octopus-armada",
    TURTLE_TIDE_GAME_ID,
    "turtle-tide",
    WHALE_WAR_GAME_ID,
    "whale-war",
    COLOR_GAME_PRO_GAME_ID,
    "color-game-pro",
    LUCKY_NINE_PLUS_GAME_ID,
    "lucky-nine-plus",
    DROP_DELUXE_GAME_ID,
    "drop-deluxe",
    POKER_SHOWDOWN_GAME_ID,
    "poker-showdown",
    HALO_HALO_HITS_GAME_ID,
    "halo-halo-hits",
    BALUT_BONUS_GAME_ID,
    "balut-bonus",
    SINIGANG_SPIN_GAME_ID,
    "sinigang-spin",
    LECHON_LUCK_GAME_ID,
    "lechon-luck",
    LANTERN_LUCK_GAME_ID,
    "lantern-luck",
    PALENGKE_PAYS_GAME_ID,
    "palengke-pays",
    TRICYCLE_TREASURE_GAME_ID,
    "tricycle-treasure",
    BEACH_BONANZA_GAME_ID,
    "beach-bonanza",
    ISLAND_FEVER_GAME_ID,
    "island-fever",
    NEON_MAKATI_GAME_ID,
    "neon-makati",
    QUEZON_QUEST_GAME_ID,
    "quezon-quest",
    CARABAO_CASH_GAME_ID,
    "carabao-cash",
    RICE_FIELD_RICHES_GAME_ID,
    "rice-field-riches",
    WILD_PANTHER_GAME_ID,
    "wild-panther",
  ]);

  const selectedId = selected?.gameId ?? "";
  const isCandy = selectedId === CANDY_PEAK_GAME_ID;
  const isMermaidRiches =
    selectedId === MERMAID_RICHES_GAME_ID || selectedId === "mermaid-riches";
  const isGodly = selectedId === GODLY_GATES_GAME_ID;
  const isOlympusWrath =
    selectedId === OLYMPUS_WRATH_GAME_ID || selectedId === "olympus-wrath";
  const isEnchantedGrove =
    selectedId === ENCHANTED_GROVE_GAME_ID || selectedId === "enchanted-grove";
  const isSugar = selectedId === SUGAR_SURGE_GAME_ID;
  const isBoracayBounce =
    selectedId === BORACAY_BOUNCE_GAME_ID || selectedId === "boracay-bounce";
  const isPanther = selectedId === GOLDEN_PANTHER_GAME_ID || selectedId === "golden-panther";
  const isAztec = selectedId === AZTEC_TREASURE_GAME_ID || selectedId === "aztec-treasure";
  const isPiratePlunder =
    selectedId === PIRATE_PLUNDER_GAME_ID || selectedId === "pirate-plunder";
  const isMahjong = selectedId === MAHJONG_WAYS_GAME_ID || selectedId === "mahjong-ways";
  const isMahjong2 = selectedId === MAHJONG_WAYS_2_GAME_ID || selectedId === "mahjong-ways-2";
  const isDragonPhoenix =
    selectedId === DRAGON_PHOENIX_GAME_ID || selectedId === "dragon-phoenix";
  const isStarlight = selectedId === STARLIGHT_ACE_GAME_ID || selectedId === "starlight-ace";
  const isManilaNights =
    selectedId === MANILA_NIGHTS_GAME_ID || selectedId === "manila-nights";
  const isSuperAce = selectedId === SUPER_ACE_GAME_ID || selectedId === "super-ace";
  const isMegaAce = selectedId === MEGA_ACE_GAME_ID || selectedId === "mega-ace";
  const isFrontier = selectedId === FRONTIER_GOLD_GAME_ID || selectedId === "frontier-gold";
  const isDustDollars = selectedId === DUST_DOLLARS_GAME_ID || selectedId === "dust-dollars";
  const isGoldMine = selectedId === GOLD_MINE_GAME_ID || selectedId === "gold-mine";
  const isJeepneyJackpot =
    selectedId === JEEPNEY_JACKPOT_GAME_ID || selectedId === "jeepney-jackpot";
  const isBuffalo = selectedId === BUFFALO_REIGN_GAME_ID || selectedId === "buffalo-reign";
  const isCleopatraGold = selectedId === CLEOPATRA_GOLD_GAME_ID || selectedId === "cleopatra-gold";
  const isCarabaoCharge =
    selectedId === CARABAO_CHARGE_GAME_ID || selectedId === "carabao-charge";
  const isCny = selectedId === CHINESE_NEW_YEAR_GAME_ID || selectedId === "chinese-new-year";
  const isFiestaFireworks =
    selectedId === FIESTA_FIREWORKS_GAME_ID || selectedId === "fiesta-fireworks";
  const isFireSpike = selectedId === FIRE_SPIKE_GAME_ID || selectedId === "fire-spike";
  const isBoxingKing = selectedId === BOXING_KING_GAME_ID || selectedId === "boxing-king";
  const isGoalRush = selectedId === GOAL_RUSH_GAME_ID || selectedId === "goal-rush";
  const isMoneyComing = selectedId === MONEY_COMING_GAME_ID || selectedId === "money-coming";
  const isFortuneGems = selectedId === FORTUNE_GEMS_GAME_ID || selectedId === "fortune-gems";
  const isFortuneOx = selectedId === FORTUNE_OX_GAME_ID || selectedId === "fortune-ox";
  const isSariSariSpin =
    selectedId === SARI_SARI_SPIN_GAME_ID || selectedId === "sari-sari-spin";
  const isFortuneTiger = selectedId === FORTUNE_TIGER_GAME_ID || selectedId === "fortune-tiger";
  const isFortuneRabbit = selectedId === FORTUNE_RABBIT_GAME_ID || selectedId === "fortune-rabbit";
  const isPugDen = selectedId === PUG_LIFE_GAME_ID || selectedId === "pug-den";
  const isFruitRiot = selectedId === REEL_RIOT_GAME_ID || selectedId === "fruit-riot";
  const isCrazySevens =
    selectedId === CRAZY_SEVENS_GAME_ID || selectedId === "crazy-sevens";
  const isLuckyNeko = selectedId === LUCKY_NEKO_GAME_ID || selectedId === "lucky-neko";
  const isFortuneMouse =
    selectedId === FORTUNE_MOUSE_GAME_ID || selectedId === "fortune-mouse";
  const isProsperityLion =
    selectedId === PROSPERITY_LION_GAME_ID || selectedId === "prosperity-lion";
  const isCoinVolcano =
    selectedId === COIN_VOLCANO_GAME_ID || selectedId === "coin-volcano";
  const isCashMania = selectedId === CASH_MANIA_GAME_ID || selectedId === "cash-mania";
  const isZeusStrike =
    selectedId === ZEUS_STRIKE_GAME_ID || selectedId === "zeus-strike";
  const isThorThunder =
    selectedId === THOR_THUNDER_GAME_ID || selectedId === "thor-thunder";
  const isMayaGold = selectedId === MAYA_GOLD_GAME_ID || selectedId === "maya-gold";
  const isTempleRush =
    selectedId === TEMPLE_RUSH_GAME_ID || selectedId === "temple-rush";
  const isMahjong3 =
    selectedId === MAHJONG_WAYS_3_GAME_ID || selectedId === "mahjong-ways-3";
  const isWildAce = selectedId === WILD_ACE_GAME_ID || selectedId === "wild-ace";
  const isRoyalAce = selectedId === ROYAL_ACE_GAME_ID || selectedId === "royal-ace";
  const isNeonFruits =
    selectedId === NEON_FRUITS_GAME_ID || selectedId === "neon-fruits";
  const isLuckyBars = selectedId === LUCKY_BARS_GAME_ID || selectedId === "lucky-bars";
  const isKnockoutKing = selectedId === KNOCKOUT_KING_GAME_ID || selectedId === "knockout-king";
  const isArenaChamp = selectedId === ARENA_CHAMP_GAME_ID || selectedId === "arena-champ";
  const isSafariGold = selectedId === SAFARI_GOLD_GAME_ID || selectedId === "safari-gold";
  const isPharaohFire = selectedId === PHARAOH_FIRE_GAME_ID || selectedId === "pharaoh-fire";
  const isDesertRiches = selectedId === DESERT_RICHES_GAME_ID || selectedId === "desert-riches";
  const isOutlawCoins = selectedId === OUTLAW_COINS_GAME_ID || selectedId === "outlaw-coins";
  const isCrystalCave = selectedId === CRYSTAL_CAVE_GAME_ID || selectedId === "crystal-cave";
  const isDiamondDig = selectedId === DIAMOND_DIG_GAME_ID || selectedId === "diamond-dig";
  const isCandyBlast = selectedId === CANDY_BLAST_GAME_ID || selectedId === "candy-blast";
  const isSweetRush = selectedId === SWEET_RUSH_GAME_ID || selectedId === "sweet-rush";
  const isStarlightWays = selectedId === STARLIGHT_WAYS_GAME_ID || selectedId === "starlight-ways";
  const isGalaxyAce = selectedId === GALAXY_ACE_GAME_ID || selectedId === "galaxy-ace";
  const isGateOfRa = selectedId === GATE_OF_RA_GAME_ID || selectedId === "gate-of-ra";
  const isMysticRunes = selectedId === MYSTIC_RUNES_GAME_ID || selectedId === "mystic-runes";
  const isWildPanther =
    selectedId === WILD_PANTHER_GAME_ID || selectedId === "wild-panther";
  const isRiceFieldRiches =
    selectedId === RICE_FIELD_RICHES_GAME_ID || selectedId === "rice-field-riches";
  const isCarabaoCash =
    selectedId === CARABAO_CASH_GAME_ID || selectedId === "carabao-cash";
  const isQuezonQuest =
    selectedId === QUEZON_QUEST_GAME_ID || selectedId === "quezon-quest";
  const isNeonMakati =
    selectedId === NEON_MAKATI_GAME_ID || selectedId === "neon-makati";
  const isIslandFever =
    selectedId === ISLAND_FEVER_GAME_ID || selectedId === "island-fever";
  const isBeachBonanza =
    selectedId === BEACH_BONANZA_GAME_ID || selectedId === "beach-bonanza";
  const isTricycleTreasure =
    selectedId === TRICYCLE_TREASURE_GAME_ID || selectedId === "tricycle-treasure";
  const isPalengkePays =
    selectedId === PALENGKE_PAYS_GAME_ID || selectedId === "palengke-pays";
  const isLanternLuck =
    selectedId === LANTERN_LUCK_GAME_ID || selectedId === "lantern-luck";
  const isLechonLuck =
    selectedId === LECHON_LUCK_GAME_ID || selectedId === "lechon-luck";
  const isSinigangSpin =
    selectedId === SINIGANG_SPIN_GAME_ID || selectedId === "sinigang-spin";
  const isBalutBonus =
    selectedId === BALUT_BONUS_GAME_ID || selectedId === "balut-bonus";
  const isHaloHaloHits =
    selectedId === HALO_HALO_HITS_GAME_ID || selectedId === "halo-halo-hits";
  const isPinataWins = selectedId === PINATA_WINS_GAME_ID || selectedId === "pinata-wins";
  const isAceHigh = selectedId === ACE_HIGH_GAME_ID || selectedId === "ace-high";
  const isBaccarat = selectedId === BACCARAT_GAME_ID || selectedId === "baccarat";
  const isLucky9 = selectedId === LUCKY9_GAME_ID || selectedId === "lucky9";
  const isThreeCardPoker =
    selectedId === THREE_CARD_POKER_GAME_ID || selectedId === "threecardpoker";
  const isColorGame = selectedId === COLOR_GAME_GAME_ID || selectedId === "color-game";
  const isTongitsArena =
    selectedId === TONGITS_ARENA_GAME_ID || selectedId === "tongits-arena";
  const isLuckyDrop = selectedId === LUCKY_DROP_GAME_ID || selectedId === "lucky-drop";
  const isDeepBass = selectedId === DEEP_BASS_GAME_ID || selectedId === "deep-bass";
  const isDragonFisher =
    selectedId === DRAGON_FISHER_GAME_ID || selectedId === "dragon-fisher";
  const isCrabCannon =
    selectedId === CRAB_CANNON_GAME_ID || selectedId === "crab-cannon";
  const isPhoenixFisher =
    selectedId === PHOENIX_FISHER_GAME_ID || selectedId === "phoenix-fisher";
  const isSharkHunter =
    selectedId === SHARK_HUNTER_GAME_ID || selectedId === "shark-hunter";
  const isOctopusArmada =
    selectedId === OCTOPUS_ARMADA_GAME_ID || selectedId === "octopus-armada";
  const isTurtleTide =
    selectedId === TURTLE_TIDE_GAME_ID || selectedId === "turtle-tide";
  const isWhaleWar = selectedId === WHALE_WAR_GAME_ID || selectedId === "whale-war";
  const isColorGamePro =
    selectedId === COLOR_GAME_PRO_GAME_ID || selectedId === "color-game-pro";
  const isLuckyNinePlus =
    selectedId === LUCKY_NINE_PLUS_GAME_ID || selectedId === "lucky-nine-plus";
  const isDropDeluxe =
    selectedId === DROP_DELUXE_GAME_ID || selectedId === "drop-deluxe";
  const isPokerShowdown =
    selectedId === POKER_SHOWDOWN_GAME_ID || selectedId === "poker-showdown";
  const hasFullEngine = selectedId !== "" && FULL_ENGINE_IDS.has(selectedId);
  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-black tracking-tight text-foreground sm:text-3xl">
          <span className="sm:hidden">Games Control</span>
          <span className="hidden sm:inline">Super Admin Game Control Panel</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Bulk outcome controls for all casino titles. Adjust settings globally or target specific game
          categories. Thumbnail-only titles (no playable engine yet) are hidden and disabled for soft
          launch.
        </p>
      </div>

      {/* Global Master Panel */}
      <BulkOutcomePanel onApplied={() => void load()} />

      {/* Spot Overrides Section */}
      <div className="space-y-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Per-Game Spot Overrides</h2>
            <p className="text-xs text-muted-foreground">
              Secondary exception path: click any individual game card below for spot-overrides.
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="pl-9 h-9 border-amber-500/20 bg-white/[0.04] text-xs text-foreground"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGames.map((g) => (
            <button
              key={g.gameId}
              type="button"
              onClick={() => setSelected(g)}
              className={`${saGlass} group overflow-hidden text-left transition hover:ring-2 hover:ring-amber-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400`}
            >
              <div className="relative aspect-[16/10]">
                <img
                  src={g.thumb}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-base font-black uppercase leading-tight text-foreground">{g.name}</div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {g.category}
                    {FULL_ENGINE_IDS.has(g.gameId) ? " · full config" : ""}
                  </div>
                </div>
                {!g.enabled && (
                  <div className="absolute right-3 top-3 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase text-foreground">
                    Disabled
                  </div>
                )}
                {g.enabled && g.featured && (
                  <div className="absolute right-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                    Featured
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && isCandy ? (
        <CandyPeakConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isMermaidRiches ? (
        <MermaidRichesConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isSugar ? (
        <SugarSurgeConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isBoracayBounce ? (
        <BoracayBounceConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isGodly ? (
        <GodlyGatesConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isOlympusWrath ? (
        <OlympusWrathConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isEnchantedGrove ? (
        <EnchantedGroveConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isPanther ? (
        <GoldenPantherConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isAztec ? (
        <AztecTreasureConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isPiratePlunder ? (
        <PiratePlunderConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isMahjong ? (
        <MahjongWaysConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isMahjong2 ? (
        <MahjongWays2ConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isDragonPhoenix ? (
        <DragonPhoenixConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isStarlight ? (
        <StarlightAceConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isManilaNights ? (
        <ManilaNightsConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isSuperAce ? (
        <SuperAceConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isMegaAce ? (
        <MegaAceConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isFrontier ? (
        <FrontierGoldConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isDustDollars ? (
        <DustDollarsConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isGoldMine ? (
        <GoldMineConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isJeepneyJackpot ? (
        <JeepneyJackpotConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isBuffalo ? (
        <BuffaloReignConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCleopatraGold ? (
        <CleopatraGoldConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCarabaoCharge ? (
        <CarabaoChargeConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCny ? (
        <ChineseNewYearConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isFiestaFireworks ? (
        <FiestaFireworksConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isFireSpike ? (
        <FireSpikeConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isBoxingKing ? (
        <BoxingKingConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isGoalRush ? (
        <GoalRushConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isMoneyComing ? (
        <MoneyComingConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isFortuneGems ? (
        <FortuneGemsConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isFortuneOx ? (
        <FortuneOxConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isSariSariSpin ? (
        <SariSariSpinConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isFortuneTiger ? (
        <FortuneTigerConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isFortuneRabbit ? (
        <FortuneRabbitConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isPugDen ? (
        <PugDenConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isFruitRiot ? (
        <FruitRiotConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isLuckyNeko ? (
        <LuckyNekoConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isFortuneMouse ? (
        <FortuneMouseConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isProsperityLion ? (
        <ProsperityLionConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCoinVolcano ? (
        <CoinVolcanoConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCashMania ? (
        <CashManiaConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isZeusStrike ? (
        <ZeusStrikeConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isThorThunder ? (
        <ThorThunderConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isMayaGold ? (
        <MayaGoldConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isTempleRush ? (
        <TempleRushConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isMahjong3 ? (
        <MahjongWays3ConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isWildAce ? (
        <WildAceConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isRoyalAce ? (
        <RoyalAceConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isNeonFruits ? (
        <NeonFruitsConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isLuckyBars ? (
        <LuckyBarsConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCrazySevens ? (
        <CrazySevensConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isPinataWins ? (
        <PinataWinsConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isAceHigh ? (
        <AceHighConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isBaccarat ? (
        <BaccaratConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isLucky9 ? (
        <Lucky9ConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isThreeCardPoker ? (
        <ThreeCardPokerConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isColorGame ? (
        <ColorGameConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isTongitsArena ? (
        <TongitsArenaConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isLuckyDrop ? (
        <LuckyDropConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isDeepBass ? (
        <DeepBassConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isDragonFisher ? (
        <DragonFisherConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCrabCannon ? (
        <CrabCannonConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isPhoenixFisher ? (
        <PhoenixFisherConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isSharkHunter ? (
        <SharkHunterConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isOctopusArmada ? (
        <OctopusArmadaConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isTurtleTide ? (
        <TurtleTideConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isWhaleWar ? (
        <WhaleWarConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isColorGamePro ? (
        <ColorGameProConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isLuckyNinePlus ? (
        <LuckyNinePlusConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isDropDeluxe ? (
        <DropDeluxeConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isPokerShowdown ? (
        <PokerShowdownConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isKnockoutKing ? (
        <KnockoutKingConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isArenaChamp ? (
        <ArenaChampConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isSafariGold ? (
        <SafariGoldConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isPharaohFire ? (
        <PharaohFireConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isDesertRiches ? (
        <DesertRichesConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isOutlawCoins ? (
        <OutlawCoinsConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCrystalCave ? (
        <CrystalCaveConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isDiamondDig ? (
        <DiamondDigConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCandyBlast ? (
        <CandyBlastConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isSweetRush ? (
        <SweetRushConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isStarlightWays ? (
        <StarlightWaysConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isGalaxyAce ? (
        <GalaxyAceConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isGateOfRa ? (
        <GateOfRaConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isMysticRunes ? (
        <MysticRunesConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isHaloHaloHits ? (
        <HaloHaloHitsConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isBalutBonus ? (
        <BalutBonusConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isSinigangSpin ? (
        <SinigangSpinConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isLechonLuck ? (
        <LechonLuckConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isLanternLuck ? (
        <LanternLuckConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isPalengkePays ? (
        <PalengkePaysConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isTricycleTreasure ? (
        <TricycleTreasureConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isBeachBonanza ? (
        <BeachBonanzaConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isIslandFever ? (
        <IslandFeverConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isNeonMakati ? (
        <NeonMakatiConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isQuezonQuest ? (
        <QuezonQuestConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCarabaoCash ? (
        <CarabaoCashConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isRiceFieldRiches ? (
        <RiceFieldRichesConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isWildPanther ? (
        <WildPantherConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && !hasFullEngine ? (
        <GameControlModal
          game={selected}
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatch={patch}
        />
      ) : null}
    </div>
  );
}

function GameControlModal({
  game,
  open,
  onOpenChange,
  onPatch,
}: {
  game: SuperGameRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (
    gameId: string,
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) => Promise<void>;
}) {
  if (!game) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(100%-1.5rem,28rem)] overflow-y-auto border-amber-500/20 bg-panel p-0 text-foreground sm:rounded-2xl">
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl">
          <img src={game.thumb} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A120E] via-[#1A120E]/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-xl font-black uppercase tracking-wide text-foreground">
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {game.category} · {game.gameId}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onPatch(game.gameId, { enabled: !game.enabled })}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                game.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              }`}
            >
              {game.enabled ? "Enabled" : "Disabled"}
            </button>
            <button
              type="button"
              onClick={() => void onPatch(game.gameId, { featured: !game.featured })}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                game.featured ? "bg-amber-500/20 text-amber-300" : "bg-white/[0.06] text-muted-foreground"
              }`}
            >
              {game.featured ? "Featured" : "Not featured"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Tag"
              value={game.tag ?? ""}
              onSave={(v) => void onPatch(game.gameId, { tag: v || null })}
            />
            <Field
              label="RTP"
              value={game.rtp ?? ""}
              onSave={(v) => void onPatch(game.gameId, { rtp: v || null })}
            />
            <Field
              label="Min bet"
              value={game.minBet ?? ""}
              onSave={(v) => void onPatch(game.gameId, { minBet: v || null })}
            />
            <Field
              label="Max bet"
              value={game.maxBet ?? ""}
              onSave={(v) => void onPatch(game.gameId, { maxBet: v || null })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onSave(local);
        }}
        className="mt-1 h-9 rounded-lg border-amber-500/20 bg-white/[0.06] text-xs text-foreground"
      />
    </label>
  );
}
