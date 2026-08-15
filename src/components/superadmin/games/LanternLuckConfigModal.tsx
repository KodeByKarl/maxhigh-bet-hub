import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Coins,
  Info,
  LayoutGrid,
  Save,
  Settings2,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DEFAULT_LANTERN_LUCK_CONFIG,
  normalizeLanternLuckConfig,
  weightPercents,
  type LanternLuckConfig,
  type CnyFireworkAward,
  type CnySymbolConfig,
} from "@/lib/lantern-luck-config";
import {
  getLanternLuckEngineConfigFn,
  saveLanternLuckEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { LanternLuckIcon } from "@/components/maxhigh/lantern-luck/LanternLuckIcon";
import { cn } from "@/lib/utils";

type Section = "lobby" | "symbols" | "dragon" | "monkey" | "risk";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "symbols", label: "Symbols", icon: LayoutGrid },
  { id: "dragon", label: "Dragon", icon: Sparkles },
  { id: "monkey", label: "Monkey / Gamble", icon: Zap },
  { id: "risk", label: "Risk / Cap", icon: Coins },
];

type Props = {
  game: SuperGameRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatchLobby: (
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) => Promise<void>;
};

export function LanternLuckConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<LanternLuckConfig>(() =>
    structuredClone(DEFAULT_LANTERN_LUCK_CONFIG),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setLoading(true);
    void getLanternLuckEngineConfigFn()
      .then((c) => setCfg(normalizeLanternLuckConfig(c)))
      .catch(() => {
        toast.error("Failed loading engine config — using defaults");
        setCfg(structuredClone(DEFAULT_LANTERN_LUCK_CONFIG));
      })
      .finally(() => setLoading(false));
  }, [open]);

  const reel0Pct = useMemo(() => weightPercents(cfg.symbols, 0), [cfg.symbols]);

  async function saveEngine() {
    setSaving(true);
    try {
      const next = await saveLanternLuckEngineConfigFn({
        data: { config: normalizeLanternLuckConfig(cfg) },
      });
      setCfg(normalizeLanternLuckConfig(next));
      toast.success("Lantern Luck engine config saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function patch(partial: Partial<LanternLuckConfig>) {
    setCfg((c) => normalizeLanternLuckConfig({ ...c, ...partial }));
  }

  function patchSymbol(id: string, partial: Partial<CnySymbolConfig>) {
    setCfg((c) =>
      normalizeLanternLuckConfig({
        ...c,
        symbols: c.symbols.map((s) => (s.id === id ? { ...s, ...partial } : s)),
      }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,52rem)] w-[min(100%-1rem,72rem)] max-w-none flex-col gap-0 overflow-hidden border-amber-500/20 bg-panel p-0 text-foreground sm:rounded-3xl">
        <div className="relative h-32 shrink-0 overflow-hidden sm:h-40">
          <img
            src={game.thumb}
            alt=""
            className="h-full w-full object-cover object-[center_20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16120F] via-[#16120F]/50 to-black/10" />
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-10">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-wide text-foreground sm:text-2xl">
                <Settings2 size={20} className="text-amber-400" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Lobby + live payline / Dragon / Monkey / Gamble math — {game.gameId}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[12.5rem_1fr]">
          <nav className="flex gap-1 overflow-x-auto border-b border-amber-500/20 p-2 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                    active
                      ? "bg-amber-500/15 text-amber-300"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
            {loading && section !== "lobby" ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Loading config…</div>
            ) : section === "lobby" ? (
              <LobbySection game={game} onPatch={onPatchLobby} />
            ) : section === "symbols" ? (
              <SymbolsSection
                cfg={cfg}
                reel0Pct={reel0Pct}
                onPatch={patch}
                onPatchSymbol={patchSymbol}
                onSave={saveEngine}
                saving={saving}
              />
            ) : section === "dragon" ? (
              <DragonSection cfg={cfg} onPatch={patch} onSave={saveEngine} saving={saving} />
            ) : section === "monkey" ? (
              <MonkeyGambleSection cfg={cfg} onPatch={patch} onSave={saveEngine} saving={saving} />
            ) : (
              <RiskSection cfg={cfg} onPatch={patch} onSave={saveEngine} saving={saving} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-black text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function FieldGuide({ title, body }: { title: string; body: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex size-5 items-center justify-center rounded-full text-amber-400/80 hover:bg-amber-500/15 hover:text-amber-300"
          aria-label={`Help: ${title}`}
        >
          <Info size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 border-amber-500/25 bg-neutral-950 text-xs text-muted-foreground">
        <div className="mb-1 font-bold text-amber-300">{title}</div>
        <div className="leading-relaxed">{body}</div>
      </PopoverContent>
    </Popover>
  );
}

function NumInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "h-10 rounded-xl border-transparent bg-white/[0.06] text-foreground",
          suffix && "pr-10",
        )}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="sticky bottom-0 mt-6 flex justify-end border-t border-amber-500/15 bg-panel/95 pt-3 backdrop-blur">
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black uppercase text-black shadow disabled:opacity-50"
      >
        <Save size={16} />
        {saving ? "Saving…" : "Save engine"}
      </button>
    </div>
  );
}

function LobbySection({
  game,
  onPatch,
}: {
  game: SuperGameRow;
  onPatch: Props["onPatchLobby"];
}) {
  const [tag, setTag] = useState(game.tag ?? "");
  const [rtp, setRtp] = useState(Number(game.rtp) || 96.02);
  const [volatility, setVolatility] = useState(game.volatility ?? "Med-High");
  const [minBet, setMinBet] = useState(Number(game.minBet) || 0.5);
  const [maxBet, setMaxBet] = useState(Number(game.maxBet) || 600);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTag(game.tag ?? "");
    setRtp(Number(game.rtp) || 96.02);
    setVolatility(game.volatility ?? "Med-High");
    setMinBet(Number(game.minBet) || 0.5);
    setMaxBet(Number(game.maxBet) || 600);
  }, [game]);

  async function saveLobby() {
    setBusy(true);
    try {
      await onPatch({
        tag: tag.trim() || undefined,
        rtp: String(rtp),
        volatility: volatility.trim() || "Med-High",
        minBet: String(minBet),
        maxBet: String(maxBet),
      });
      toast.success("Lobby settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lobby save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHead
        title="Lobby listing"
        subtitle="Visibility and catalog display (does not change spin math)."
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onPatch({ enabled: !game.enabled })}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-bold",
            game.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400",
          )}
        >
          {game.enabled ? "Enabled" : "Disabled"}
        </button>
        <button
          type="button"
          onClick={() => void onPatch({ featured: !game.featured })}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-bold",
            game.featured ? "bg-amber-500/20 text-amber-300" : "bg-white/[0.06] text-muted-foreground",
          )}
        >
          {game.featured ? "Featured" : "Not featured"}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Tag</span>
          <Input value={tag} onChange={(e) => setTag(e.target.value)} className="h-10 bg-white/[0.06]" />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Display RTP %</span>
          <NumInput value={rtp} onChange={setRtp} step={0.01} min={80} max={99.5} suffix="%" />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Volatility</span>
          <Input
            value={volatility}
            onChange={(e) => setVolatility(e.target.value)}
            className="h-10 bg-white/[0.06]"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Min bet (lobby)</span>
          <NumInput value={minBet} onChange={setMinBet} step={0.1} min={0.1} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Max bet (lobby)</span>
          <NumInput value={maxBet} onChange={setMaxBet} step={1} min={1} />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void saveLobby()}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black uppercase text-black disabled:opacity-50"
      >
        <Save size={16} />
        {busy ? "Saving…" : "Save lobby"}
      </button>
    </div>
  );
}

function SymbolsSection({
  cfg,
  reel0Pct,
  onPatch,
  onPatchSymbol,
  onSave,
  saving,
}: {
  cfg: LanternLuckConfig;
  reel0Pct: Record<string, number>;
  onPatch: (p: Partial<LanternLuckConfig>) => void;
  onPatchSymbol: (id: string, p: Partial<CnySymbolConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <SectionHead
        title="Grid & symbols"
        subtitle="Pay × bet-per-line for 3/4/5. Reel weights control spawn (0 = banned on that reel)."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs">
          <span className="flex items-center gap-1 font-semibold text-muted-foreground">
            Reels <FieldGuide title="Reels" body="Fixed 5 for this title. Changing requires payline remap." />
          </span>
          <NumInput value={cfg.reelsCount} onChange={(n) => onPatch({ reelsCount: n })} min={3} max={7} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Rows</span>
          <NumInput value={cfg.rowsCount} onChange={(n) => onPatch({ rowsCount: n })} min={2} max={5} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Paylines</span>
          <NumInput
            value={cfg.paylineCount}
            onChange={(n) => onPatch({ paylineCount: n })}
            min={1}
            max={50}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Min match</span>
          <NumInput
            value={cfg.minMatchLength}
            onChange={(n) => onPatch({ minMatchLength: n })}
            min={2}
            max={5}
          />
        </label>
      </div>

      <div className="space-y-3">
        {cfg.symbols.map((sym) => (
          <div
            key={sym.id}
            className="rounded-2xl border border-amber-500/15 bg-white/[0.03] p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-black/40">
                <LanternLuckIcon kind={sym.kind} className="!scale-100" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">{sym.name}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {sym.tier}
                  {sym.dragon ? " · Dragon trigger" : ""}
                  {sym.monkey ? " · Monkey trigger" : ""}
                  {sym.extraScatter ? " · FS Extra Scatter" : ""}
                  {" · "}
                  ~{reel0Pct[sym.id] ?? 0}% on reel 1
                </div>
              </div>
            </div>

            {(sym.tier === "low" || sym.tier === "high") && (
              <div className="mb-2 grid grid-cols-3 gap-2">
                {(["3×", "4×", "5×"] as const).map((label, i) => (
                  <label key={label} className="space-y-0.5 text-[10px]">
                    <span className="text-muted-foreground">Pay {label}</span>
                    <NumInput
                      value={sym.pay[i]!}
                      step={1}
                      min={0}
                      onChange={(n) => {
                        const pay = [...sym.pay] as [number, number, number];
                        pay[i] = n;
                        onPatchSymbol(sym.id, { pay });
                      }}
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Base reel weights (1→5)
            </div>
            <div className="mb-2 grid grid-cols-5 gap-1.5">
              {Array.from({ length: cfg.reelsCount }, (_, ri) => (
                <label key={ri} className="space-y-0.5 text-[10px]">
                  <span className="text-muted-foreground">R{ri + 1}</span>
                  <NumInput
                    value={sym.reelWeights[ri] ?? 0}
                    step={0.1}
                    min={0}
                    onChange={(n) => {
                      const reelWeights = [...sym.reelWeights];
                      while (reelWeights.length < cfg.reelsCount) reelWeights.push(0);
                      reelWeights[ri] = n;
                      onPatchSymbol(sym.id, { reelWeights });
                    }}
                  />
                </label>
              ))}
            </div>

            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Free Spins reel weights (1→5)
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: cfg.reelsCount }, (_, ri) => (
                <label key={ri} className="space-y-0.5 text-[10px]">
                  <span className="text-muted-foreground">R{ri + 1}</span>
                  <NumInput
                    value={sym.reelWeightsFreeSpins[ri] ?? 0}
                    step={0.1}
                    min={0}
                    onChange={(n) => {
                      const reelWeightsFreeSpins = [...sym.reelWeightsFreeSpins];
                      while (reelWeightsFreeSpins.length < cfg.reelsCount) reelWeightsFreeSpins.push(0);
                      reelWeightsFreeSpins[ri] = n;
                      onPatchSymbol(sym.id, { reelWeightsFreeSpins });
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <SaveBar onSave={onSave} saving={saving} />
    </div>
  );
}

function DragonSection({
  cfg,
  onPatch,
  onSave,
  saving,
}: {
  cfg: LanternLuckConfig;
  onPatch: (p: Partial<LanternLuckConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  function patchAward(index: number, partial: Partial<CnyFireworkAward>) {
    const dragonFireworkAwards = cfg.dragonFireworkAwards.map((a, i) =>
      i === index ? { ...a, ...partial } : a,
    );
    onPatch({ dragonFireworkAwards });
  }

  return (
    <div className="space-y-4">
      <SectionHead
        title="Dragon Fireworks"
        subtitle="Trigger when Dragon lands on reels 3–5. Launch until bust; awards × total bet."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="flex items-center gap-1 font-semibold text-muted-foreground">
            Success chance
            <FieldGuide
              title="Success %"
              body="Chance each firework launch succeeds. Fail = bust (bonus ends)."
            />
          </span>
          <NumInput
            value={cfg.dragonSuccessChancePercent}
            onChange={(n) => onPatch({ dragonSuccessChancePercent: n })}
            step={0.5}
            min={0}
            max={100}
            suffix="%"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Max launches (soft cap)</span>
          <NumInput
            value={cfg.dragonMaxLaunches}
            onChange={(n) => onPatch({ dragonMaxLaunches: n })}
            min={1}
            max={100}
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-muted-foreground">Firework coin awards</div>
        {cfg.dragonFireworkAwards.map((a, i) => (
          <div
            key={a.id}
            className="grid grid-cols-[1fr_5rem_5rem] items-end gap-2 rounded-xl border border-amber-500/10 bg-white/[0.03] p-2"
          >
            <label className="space-y-0.5 text-[10px]">
              <span className="text-muted-foreground">Label</span>
              <Input
                value={a.label}
                onChange={(e) => patchAward(i, { label: e.target.value })}
                className="h-9 bg-white/[0.06]"
              />
            </label>
            <label className="space-y-0.5 text-[10px]">
              <span className="text-muted-foreground">× bet</span>
              <NumInput
                value={a.mult}
                step={0.1}
                min={0}
                onChange={(n) => patchAward(i, { mult: n })}
              />
            </label>
            <label className="space-y-0.5 text-[10px]">
              <span className="text-muted-foreground">Weight</span>
              <NumInput
                value={a.weight}
                step={0.1}
                min={0}
                onChange={(n) => patchAward(i, { weight: n })}
              />
            </label>
          </div>
        ))}
      </div>
      <SaveBar onSave={onSave} saving={saving} />
    </div>
  );
}

function MonkeyGambleSection({
  cfg,
  onPatch,
  onSave,
  saving,
}: {
  cfg: LanternLuckConfig;
  onPatch: (p: Partial<LanternLuckConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <SectionHead
        title="Monkey Free Spins"
        subtitle="Trigger on reels 1, 3, 5. Awards ×bet + Extra Scatter wheel. No retriggers in FS."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="flex items-center gap-1 font-semibold text-muted-foreground">
            Free Spins count
            <FieldGuide title="FS count" body="Spins awarded on Monkey trigger (product-tunable)." />
          </span>
          <NumInput
            value={cfg.freeSpinsAward}
            onChange={(n) => onPatch({ freeSpinsAward: n })}
            min={1}
            max={50}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Trigger payout × bet</span>
          <NumInput
            value={cfg.monkeyTriggerMult}
            onChange={(n) => onPatch({ monkeyTriggerMult: n })}
            step={0.5}
            min={0}
            max={100}
          />
        </label>
      </div>

      <SectionHead
        title="Gamble round"
        subtitle="Player-optional after a win. Format locked to red/black until product confirms."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Format</span>
          <Input value={cfg.gambleFormat} disabled className="h-10 bg-white/[0.04] opacity-70" />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Win multiplier</span>
          <NumInput
            value={cfg.gambleWinMult}
            onChange={(n) => onPatch({ gambleWinMult: n })}
            step={0.1}
            min={1.1}
            max={10}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Max gamble rounds</span>
          <NumInput
            value={cfg.gambleMaxRounds}
            onChange={(n) => onPatch({ gambleMaxRounds: n })}
            min={1}
            max={20}
          />
        </label>
        <label className="flex items-center gap-2 pt-5 text-xs font-semibold text-muted-foreground">
          <input
            type="checkbox"
            checked={cfg.autoplayDeclineGamble}
            onChange={(e) => onPatch({ autoplayDeclineGamble: e.target.checked })}
            className="size-4 rounded border-amber-500/40"
          />
          Autoplay auto-collect (decline gamble)
        </label>
      </div>
      <SaveBar onSave={onSave} saving={saving} />
    </div>
  );
}

function RiskSection({
  cfg,
  onPatch,
  onSave,
  saving,
}: {
  cfg: LanternLuckConfig;
  onPatch: (p: Partial<LanternLuckConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <SectionHead
        title="Risk, bets & RTP target"
        subtitle="Engine min/max bet and max-win cap. Target RTP is for docs/sim — tune via weights."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Engine min bet</span>
          <NumInput
            value={cfg.minBet}
            onChange={(n) => onPatch({ minBet: n })}
            step={0.1}
            min={0.01}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Engine max bet</span>
          <NumInput
            value={cfg.maxBet}
            onChange={(n) => onPatch({ maxBet: n })}
            step={1}
            min={1}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="flex items-center gap-1 font-semibold text-muted-foreground">
            Max win × stake
            <FieldGuide
              title="Max win"
              body="Caps total payout across base + Dragon + Free Spins + Gamble (0 = off)."
            />
          </span>
          <NumInput
            value={cfg.maxWinMult}
            onChange={(n) => onPatch({ maxWinMult: n })}
            step={100}
            min={0}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Target RTP %</span>
          <NumInput
            value={cfg.targetRtp}
            onChange={(n) => onPatch({ targetRtp: n })}
            step={0.01}
            min={80}
            max={99.5}
            suffix="%"
          />
        </label>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        Run <code className="text-amber-300">npx tsx scripts/test-lantern-luck.ts --rtp 100000</code>{" "}
        after weight/pay changes to verify theoretical RTP before compliance sign-off.
      </div>

      <button
        type="button"
        onClick={() => {
          onPatch(structuredClone(DEFAULT_LANTERN_LUCK_CONFIG));
          toast.message("Reset to default engine values (not saved yet)");
        }}
        className="rounded-xl border border-amber-500/25 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/10"
      >
        Reset engine to defaults
      </button>

      <SaveBar onSave={onSave} saving={saving} />
    </div>
  );
}
