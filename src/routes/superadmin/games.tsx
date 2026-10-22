import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bulkApplyGameOutcomesFn,
  getBulkOutcomeSettingsFn,
  listGameSettingsLogsFn,
  listSuperGamesFn,
  superUpdateGameFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { GODLY_GATES_GAME_ID } from "@/lib/godly-gates-config";
import { OLYMPUS_WRATH_GAME_ID } from "@/lib/olympus-wrath-config";
import { ENCHANTED_GROVE_GAME_ID } from "@/lib/enchanted-grove-config";
import { GOLDEN_PANTHER_GAME_ID } from "@/lib/golden-panther-config";
import { BUFFALO_REIGN_GAME_ID } from "@/lib/buffalo-reign-config";
import { FIRE_SPIKE_GAME_ID } from "@/lib/fire-spike-config";
import { FORTUNE_OX_GAME_ID } from "@/lib/fortune-ox-config";
import { FORTUNE_TIGER_GAME_ID } from "@/lib/fortune-tiger-config";
import { FORTUNE_RABBIT_GAME_ID } from "@/lib/fortune-rabbit-config";
import { CLEOPATRA_GOLD_GAME_ID } from "@/lib/cleopatra-gold-config";
import { LUCKY_NEKO_GAME_ID } from "@/lib/lucky-neko-config";
import { FORTUNE_MOUSE_GAME_ID } from "@/lib/fortune-mouse-config";
import { PROSPERITY_LION_GAME_ID } from "@/lib/prosperity-lion-config";
import { COIN_VOLCANO_GAME_ID } from "@/lib/coin-volcano-config";
import { ZEUS_STRIKE_GAME_ID } from "@/lib/zeus-strike-config";
import { THOR_THUNDER_GAME_ID } from "@/lib/thor-thunder-config";
import { MAYA_GOLD_GAME_ID } from "@/lib/maya-gold-config";
import { TEMPLE_RUSH_GAME_ID } from "@/lib/temple-rush-config";
import { SAFARI_GOLD_GAME_ID } from "@/lib/safari-gold-config";
import { PHARAOH_FIRE_GAME_ID } from "@/lib/pharaoh-fire-config";
import { DESERT_RICHES_GAME_ID } from "@/lib/desert-riches-config";
import { GATE_OF_RA_GAME_ID } from "@/lib/gate-of-ra-config";
import { WILD_PANTHER_GAME_ID } from "@/lib/wild-panther-config";
import { RUBY_RAVEN_GAME_ID } from "@/lib/ruby-raven-config";
import { MIDNIGHT_OWL_GAME_ID } from "@/lib/midnight-owl-config";
import { HONEY_HIVE_GAME_ID } from "@/lib/honey-hive-config";
import { SOLAR_SERPENT_GAME_ID } from "@/lib/solar-serpent-config";
import { FROST_FOX_GAME_ID } from "@/lib/frost-fox-config";
import { CORAL_COBRA_GAME_ID } from "@/lib/coral-cobra-config";
import { LOTUS_LYNX_GAME_ID } from "@/lib/lotus-lynx-config";
import { EMBER_TIGER_GAME_ID } from "@/lib/ember-tiger-config";
import { JADE_JAGUAR_GAME_ID } from "@/lib/jade-jaguar-config";
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
import { GodlyGatesConfigModal } from "@/components/superadmin/games/GodlyGatesConfigModal";
import { OlympusWrathConfigModal } from "@/components/superadmin/games/OlympusWrathConfigModal";
import { EnchantedGroveConfigModal } from "@/components/superadmin/games/EnchantedGroveConfigModal";
import { GoldenPantherConfigModal } from "@/components/superadmin/games/GoldenPantherConfigModal";
import { BuffaloReignConfigModal } from "@/components/superadmin/games/BuffaloReignConfigModal";
import { FireSpikeConfigModal } from "@/components/superadmin/games/FireSpikeConfigModal";
import { FortuneOxConfigModal } from "@/components/superadmin/games/FortuneOxConfigModal";
import { FortuneTigerConfigModal } from "@/components/superadmin/games/FortuneTigerConfigModal";
import { FortuneRabbitConfigModal } from "@/components/superadmin/games/FortuneRabbitConfigModal";
import { CleopatraGoldConfigModal } from "@/components/superadmin/games/CleopatraGoldConfigModal";
import { LuckyNekoConfigModal } from "@/components/superadmin/games/LuckyNekoConfigModal";
import { FortuneMouseConfigModal } from "@/components/superadmin/games/FortuneMouseConfigModal";
import { ProsperityLionConfigModal } from "@/components/superadmin/games/ProsperityLionConfigModal";
import { CoinVolcanoConfigModal } from "@/components/superadmin/games/CoinVolcanoConfigModal";
import { ZeusStrikeConfigModal } from "@/components/superadmin/games/ZeusStrikeConfigModal";
import { ThorThunderConfigModal } from "@/components/superadmin/games/ThorThunderConfigModal";
import { MayaGoldConfigModal } from "@/components/superadmin/games/MayaGoldConfigModal";
import { TempleRushConfigModal } from "@/components/superadmin/games/TempleRushConfigModal";
import { SafariGoldConfigModal } from "@/components/superadmin/games/SafariGoldConfigModal";
import { PharaohFireConfigModal } from "@/components/superadmin/games/PharaohFireConfigModal";
import { DesertRichesConfigModal } from "@/components/superadmin/games/DesertRichesConfigModal";
import { GateOfRaConfigModal } from "@/components/superadmin/games/GateOfRaConfigModal";
import { WildPantherConfigModal } from "@/components/superadmin/games/WildPantherConfigModal";
import { RubyRavenConfigModal } from "@/components/superadmin/games/RubyRavenConfigModal";
import { MidnightOwlConfigModal } from "@/components/superadmin/games/MidnightOwlConfigModal";
import { HoneyHiveConfigModal } from "@/components/superadmin/games/HoneyHiveConfigModal";
import { SolarSerpentConfigModal } from "@/components/superadmin/games/SolarSerpentConfigModal";
import { FrostFoxConfigModal } from "@/components/superadmin/games/FrostFoxConfigModal";
import { CoralCobraConfigModal } from "@/components/superadmin/games/CoralCobraConfigModal";
import { LotusLynxConfigModal } from "@/components/superadmin/games/LotusLynxConfigModal";
import { EmberTigerConfigModal } from "@/components/superadmin/games/EmberTigerConfigModal";
import { JadeJaguarConfigModal } from "@/components/superadmin/games/JadeJaguarConfigModal";
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
import { SharkHunterConfigModal } from "@/components/superadmin/games/SharkHunterConfigModal";
import { OctopusArmadaConfigModal } from "@/components/superadmin/games/OctopusArmadaConfigModal";
import { TurtleTideConfigModal } from "@/components/superadmin/games/TurtleTideConfigModal";
import { WhaleWarConfigModal } from "@/components/superadmin/games/WhaleWarConfigModal";
import { ColorGameProConfigModal } from "@/components/superadmin/games/ColorGameProConfigModal";
import { LuckyNinePlusConfigModal } from "@/components/superadmin/games/LuckyNinePlusConfigModal";
import { DropDeluxeConfigModal } from "@/components/superadmin/games/DropDeluxeConfigModal";
import { PokerShowdownConfigModal } from "@/components/superadmin/games/PokerShowdownConfigModal";
import { saGlass } from "@/components/superadmin/ui/glass";
import { RealmsConfigModal } from "@/components/superadmin/games/RealmsConfigModal";
import { REALMS_GAME_IDS, isRealmsGameId } from "@/lib/realms";
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
              Manage RTP, dead spin rates, and payout limits across all games in one batch
              operation.
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
            <span className="font-bold uppercase tracking-wide text-amber-300">
              Unsaved changes
            </span>
            <span className="mt-1 block text-amber-100/90">
              Moving the sliders does not change live games yet. Tap{" "}
              <strong className="text-amber-200">
                Apply to {scope === "all" ? "All Games" : scope}
              </strong>{" "}
              before playing — otherwise spins still use the last saved settings.
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
                onClick={() => setScope(cat.id as typeof scope)}
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
                      <td className="py-2 px-3 font-semibold text-amber-300">
                        @{log.actorUsername}
                      </td>
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
  }, [user, load]);

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
    ...REALMS_GAME_IDS,
    GODLY_GATES_GAME_ID,
    OLYMPUS_WRATH_GAME_ID,
    "olympus-wrath",
    ENCHANTED_GROVE_GAME_ID,
    "enchanted-grove",
    GOLDEN_PANTHER_GAME_ID,
    "golden-panther",
    BUFFALO_REIGN_GAME_ID,
    "buffalo-reign",
    CLEOPATRA_GOLD_GAME_ID,
    "cleopatra-gold",
    FIRE_SPIKE_GAME_ID,
    "fire-spike",
    FORTUNE_OX_GAME_ID,
    "fortune-ox",
    FORTUNE_TIGER_GAME_ID,
    "fortune-tiger",
    FORTUNE_RABBIT_GAME_ID,
    "fortune-rabbit",
    LUCKY_NEKO_GAME_ID,
    "lucky-neko",
    FORTUNE_MOUSE_GAME_ID,
    "fortune-mouse",
    PROSPERITY_LION_GAME_ID,
    "prosperity-lion",
    COIN_VOLCANO_GAME_ID,
    "coin-volcano",
    ZEUS_STRIKE_GAME_ID,
    "zeus-strike",
    THOR_THUNDER_GAME_ID,
    "thor-thunder",
    MAYA_GOLD_GAME_ID,
    "maya-gold",
    TEMPLE_RUSH_GAME_ID,
    "temple-rush",
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
    JADE_JAGUAR_GAME_ID,
    "jade-jaguar",
    EMBER_TIGER_GAME_ID,
    "ember-tiger",
    LOTUS_LYNX_GAME_ID,
    "lotus-lynx",
    CORAL_COBRA_GAME_ID,
    "coral-cobra",
    FROST_FOX_GAME_ID,
    "frost-fox",
    SOLAR_SERPENT_GAME_ID,
    "solar-serpent",
    HONEY_HIVE_GAME_ID,
    "honey-hive",
    MIDNIGHT_OWL_GAME_ID,
    "midnight-owl",
    RUBY_RAVEN_GAME_ID,
    "ruby-raven",
    WILD_PANTHER_GAME_ID,
    "wild-panther",
    SAFARI_GOLD_GAME_ID,
    "safari-gold",
  ]);

  const selectedId = selected?.gameId ?? "";
  const isGodly = selectedId === GODLY_GATES_GAME_ID;
  const isOlympusWrath = selectedId === OLYMPUS_WRATH_GAME_ID || selectedId === "olympus-wrath";
  const isEnchantedGrove =
    selectedId === ENCHANTED_GROVE_GAME_ID || selectedId === "enchanted-grove";
  const isPanther = selectedId === GOLDEN_PANTHER_GAME_ID || selectedId === "golden-panther";
  const isBuffalo = selectedId === BUFFALO_REIGN_GAME_ID || selectedId === "buffalo-reign";
  const isCleopatraGold = selectedId === CLEOPATRA_GOLD_GAME_ID || selectedId === "cleopatra-gold";
  const isFireSpike = selectedId === FIRE_SPIKE_GAME_ID || selectedId === "fire-spike";
  const isFortuneOx = selectedId === FORTUNE_OX_GAME_ID || selectedId === "fortune-ox";
  const isFortuneTiger = selectedId === FORTUNE_TIGER_GAME_ID || selectedId === "fortune-tiger";
  const isFortuneRabbit = selectedId === FORTUNE_RABBIT_GAME_ID || selectedId === "fortune-rabbit";
  const isLuckyNeko = selectedId === LUCKY_NEKO_GAME_ID || selectedId === "lucky-neko";
  const isFortuneMouse = selectedId === FORTUNE_MOUSE_GAME_ID || selectedId === "fortune-mouse";
  const isProsperityLion =
    selectedId === PROSPERITY_LION_GAME_ID || selectedId === "prosperity-lion";
  const isCoinVolcano = selectedId === COIN_VOLCANO_GAME_ID || selectedId === "coin-volcano";
  const isZeusStrike = selectedId === ZEUS_STRIKE_GAME_ID || selectedId === "zeus-strike";
  const isThorThunder = selectedId === THOR_THUNDER_GAME_ID || selectedId === "thor-thunder";
  const isMayaGold = selectedId === MAYA_GOLD_GAME_ID || selectedId === "maya-gold";
  const isTempleRush = selectedId === TEMPLE_RUSH_GAME_ID || selectedId === "temple-rush";
  const isSafariGold = selectedId === SAFARI_GOLD_GAME_ID || selectedId === "safari-gold";
  const isPharaohFire = selectedId === PHARAOH_FIRE_GAME_ID || selectedId === "pharaoh-fire";
  const isDesertRiches = selectedId === DESERT_RICHES_GAME_ID || selectedId === "desert-riches";
  const isGateOfRa = selectedId === GATE_OF_RA_GAME_ID || selectedId === "gate-of-ra";
  const isWildPanther = selectedId === WILD_PANTHER_GAME_ID || selectedId === "wild-panther";
  const isGodlyGates = selectedId === GODLY_GATES_GAME_ID || selectedId === "godly-gates";
  const isBuffaloReign = selectedId === BUFFALO_REIGN_GAME_ID || selectedId === "buffalo-reign";
  const isRubyRaven = selectedId === RUBY_RAVEN_GAME_ID || selectedId === "ruby-raven";
  const isMidnightOwl = selectedId === MIDNIGHT_OWL_GAME_ID || selectedId === "midnight-owl";
  const isHoneyHive = selectedId === HONEY_HIVE_GAME_ID || selectedId === "honey-hive";
  const isSolarSerpent = selectedId === SOLAR_SERPENT_GAME_ID || selectedId === "solar-serpent";
  const isFrostFox = selectedId === FROST_FOX_GAME_ID || selectedId === "frost-fox";
  const isCoralCobra = selectedId === CORAL_COBRA_GAME_ID || selectedId === "coral-cobra";
  const isLotusLynx = selectedId === LOTUS_LYNX_GAME_ID || selectedId === "lotus-lynx";
  const isEmberTiger = selectedId === EMBER_TIGER_GAME_ID || selectedId === "ember-tiger";
  const isJadeJaguar = selectedId === JADE_JAGUAR_GAME_ID || selectedId === "jade-jaguar";
  const isAceHigh = selectedId === ACE_HIGH_GAME_ID || selectedId === "ace-high";
  const isBaccarat = selectedId === BACCARAT_GAME_ID || selectedId === "baccarat";
  const isLucky9 = selectedId === LUCKY9_GAME_ID || selectedId === "lucky9";
  const isThreeCardPoker =
    selectedId === THREE_CARD_POKER_GAME_ID || selectedId === "threecardpoker";
  const isColorGame = selectedId === COLOR_GAME_GAME_ID || selectedId === "color-game";
  const isTongitsArena = selectedId === TONGITS_ARENA_GAME_ID || selectedId === "tongits-arena";
  const isLuckyDrop = selectedId === LUCKY_DROP_GAME_ID || selectedId === "lucky-drop";
  const isDeepBass = selectedId === DEEP_BASS_GAME_ID || selectedId === "deep-bass";
  const isDragonFisher = selectedId === DRAGON_FISHER_GAME_ID || selectedId === "dragon-fisher";
  const isCrabCannon = selectedId === CRAB_CANNON_GAME_ID || selectedId === "crab-cannon";
  const isSharkHunter = selectedId === SHARK_HUNTER_GAME_ID || selectedId === "shark-hunter";
  const isOctopusArmada = selectedId === OCTOPUS_ARMADA_GAME_ID || selectedId === "octopus-armada";
  const isTurtleTide = selectedId === TURTLE_TIDE_GAME_ID || selectedId === "turtle-tide";
  const isWhaleWar = selectedId === WHALE_WAR_GAME_ID || selectedId === "whale-war";
  const isColorGamePro = selectedId === COLOR_GAME_PRO_GAME_ID || selectedId === "color-game-pro";
  const isLuckyNinePlus =
    selectedId === LUCKY_NINE_PLUS_GAME_ID || selectedId === "lucky-nine-plus";
  const isDropDeluxe = selectedId === DROP_DELUXE_GAME_ID || selectedId === "drop-deluxe";
  const isPokerShowdown = selectedId === POKER_SHOWDOWN_GAME_ID || selectedId === "poker-showdown";
  const hasFullEngine = selectedId !== "" && FULL_ENGINE_IDS.has(selectedId);
  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-black tracking-tight text-foreground sm:text-3xl">
          <span className="sm:hidden">Games Control</span>
          <span className="hidden sm:inline">Super Admin Game Control Panel</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Bulk outcome controls for all casino titles. Adjust settings globally or target specific
          game categories. Thumbnail-only titles (no playable engine yet) are hidden and disabled
          for soft launch.
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
                  <div className="text-base font-black uppercase leading-tight text-foreground">
                    {g.name}
                  </div>
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

      {selected && isRealmsGameId(selected.gameId) ? (
        <RealmsConfigModal
          key={selected.gameId}
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
      ) : selected && isFireSpike ? (
        <FireSpikeConfigModal
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
      ) : selected && isGateOfRa ? (
        <GateOfRaConfigModal
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
      ) : selected && isJadeJaguar ? (
        <JadeJaguarConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isEmberTiger ? (
        <EmberTigerConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isLotusLynx ? (
        <LotusLynxConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isCoralCobra ? (
        <CoralCobraConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isFrostFox ? (
        <FrostFoxConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isSolarSerpent ? (
        <SolarSerpentConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isHoneyHive ? (
        <HoneyHiveConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isMidnightOwl ? (
        <MidnightOwlConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : selected && isRubyRaven ? (
        <RubyRavenConfigModal
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
                game.featured
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-white/[0.06] text-muted-foreground"
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
