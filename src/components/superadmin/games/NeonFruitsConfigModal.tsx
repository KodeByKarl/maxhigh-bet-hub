import { useEffect, useMemo, useState } from "react";
import {
  Coins,
  Flame,
  LayoutGrid,
  Save,
  Settings2,
  Store,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_NEON_FRUITS_CONFIG,
  normalizeNeonFruitsConfig,
  type NeonFruitsConfig,
  type RrSymKind,
} from "@/lib/neon-fruits-config";
import {
  getNeonFruitsEngineConfigFn,
  saveNeonFruitsEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { ICON_SRC } from "@/components/maxhigh/neon-fruits/animationConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "lobby" | "symbols" | "specials" | "bonus" | "jackpot" | "risk";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "symbols", label: "Pays / Weights", icon: LayoutGrid },
  { id: "specials", label: "Wilds / Hold", icon: Flame },
  { id: "bonus", label: "Bonus Ladder", icon: Settings2 },
  { id: "jackpot", label: "Jackpot", icon: Coins },
  { id: "risk", label: "Risk / Bets", icon: Coins },
];

type Props = {
  game: SuperGameRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatchLobby: (
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) => Promise<void>;
};

function Num({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <Input
      type="number"
      className="h-9 bg-white/[0.06]"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function SymThumb({ kind, name }: { kind: RrSymKind; name: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-fuchsia-500/30 bg-black/50">
      {!broken ? (
        <img
          src={ICON_SRC[kind]}
          alt={name}
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="px-1 text-center text-[8px] font-black uppercase text-fuchsia-300">
          {kind}
        </span>
      )}
    </div>
  );
}

function weightPercents(cfg: NeonFruitsConfig, reelIndex = 0): Record<string, number> {
  const total = cfg.symbols.reduce(
    (a, s) => a + Math.max(0, s.reelWeights[reelIndex] ?? 0),
    0,
  );
  const out: Record<string, number> = {};
  for (const s of cfg.symbols) {
    const w = Math.max(0, s.reelWeights[reelIndex] ?? 0);
    out[s.kind] = total > 0 ? +((w / total) * 100).toFixed(2) : 0;
  }
  return out;
}

export function NeonFruitsConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<NeonFruitsConfig>(() =>
    structuredClone(DEFAULT_NEON_FRUITS_CONFIG),
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [tag, setTag] = useState(game.tag ?? "");
  const [lobbyRtp, setLobbyRtp] = useState(Number(game.rtp) || 95);
  const [volatility, setVolatility] = useState(game.volatility ?? "Medium");
  const [lobbyMinBet, setLobbyMinBet] = useState(Number(game.minBet) || 1);
  const [lobbyMaxBet, setLobbyMaxBet] = useState(Number(game.maxBet) || 5);
  const [lobbyBusy, setLobbyBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setTag(game.tag ?? "");
    setLobbyRtp(Number(game.rtp) || 95);
    setVolatility(game.volatility ?? "Medium");
    setLobbyMinBet(Number(game.minBet) || 1);
    setLobbyMaxBet(Number(game.maxBet) || 5);
    setLoading(true);
    void getNeonFruitsEngineConfigFn()
      .then((c) => setCfg(normalizeNeonFruitsConfig(c)))
      .catch(() => {
        toast.error("Failed loading config — defaults");
        setCfg(structuredClone(DEFAULT_NEON_FRUITS_CONFIG));
      })
      .finally(() => setLoading(false));
  }, [open, game]);

  const weightPct = useMemo(() => weightPercents(cfg, 0), [cfg]);

  function patch(p: Partial<NeonFruitsConfig>) {
    setCfg((c) => normalizeNeonFruitsConfig({ ...c, ...p }));
  }

  async function saveEngine() {
    setSaving(true);
    try {
      const next = await saveNeonFruitsEngineConfigFn({
        data: { config: normalizeNeonFruitsConfig(cfg) },
      });
      setCfg(normalizeNeonFruitsConfig(next));
      toast.success("Crazy Sevens engine saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveLobby() {
    setLobbyBusy(true);
    try {
      await onPatchLobby({
        tag: tag.trim() || undefined,
        rtp: String(lobbyRtp),
        volatility: volatility.trim() || "Medium",
        minBet: String(lobbyMinBet),
        maxBet: String(lobbyMaxBet),
      });
      toast.success("Lobby settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lobby save failed");
    } finally {
      setLobbyBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(100%-1rem,48rem)] flex-col gap-0 overflow-hidden border-fuchsia-500/20 bg-panel p-0">
        <div className="relative h-28 shrink-0 overflow-hidden">
          <img src={game.thumb} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16120F] to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-foreground">
                <Flame size={18} className="text-fuchsia-400" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Full engine · 3 reels · 1 payline · Wilds + Bonus Ladder + JP — {game.gameId}
              </DialogDescription>
            </DialogHeader>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-white/20 p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-fuchsia-500/15 px-3 py-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold",
                section === item.id
                  ? "bg-fuchsia-500 text-white"
                  : "bg-white/[0.04] text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon size={13} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : section === "lobby" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onPatchLobby({ enabled: !game.enabled })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    game.enabled
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400",
                  )}
                >
                  {game.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => void onPatchLobby({ featured: !game.featured })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    game.featured
                      ? "bg-fuchsia-500/20 text-fuchsia-300"
                      : "bg-white/[0.06] text-muted-foreground",
                  )}
                >
                  {game.featured ? "Featured" : "Not featured"}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Tag
                  <Input
                    className="h-9 bg-white/[0.06]"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Hot / New"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Lobby RTP label
                  <Num value={lobbyRtp} onChange={setLobbyRtp} step={0.01} min={80} max={99} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Volatility
                  <Input
                    className="h-9 bg-white/[0.06]"
                    value={volatility}
                    onChange={(e) => setVolatility(e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Lobby min bet
                  <Num value={lobbyMinBet} onChange={setLobbyMinBet} step={0.01} min={0.01} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Lobby max bet
                  <Num value={lobbyMaxBet} onChange={setLobbyMaxBet} step={0.01} min={0.01} />
                </label>
              </div>
              <button
                type="button"
                disabled={lobbyBusy}
                onClick={() => void saveLobby()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-500/40 py-2.5 text-sm font-black uppercase text-fuchsia-200 disabled:opacity-50"
              >
                <Save size={16} />
                {lobbyBusy ? "Saving…" : "Save lobby"}
              </button>
            </>
          ) : section === "symbols" ? (
            <>
              <p className="text-[11px] text-muted-foreground">
                3-of-a-kind pay × stake, plus per-reel spawn weights (R1–R3). ~% is reel 1 share.
              </p>
              <div className="space-y-2">
                {cfg.symbols.map((sym) => (
                  <div
                    key={sym.id}
                    className="rounded-xl border border-white/5 bg-white/[0.03] p-2"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <SymThumb kind={sym.kind} name={sym.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-foreground">{sym.name}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">
                          {sym.tier}
                          {sym.wild ? " · wild" : ""} · ~{weightPct[sym.kind] ?? 0}% R1
                        </div>
                      </div>
                      <label className="w-20 space-y-0.5 text-[9px] text-muted-foreground">
                        Pay ×
                        <Num
                          value={sym.payMult}
                          onChange={(n) => {
                            const symbols = cfg.symbols.map((s) =>
                              s.id === sym.id ? { ...s, payMult: n } : s,
                            );
                            patch({ symbols });
                          }}
                          step={1}
                          min={0}
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map((reel) => (
                        <label key={reel} className="space-y-0.5 text-[9px] text-muted-foreground">
                          R{reel + 1}
                          <Num
                            value={sym.reelWeights[reel] ?? 0}
                            onChange={(n) => {
                              const symbols = cfg.symbols.map((s) => {
                                if (s.id !== sym.id) return s;
                                const reelWeights = [...s.reelWeights];
                                reelWeights[reel] = n;
                                return { ...s, reelWeights };
                              });
                              patch({ symbols });
                            }}
                            step={1}
                            min={0}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : section === "specials" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Exactly 2 Double Wilds × stake
                  <Num
                    value={cfg.twoWildPayMult}
                    onChange={(n) => patch({ twoWildPayMult: n })}
                    step={1}
                    min={0}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Hold max reels
                  <Num
                    value={cfg.holdMaxReels}
                    onChange={(n) => patch({ holdMaxReels: n })}
                    step={1}
                    min={0}
                    max={3}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Hold cost × stake
                  <Num
                    value={cfg.holdCostMult}
                    onChange={(n) => patch({ holdCostMult: n })}
                    step={0.01}
                    min={0}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Target RTP % (placeholder)
                  <Num
                    value={cfg.targetRtp}
                    onChange={(n) => patch({ targetRtp: n })}
                    step={0.01}
                    min={80}
                    max={99}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => patch({ allowHoldWild: !cfg.allowHoldWild })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    cfg.allowHoldWild
                      ? "bg-rose-500/25 text-rose-200"
                      : "bg-emerald-500/20 text-emerald-300",
                  )}
                >
                  Hold Wild: {cfg.allowHoldWild ? "ALLOWED (risky)" : "BLOCKED"}
                </button>
                <button
                  type="button"
                  onClick={() => patch({ wildSubstitutesFruit: !cfg.wildSubstitutesFruit })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    cfg.wildSubstitutesFruit
                      ? "bg-fuchsia-500/25 text-fuchsia-200"
                      : "bg-white/[0.06] text-muted-foreground",
                  )}
                >
                  Wild substitutes fruit: {cfg.wildSubstitutesFruit ? "ON" : "OFF"}
                </button>
                <button
                  type="button"
                  onClick={() => patch({ partialMatchPays: !cfg.partialMatchPays })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    cfg.partialMatchPays
                      ? "bg-fuchsia-500/25 text-fuchsia-200"
                      : "bg-white/[0.06] text-muted-foreground",
                  )}
                >
                  2-of-3 fruit pays: {cfg.partialMatchPays ? "ON" : "OFF"}
                </button>
              </div>
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200/90">
                Exactly 3 Double Wilds triggers Bonus Ladder (no base cash). Wild-hold allowed can
                explode RTP — keep blocked unless design signs off.
              </p>
            </>
          ) : section === "bonus" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Ladder lines
                  <Num
                    value={cfg.bonusLadder.lineCount}
                    onChange={(n) =>
                      patch({
                        bonusLadder: { ...cfg.bonusLadder, lineCount: n },
                      })
                    }
                    min={1}
                    max={10}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Advance chance %
                  <Num
                    value={cfg.bonusLadder.advanceChancePercent}
                    onChange={(n) =>
                      patch({
                        bonusLadder: { ...cfg.bonusLadder, advanceChancePercent: n },
                      })
                    }
                    min={0}
                    max={100}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      bonusLadder: {
                        ...cfg.bonusLadder,
                        advanceMode:
                          cfg.bonusLadder.advanceMode === "automatic" ? "chance" : "automatic",
                      },
                    })
                  }
                  className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-fuchsia-200"
                >
                  Advance: {cfg.bonusLadder.advanceMode}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      bonusLadder: {
                        ...cfg.bonusLadder,
                        stackMode:
                          cfg.bonusLadder.stackMode === "additive"
                            ? "multiplicative"
                            : "additive",
                      },
                    })
                  }
                  className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-fuchsia-200"
                >
                  Stack: {cfg.bonusLadder.stackMode}
                </button>
              </div>
              {cfg.bonusLadder.lines.map((line, li) => (
                <div key={li} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <h4 className="mb-2 text-xs font-black uppercase text-fuchsia-200">
                    Line {li + 1}
                  </h4>
                  <div className="space-y-2">
                    {line.positions.map((pos, pi) => (
                      <div
                        key={pi}
                        className="grid grid-cols-[4rem_1fr_1fr] items-end gap-2 text-[10px]"
                      >
                        <div className="rounded bg-black/40 px-2 py-2 text-center font-bold uppercase text-muted-foreground">
                          {pos.type}
                        </div>
                        {pos.type === "number" ? (
                          <label className="space-y-0.5 text-muted-foreground">
                            × value
                            <Num
                              value={pos.value}
                              onChange={(n) => {
                                const lines = cfg.bonusLadder.lines.map((l, i) => {
                                  if (i !== li) return l;
                                  return {
                                    positions: l.positions.map((p, j) =>
                                      j === pi && p.type === "number"
                                        ? { ...p, value: n }
                                        : p,
                                    ),
                                  };
                                });
                                patch({
                                  bonusLadder: { ...cfg.bonusLadder, lines },
                                });
                              }}
                              min={0}
                            />
                          </label>
                        ) : (
                          <div className="text-muted-foreground">STOP</div>
                        )}
                        <label className="space-y-0.5 text-muted-foreground">
                          Weight
                          <Num
                            value={pos.weight}
                            onChange={(n) => {
                              const lines = cfg.bonusLadder.lines.map((l, i) => {
                                if (i !== li) return l;
                                return {
                                  positions: l.positions.map((p, j) =>
                                    j === pi ? { ...p, weight: n } : p,
                                  ),
                                };
                              });
                              patch({
                                bonusLadder: { ...cfg.bonusLadder, lines },
                              });
                            }}
                            min={0}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : section === "jackpot" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Contribution rate (of bet)
                  <Num
                    value={cfg.jackpot.contributionRate}
                    onChange={(n) =>
                      patch({ jackpot: { ...cfg.jackpot, contributionRate: n } })
                    }
                    step={0.001}
                    min={0}
                    max={1}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Floor after win
                  <Num
                    value={cfg.jackpot.floorAmount}
                    onChange={(n) =>
                      patch({ jackpot: { ...cfg.jackpot, floorAmount: n } })
                    }
                    step={1}
                    min={0}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Trigger wild count
                  <Num
                    value={cfg.jackpot.triggerWildCount}
                    onChange={(n) =>
                      patch({ jackpot: { ...cfg.jackpot, triggerWildCount: n } })
                    }
                    step={1}
                    min={1}
                    max={3}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() =>
                  patch({
                    jackpot: {
                      ...cfg.jackpot,
                      requireMaxBet: !cfg.jackpot.requireMaxBet,
                    },
                  })
                }
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold",
                  cfg.jackpot.requireMaxBet
                    ? "bg-fuchsia-500/25 text-fuchsia-200"
                    : "bg-white/[0.06] text-muted-foreground",
                )}
              >
                Require max bet: {cfg.jackpot.requireMaxBet ? "YES" : "NO"}
              </button>
              <p className="text-[11px] text-muted-foreground">
                Pool id: <code className="text-fuchsia-300">{cfg.jackpot.poolId}</code>
              </p>
            </>
          ) : (
            <>
              <p className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-[11px] text-fuchsia-100/90">
                Engine bet limits apply to live spins after Save. Server loads this config
                authoritatively.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Engine min bet
                  <Num value={cfg.minBet} onChange={(n) => patch({ minBet: n })} step={0.01} min={0.01} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Engine max bet
                  <Num value={cfg.maxBet} onChange={(n) => patch({ maxBet: n })} step={0.01} min={0.01} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Visible rows / reel
                  <Num
                    value={cfg.visibleRowsPerReel}
                    onChange={(n) =>
                      patch({
                        visibleRowsPerReel: n === 1 ? 1 : 3,
                      })
                    }
                    step={2}
                    min={1}
                    max={3}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Active row (0-based)
                  <Num
                    value={cfg.activeRow}
                    onChange={(n) => patch({ activeRow: n })}
                    step={1}
                    min={0}
                    max={2}
                  />
                </label>
              </div>
            </>
          )}
        </div>

        {section !== "lobby" && (
          <div className="shrink-0 border-t border-fuchsia-500/20 p-3">
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void saveEngine()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-500 py-2.5 text-sm font-black uppercase text-white disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving…" : "Save engine"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
