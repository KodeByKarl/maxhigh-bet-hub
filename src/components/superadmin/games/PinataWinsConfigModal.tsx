/**
 * Superadmin Piñata Wins engine editor — lobby + math config.
 * Persists to game_controls.engineConfig; live spins read the same JSON.
 */
import { useEffect, useState } from "react";
import { Coins, Frame, LayoutGrid, PartyPopper, Save, Settings2, Store, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PINATA_WINS_CONFIG,
  LOCKED_GOLD_FRAME_MULT_STEPS,
  normalizePinataWinsConfig,
  type PwSymKind,
  type PwWinsConfig,
} from "@/lib/pinata-wins-config";
import {
  getPinataWinsEngineConfigFn,
  savePinataWinsEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { ICON_SRC } from "@/components/maxhigh/pinata-wins/animationConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "lobby" | "symbols" | "gold" | "bonus" | "risk";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "symbols", label: "Symbols", icon: LayoutGrid },
  { id: "gold", label: "Gold Frames", icon: Frame },
  { id: "bonus", label: "Bonus / Buy", icon: PartyPopper },
  { id: "risk", label: "Risk / RTP", icon: Coins },
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

function SymThumb({ kind, name }: { kind: PwSymKind; name: string }) {
  return (
    <img
      src={ICON_SRC[kind]}
      alt={name}
      className="size-10 rounded-md bg-black/40 object-contain"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

export function PinataWinsConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<PwWinsConfig>(() => structuredClone(DEFAULT_PINATA_WINS_CONFIG));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState(game.tag ?? "");
  const [lobbyRtp, setLobbyRtp] = useState(Number(game.rtp) || 96.75);
  const [volatility, setVolatility] = useState(game.volatility ?? "High");
  const [lobbyMinBet, setLobbyMinBet] = useState(Number(game.minBet) || 0.2);
  const [lobbyMaxBet, setLobbyMaxBet] = useState(Number(game.maxBet) || 100);
  const [lobbyBusy, setLobbyBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setTag(game.tag ?? "");
    setLobbyRtp(Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || 96.75);
    setVolatility(game.volatility ?? "High");
    setLobbyMinBet(Number(String(game.minBet ?? "").replace(/[^\d.]/g, "")) || 0.2);
    setLobbyMaxBet(Number(String(game.maxBet ?? "").replace(/[^\d.]/g, "")) || 100);
    setLoading(true);
    void getPinataWinsEngineConfigFn()
      .then((c) => setCfg(normalizePinataWinsConfig(c)))
      .catch(() => {
        toast.error("Failed loading config — defaults");
        setCfg(structuredClone(DEFAULT_PINATA_WINS_CONFIG));
      })
      .finally(() => setLoading(false));
  }, [open, game]);

  function patch(p: Partial<PwWinsConfig>) {
    setCfg((c) => normalizePinataWinsConfig({ ...c, ...p }));
  }

  async function saveEngine() {
    setSaving(true);
    try {
      const next = await savePinataWinsEngineConfigFn({
        data: { config: normalizePinataWinsConfig(cfg) },
      });
      setCfg(normalizePinataWinsConfig(next));
      await onPatchLobby({
        rtp: `${next.targetRtp}%`,
        minBet: `₱${next.minBet.toFixed(2)}`,
        maxBet: `₱${next.maxBet.toFixed(2)}`,
      });
      setLobbyRtp(next.targetRtp);
      setLobbyMinBet(next.minBet);
      setLobbyMaxBet(next.maxBet);
      toast.success("Piñata Wins engine saved");
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
        volatility: volatility.trim() || "High",
        minBet: String(lobbyMinBet),
        maxBet: String(lobbyMaxBet),
      });
      patch({ minBet: lobbyMinBet, maxBet: lobbyMaxBet, targetRtp: lobbyRtp });
      toast.success("Lobby settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lobby save failed");
    } finally {
      setLobbyBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(100%-1rem,52rem)] flex-col gap-0 overflow-hidden border-amber-500/20 bg-panel p-0">
        <div className="relative h-28 shrink-0 overflow-hidden">
          <img src={game.thumb} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16120F] to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-foreground">
                <PartyPopper size={18} className="text-amber-400" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Full engine · 5×3 · 20 lines · Gold Frames + Fiesta FS — {game.gameId}
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

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-amber-500/15 px-3 py-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold",
                section === item.id
                  ? "bg-amber-500 text-black"
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
                      ? "bg-amber-500/20 text-amber-300"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 py-2.5 text-sm font-black uppercase text-amber-200 disabled:opacity-50"
              >
                <Save size={16} />
                {lobbyBusy ? "Saving…" : "Save lobby"}
              </button>
            </>
          ) : section === "symbols" ? (
            <>
              <p className="text-[11px] text-amber-300/80">
                Pay × bet-per-line for 3 / 4 / 5 of a kind. Golden Skull 5oak locked at 460× by
                product sign-off — change only with care.
              </p>
              <div className="space-y-2">
                {cfg.symbols.map((sym) => (
                  <div
                    key={sym.id}
                    className="rounded-xl border border-white/5 bg-white/[0.03] p-2 text-[11px]"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <SymThumb kind={sym.kind} name={sym.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold text-foreground">{sym.name}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">
                          {sym.tier}
                          {sym.wild ? " · wild" : ""}
                          {sym.scatter ? " · scatter" : ""}
                          {sym.goldFrameEligible ? " · gold-frame" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([0, 1, 2] as const).map((pi) => (
                        <label key={pi} className="space-y-0.5 text-[10px] text-muted-foreground">
                          Pay {pi + 3}oak
                          <Num
                            value={sym.pay[pi] ?? 0}
                            onChange={(n) => {
                              const symbols = cfg.symbols.map((s) => {
                                if (s.id !== sym.id) return s;
                                const pay: [number, number, number] = [...s.pay];
                                pay[pi] = n;
                                return { ...s, pay };
                              });
                              patch({ symbols });
                            }}
                            step={1}
                            min={0}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-1">
                      {Array.from({ length: cfg.reelsCount }, (_, ri) => (
                        <label key={ri} className="space-y-0.5 text-[9px] text-muted-foreground">
                          R{ri + 1} wt
                          <Num
                            value={sym.reelWeights[ri] ?? 0}
                            onChange={(n) => {
                              const symbols = cfg.symbols.map((s) => {
                                if (s.id !== sym.id) return s;
                                const reelWeights = [...s.reelWeights];
                                reelWeights[ri] = n;
                                return { ...s, reelWeights };
                              });
                              patch({ symbols });
                            }}
                            min={0}
                            step={0.1}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-1 grid grid-cols-5 gap-1">
                      {Array.from({ length: cfg.reelsCount }, (_, ri) => (
                        <label key={ri} className="space-y-0.5 text-[9px] text-muted-foreground">
                          FS R{ri + 1}
                          <Num
                            value={sym.reelWeightsFreeSpins[ri] ?? 0}
                            onChange={(n) => {
                              const symbols = cfg.symbols.map((s) => {
                                if (s.id !== sym.id) return s;
                                const reelWeightsFreeSpins = [...s.reelWeightsFreeSpins];
                                reelWeightsFreeSpins[ri] = n;
                                return { ...s, reelWeightsFreeSpins };
                              });
                              patch({ symbols });
                            }}
                            min={0}
                            step={0.1}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : section === "gold" ? (
            <>
              <p className="text-[11px] text-amber-300/80">
                Gold Frame spawn chances are the primary RTP/volatility lever. Mult steps are
                locked ({LOCKED_GOLD_FRAME_MULT_STEPS.join(", ")}); tune weights only.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Base initial chance
                  <Num
                    value={cfg.goldFrameChanceInitial}
                    onChange={(n) => patch({ goldFrameChanceInitial: n })}
                    step={0.001}
                    min={0}
                    max={1}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Base cascade chance
                  <Num
                    value={cfg.goldFrameChanceCascade}
                    onChange={(n) => patch({ goldFrameChanceCascade: n })}
                    step={0.001}
                    min={0}
                    max={1}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  FS initial chance
                  <Num
                    value={cfg.goldFrameChanceFreeSpinsInitial}
                    onChange={(n) => patch({ goldFrameChanceFreeSpinsInitial: n })}
                    step={0.001}
                    min={0}
                    max={1}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  FS cascade chance
                  <Num
                    value={cfg.goldFrameChanceFreeSpinsCascade}
                    onChange={(n) => patch({ goldFrameChanceFreeSpinsCascade: n })}
                    step={0.001}
                    min={0}
                    max={1}
                  />
                </label>
              </div>
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Multiplier weights (locked steps)
                </p>
                {cfg.goldFrameMults.map((gm, i) => (
                  <label key={gm.mult} className="flex items-center gap-3 text-xs">
                    <span className="w-14 font-mono font-bold text-amber-300">{gm.mult}×</span>
                    <Num
                      value={gm.weight}
                      onChange={(n) => {
                        const goldFrameMults = cfg.goldFrameMults.map((g, j) =>
                          j === i ? { ...g, weight: n } : g,
                        );
                        patch({ goldFrameMults });
                      }}
                      min={0}
                      step={0.1}
                    />
                  </label>
                ))}
              </div>
            </>
          ) : section === "bonus" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                Scatter trigger count
                <Num
                  value={cfg.freeSpinsTriggerCount}
                  onChange={(n) => patch({ freeSpinsTriggerCount: Math.round(n) })}
                  min={2}
                  max={10}
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                Base free spins
                <Num
                  value={cfg.freeSpinsBaseCount}
                  onChange={(n) => patch({ freeSpinsBaseCount: Math.round(n) })}
                  min={1}
                  max={50}
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                Extra spins per scatter
                <Num
                  value={cfg.freeSpinsExtraPerScatter}
                  onChange={(n) => patch({ freeSpinsExtraPerScatter: Math.round(n) })}
                  min={0}
                  max={20}
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                Buy feature cost (× bet)
                <Num
                  value={cfg.buyFeatureMult}
                  onChange={(n) => patch({ buyFeatureMult: n })}
                  step={1}
                  min={1}
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted-foreground sm:col-span-2">
                FS mult apply timing
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-white/[0.06] px-3 text-sm"
                  value={cfg.fsMultApplyTiming}
                  onChange={(e) =>
                    patch({
                      fsMultApplyTiming: e.target.value === "next_spin" ? "next_spin" : "same_spin",
                    })
                  }
                >
                  <option value="same_spin">same_spin (locked production)</option>
                  <option value="next_spin">next_spin (sim / A-B only)</option>
                </select>
              </label>
              <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                Retrigger cap is locked unlimited (null). Persistent Gold Frame mult carries across
                the Fiesta Free Spins session.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                Engine min bet
                <Num
                  value={cfg.minBet}
                  onChange={(n) => patch({ minBet: n })}
                  step={0.01}
                  min={0.01}
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                Engine max bet
                <Num
                  value={cfg.maxBet}
                  onChange={(n) => patch({ maxBet: n })}
                  step={0.01}
                  min={0.01}
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                Max win × stake
                <Num
                  value={cfg.maxWinMult}
                  onChange={(n) => patch({ maxWinMult: n })}
                  step={100}
                  min={100}
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                Target RTP %
                <Num
                  value={cfg.targetRtp}
                  onChange={(n) => patch({ targetRtp: n })}
                  step={0.01}
                  min={80}
                  max={99}
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted-foreground sm:col-span-2">
                Target hit frequency %
                <Num
                  value={cfg.targetHitFrequency}
                  onChange={(n) => patch({ targetHitFrequency: n })}
                  step={0.1}
                  min={1}
                  max={80}
                />
              </label>
              <p className="flex items-start gap-2 sm:col-span-2 text-[11px] text-muted-foreground">
                <Settings2 size={14} className="mt-0.5 shrink-0 text-amber-400" />
                Flat bet range locked ₱0.20–₱100 and max win 5,000× by product sign-off. Hit
                frequency is a sim validation target (~27.7%).
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-amber-500/15 p-3">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void saveEngine()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-black uppercase text-black disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save engine config"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
