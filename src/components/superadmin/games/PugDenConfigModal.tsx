import { useEffect, useMemo, useState } from "react";
import {
  Bone,
  Coins,
  LayoutGrid,
  PawPrint,
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
  DEFAULT_PUG_LIFE_CONFIG,
  effectiveReelWeights,
  normalizePugLifeConfig,
  weightPercents,
  type PlRtpProfileId,
  type PlSymKind,
  type PlTreatTier,
  type PugLifeConfig,
} from "@/lib/pug-life-config";
import {
  getPugLifeEngineConfigFn,
  savePugLifeEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { ICON_SRC } from "@/components/maxhigh/pug-life/animationConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "lobby" | "symbols" | "treats" | "features" | "rtp" | "risk";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "symbols", label: "Pays", icon: LayoutGrid },
  { id: "treats", label: "Treat Mults", icon: Bone },
  { id: "features", label: "Features / Buy", icon: PawPrint },
  { id: "rtp", label: "RTP / Weights", icon: Settings2 },
  { id: "risk", label: "Risk / Cap", icon: Coins },
];

const RTP_OPTIONS: { id: PlRtpProfileId; label: string }[] = [
  { id: "base_96_33", label: "Base 96.33%" },
  { id: "featurespins", label: "FeatureSpins" },
  { id: "buy_treat_yoself", label: "Buy Treat Yo'Self" },
  { id: "buy_dawgs_den", label: "Buy Dawg's Den" },
];

const TREAT_TIERS: PlTreatTier[] = ["biscuit", "bone", "steak"];

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

function SymThumb({ kind, name }: { kind: PlSymKind; name: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-amber-500/30 bg-black/50">
      {!broken ? (
        <img
          src={ICON_SRC[kind]}
          alt={name}
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="px-1 text-center text-[8px] font-black uppercase text-amber-300">
          {kind}
        </span>
      )}
    </div>
  );
}

export function PugDenConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<PugLifeConfig>(() =>
    structuredClone(DEFAULT_PUG_LIFE_CONFIG),
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [tag, setTag] = useState(game.tag ?? "");
  const [lobbyRtp, setLobbyRtp] = useState(Number(game.rtp) || 96.33);
  const [volatility, setVolatility] = useState(game.volatility ?? "High");
  const [lobbyMinBet, setLobbyMinBet] = useState(Number(game.minBet) || 0.1);
  const [lobbyMaxBet, setLobbyMaxBet] = useState(Number(game.maxBet) || 100);
  const [lobbyBusy, setLobbyBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setTag(game.tag ?? "");
    setLobbyRtp(Number(game.rtp) || 96.33);
    setVolatility(game.volatility ?? "High");
    setLobbyMinBet(Number(game.minBet) || 0.1);
    setLobbyMaxBet(Number(game.maxBet) || 100);
    setLoading(true);
    void getPugLifeEngineConfigFn()
      .then((c) => setCfg(normalizePugLifeConfig(c)))
      .catch(() => {
        toast.error("Failed loading config — defaults");
        setCfg(structuredClone(DEFAULT_PUG_LIFE_CONFIG));
      })
      .finally(() => setLoading(false));
  }, [open, game]);

  const activeWeights = useMemo(() => effectiveReelWeights(cfg), [cfg]);
  const weightPct = useMemo(() => weightPercents(activeWeights, 0), [activeWeights]);

  function patch(p: Partial<PugLifeConfig>) {
    setCfg((c) => {
      const next = normalizePugLifeConfig({ ...c, ...p });
      if (p.activeRtpProfile) {
        const profile = next.rtpProfiles.find((r) => r.id === p.activeRtpProfile);
        if (profile) next.targetRtp = profile.targetRtp;
      }
      return next;
    });
  }

  function setActiveProfileWeight(kind: PlSymKind, reelIndex: number, value: number) {
    setCfg((c) => {
      const profiles = c.rtpProfiles.map((p) => {
        if (p.id !== c.activeRtpProfile) return p;
        const reelWeights = { ...p.reelWeights };
        const row = [...(reelWeights[kind] ?? [0, 0, 0, 0, 0])];
        row[reelIndex] = value;
        reelWeights[kind] = row;
        return { ...p, reelWeights };
      });
      return normalizePugLifeConfig({ ...c, rtpProfiles: profiles });
    });
  }

  async function saveEngine() {
    setSaving(true);
    try {
      const next = await savePugLifeEngineConfigFn({
        data: { config: normalizePugLifeConfig(cfg) },
      });
      setCfg(normalizePugLifeConfig(next));
      toast.success("Pug Den engine saved");
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
      toast.success("Lobby settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lobby save failed");
    } finally {
      setLobbyBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(100%-1rem,48rem)] flex-col gap-0 overflow-hidden border-amber-500/20 bg-panel p-0">
        <div className="relative h-28 shrink-0 overflow-hidden">
          <img src={game.thumb} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16120F] to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-foreground">
                <PawPrint size={18} className="text-amber-400" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Full engine · diamond 3-4-5-4-3 · 720 ways · Treats + Dawg&apos;s Den —{" "}
                {game.gameId}
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
              <p className="text-[11px] text-muted-foreground">
                Pay × bet-per-line for 3 / 4 / 5 of a kind. Controls live winnings after Save engine.
              </p>
              <div className="mb-1 grid grid-cols-[auto_minmax(0,1fr)_1fr_1fr_1fr] gap-2 px-2 text-[9px] font-bold uppercase text-muted-foreground">
                <span />
                <span>Symbol</span>
                <span>3×</span>
                <span>4×</span>
                <span>5×</span>
              </div>
              <div className="space-y-2">
                {cfg.symbols.map((sym) => (
                  <div
                    key={sym.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_1fr_1fr_1fr] items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2 text-[11px]"
                  >
                    <SymThumb kind={sym.kind} name={sym.name} />
                    <div className="min-w-0">
                      <div className="truncate font-bold text-foreground">{sym.name}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {sym.tier}
                        {sym.wild ? " · wild" : ""}
                        {sym.scatter ? " · scatter" : ""}
                        {sym.toaster ? " · toaster" : ""}
                      </div>
                    </div>
                    {([0, 1, 2] as const).map((idx) => (
                      <Num
                        key={idx}
                        value={sym.pay[idx]}
                        onChange={(n) => {
                          const symbols = cfg.symbols.map((s) => {
                            if (s.id !== sym.id) return s;
                            const pay: [number, number, number] = [...s.pay];
                            pay[idx] = n;
                            return { ...s, pay };
                          });
                          patch({ symbols });
                        }}
                        step={1}
                        min={0}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : section === "treats" ? (
            <>
              <label className="block space-y-1 text-xs font-semibold text-muted-foreground">
                5-Treat line flat × stake
                <Num
                  value={cfg.fiveTreatPayStakeMult}
                  onChange={(n) => patch({ fiveTreatPayStakeMult: n })}
                  step={0.1}
                  min={0}
                />
              </label>
              {TREAT_TIERS.map((tier) => (
                <div key={tier} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <h4 className="mb-2 text-xs font-black uppercase text-amber-200">{tier} multipliers</h4>
                  <div className="space-y-2">
                    {(cfg.treatMultiplierTables[tier] ?? []).map((row, i) => (
                      <div key={`${tier}-${i}`} className="grid grid-cols-2 gap-2">
                        <label className="space-y-0.5 text-[10px] text-muted-foreground">
                          Value ×
                          <Num
                            value={row.value}
                            onChange={(n) => {
                              const table = {
                                ...cfg.treatMultiplierTables,
                                [tier]: cfg.treatMultiplierTables[tier].map((r, j) =>
                                  j === i ? { ...r, value: n } : r,
                                ),
                              };
                              patch({ treatMultiplierTables: table });
                            }}
                            step={0.1}
                            min={0}
                          />
                        </label>
                        <label className="space-y-0.5 text-[10px] text-muted-foreground">
                          Weight
                          <Num
                            value={row.weight}
                            onChange={(n) => {
                              const table = {
                                ...cfg.treatMultiplierTables,
                                [tier]: cfg.treatMultiplierTables[tier].map((r, j) =>
                                  j === i ? { ...r, weight: n } : r,
                                ),
                              };
                              patch({ treatMultiplierTables: table });
                            }}
                            step={1}
                            min={0}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : section === "features" ? (
            <>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 space-y-3">
                <h4 className="text-xs font-black uppercase text-amber-200">Treat Yo&apos;Self</h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="space-y-1 text-[10px] text-muted-foreground">
                    Initial spins
                    <Num
                      value={cfg.treatYoSelf.initialSpins}
                      onChange={(n) =>
                        patch({ treatYoSelf: { ...cfg.treatYoSelf, initialSpins: n } })
                      }
                      min={1}
                    />
                  </label>
                  <label className="space-y-1 text-[10px] text-muted-foreground">
                    Initial lives
                    <Num
                      value={cfg.treatYoSelf.initialLives}
                      onChange={(n) =>
                        patch({ treatYoSelf: { ...cfg.treatYoSelf, initialLives: n } })
                      }
                      min={1}
                    />
                  </label>
                  <label className="space-y-1 text-[10px] text-muted-foreground">
                    Trigger treat count
                    <Num
                      value={cfg.treatYoSelf.triggerTreatCount}
                      onChange={(n) =>
                        patch({ treatYoSelf: { ...cfg.treatYoSelf, triggerTreatCount: n } })
                      }
                      min={1}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 space-y-3">
                <h4 className="text-xs font-black uppercase text-amber-200">Dawg&apos;s Den</h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="space-y-1 text-[10px] text-muted-foreground">
                    Scatter trigger
                    <Num
                      value={cfg.dawgsDen.triggerScatterCount}
                      onChange={(n) =>
                        patch({ dawgsDen: { ...cfg.dawgsDen, triggerScatterCount: n } })
                      }
                      min={1}
                    />
                  </label>
                  <label className="space-y-1 text-[10px] text-muted-foreground">
                    Min free spins
                    <Num
                      value={cfg.dawgsDen.minFreeSpins}
                      onChange={(n) =>
                        patch({ dawgsDen: { ...cfg.dawgsDen, minFreeSpins: n } })
                      }
                      min={1}
                    />
                  </label>
                  <label className="space-y-1 text-[10px] text-muted-foreground">
                    Max free spins
                    <Num
                      value={cfg.dawgsDen.maxFreeSpins}
                      onChange={(n) =>
                        patch({ dawgsDen: { ...cfg.dawgsDen, maxFreeSpins: n } })
                      }
                      min={1}
                    />
                  </label>
                  <label className="space-y-1 text-[10px] text-muted-foreground">
                    Toaster mult chance %
                    <Num
                      value={cfg.dawgsDen.toasterMultChancePercent}
                      onChange={(n) =>
                        patch({
                          dawgsDen: { ...cfg.dawgsDen, toasterMultChancePercent: n },
                        })
                      }
                      min={0}
                      max={100}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-amber-200">Bonus buy costs</h4>
                {cfg.buyOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">{opt.id}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {opt.enabled ? "Enabled" : "Disabled"} · {opt.configStatus}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const buyOptions = cfg.buyOptions.map((b) =>
                          b.id === opt.id ? { ...b, enabled: !b.enabled } : b,
                        );
                        patch({ buyOptions });
                      }}
                      className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-bold",
                        opt.enabled
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300",
                      )}
                    >
                      {opt.enabled ? "ON" : "OFF"}
                    </button>
                    <label className="space-y-0.5 text-[10px] text-muted-foreground">
                      Cost × stake
                      <Num
                        value={opt.costMult}
                        onChange={(n) => {
                          const buyOptions = cfg.buyOptions.map((b) =>
                            b.id === opt.id ? { ...b, costMult: n } : b,
                          );
                          patch({ buyOptions });
                        }}
                        step={0.01}
                        min={0}
                      />
                    </label>
                  </div>
                ))}
              </div>

              <label className="block space-y-1 text-xs font-semibold text-muted-foreground">
                FeatureSpins batch size
                <Num
                  value={cfg.featurespinsBatchSize}
                  onChange={(n) => patch({ featurespinsBatchSize: n })}
                  min={1}
                />
              </label>
            </>
          ) : section === "rtp" ? (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Active RTP profile</p>
                <div className="flex flex-wrap gap-2">
                  {RTP_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patch({ activeRtpProfile: opt.id })}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-bold",
                        cfg.activeRtpProfile === opt.id
                          ? "bg-amber-500 text-black"
                          : "bg-white/[0.06] text-muted-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block space-y-1 text-xs font-semibold text-muted-foreground">
                Target RTP %
                <Num
                  value={cfg.targetRtp}
                  onChange={(n) => patch({ targetRtp: n })}
                  step={0.01}
                  min={80}
                  max={99}
                />
              </label>
              <p className="text-[11px] text-muted-foreground">
                Reel weights for <span className="text-amber-300">{cfg.activeRtpProfile}</span>{" "}
                (reel 1–5). Spawn share shown for reel 1.
              </p>
              <div className="space-y-2">
                {cfg.symbols.map((sym) => (
                  <div
                    key={sym.id}
                    className="rounded-xl border border-white/5 bg-white/[0.03] p-2"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <SymThumb kind={sym.kind} name={sym.name} />
                      <div>
                        <div className="text-xs font-bold text-foreground">{sym.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          ~{weightPct[sym.kind] ?? 0}% on reel 1
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {Array.from({ length: 5 }, (_, reel) => (
                        <label key={reel} className="space-y-0.5 text-[9px] text-muted-foreground">
                          R{reel + 1}
                          <Num
                            value={activeWeights[sym.kind]?.[reel] ?? 0}
                            onChange={(n) => setActiveProfileWeight(sym.kind, reel, n)}
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
          ) : (
            <>
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200/90">
                Max-win and bet limits apply to every live spin after Save engine. Server loads this
                config authoritatively.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Max win × stake
                  <Num
                    value={cfg.maxWinMult}
                    onChange={(n) => patch({ maxWinMult: n })}
                    step={1}
                    min={0}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Paylines
                  <Num
                    value={cfg.paylineCount}
                    onChange={(n) => patch({ paylineCount: n })}
                    step={1}
                    min={1}
                    max={50}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Min match length
                  <Num
                    value={cfg.minMatchLength}
                    onChange={(n) => patch({ minMatchLength: n })}
                    step={1}
                    min={2}
                    max={5}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Engine min bet
                  <Num value={cfg.minBet} onChange={(n) => patch({ minBet: n })} step={0.01} min={0.01} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Engine max bet
                  <Num value={cfg.maxBet} onChange={(n) => patch({ maxBet: n })} step={0.01} min={0.01} />
                </label>
              </div>
            </>
          )}
        </div>

        {section !== "lobby" && (
          <div className="shrink-0 border-t border-amber-500/20 p-3">
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void saveEngine()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-black uppercase text-black disabled:opacity-50"
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
