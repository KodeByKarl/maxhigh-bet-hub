import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { bulkApplyGameOutcomesFn, listGameSettingsLogsFn, listSuperGamesFn, superUpdateGameFn } from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { CANDY_PEAK_GAME_ID } from "@/lib/candy-peak-config";
import { GODLY_GATES_GAME_ID } from "@/lib/godly-gates-config";
import { SUGAR_SURGE_GAME_ID } from "@/lib/sugar-surge-config";
import { GOLDEN_PANTHER_GAME_ID } from "@/lib/golden-panther-config";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CandyPeakConfigModal } from "@/components/superadmin/games/CandyPeakConfigModal";
import { GodlyGatesConfigModal } from "@/components/superadmin/games/GodlyGatesConfigModal";
import { SugarSurgeConfigModal } from "@/components/superadmin/games/SugarSurgeConfigModal";
import { GoldenPantherConfigModal } from "@/components/superadmin/games/GoldenPantherConfigModal";
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

function BulkOutcomePanel({ onApplied }: { onApplied: () => void }) {
  const [scope, setScope] = useState<"all" | "slots" | "cards" | "fishing">("all");
  const [deadSpinPct, setDeadSpinPct] = useState(40);
  const [winChancePct, setWinChancePct] = useState(60);
  const [maxMultiplier, setMaxMultiplier] = useState(5000);
  const [rtp, setRtp] = useState(96);
  const [applying, setApplying] = useState(false);
  const [logs, setLogs] = useState<GameSettingsLogRow[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await listGameSettingsLogsFn();
      setLogs(res as GameSettingsLogRow[]);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

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
      await fetchLogs();
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
            disabled={applying}
            onClick={() => void handleBulkApply()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            {applying ? "Applying..." : `Apply to ${scope === "all" ? "All Games" : scope}`}
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

  const isCandy = selected?.gameId === CANDY_PEAK_GAME_ID;
  const isGodly = selected?.gameId === GODLY_GATES_GAME_ID;
  const isSugar = selected?.gameId === SUGAR_SURGE_GAME_ID;
  const isPanther = selected?.gameId === GOLDEN_PANTHER_GAME_ID || selected?.gameId === "golden-panther";

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Super Admin Game Control Panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bulk outcome controls for all casino titles. Adjust settings globally or target specific game categories.
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
                    {g.gameId === CANDY_PEAK_GAME_ID ||
                    g.gameId === GODLY_GATES_GAME_ID ||
                    g.gameId === SUGAR_SURGE_GAME_ID ||
                    g.gameId === GOLDEN_PANTHER_GAME_ID
                      ? " · full config"
                      : ""}
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
      ) : selected && isSugar ? (
        <SugarSurgeConfigModal
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
      ) : selected && isPanther ? (
        <GoldenPantherConfigModal
          game={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatchLobby={(data) => patch(selected.gameId, data)}
        />
      ) : (
        <GameControlModal
          game={selected}
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onPatch={patch}
        />
      )}
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
