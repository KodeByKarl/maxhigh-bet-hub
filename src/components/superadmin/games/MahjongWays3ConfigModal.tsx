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
  DEFAULT_MAHJONG_WAYS_3_CONFIG,
  normalizeMahjongWays3Config,
  weightPercents,
  type MahjongSymbolConfig,
  type MahjongWays3Config,
} from "@/lib/mahjong-ways-3-config";
import {
  getMahjongWays3EngineConfigFn,
  saveMahjongWays3EngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { Mahjong3Icon } from "@/components/maxhigh/mahjong-ways-3/Mahjong3Icon";
import { cn } from "@/lib/utils";

type Section = "lobby" | "symbols" | "cascades" | "bonus";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "symbols", label: "Symbols", icon: LayoutGrid },
  { id: "cascades", label: "Cascades", icon: Sparkles },
  { id: "bonus", label: "Bonus / Cap", icon: Coins },
];

type Props = {
  game: SuperGameRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatchLobby: (
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) => Promise<void>;
};

export function MahjongWays3ConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<MahjongWays3Config>(() =>
    structuredClone(DEFAULT_MAHJONG_WAYS_3_CONFIG),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setLoading(true);
    void getMahjongWays3EngineConfigFn()
      .then((c) => setCfg(normalizeMahjongWays3Config(c)))
      .catch(() => {
        toast.error("Failed loading engine config — using defaults");
        setCfg(structuredClone(DEFAULT_MAHJONG_WAYS_3_CONFIG));
      })
      .finally(() => setLoading(false));
  }, [open]);

  const spawnPct = useMemo(
    () => weightPercents(cfg.symbols.filter((s) => !s.wild && !s.scatter)),
    [cfg.symbols],
  );
  const allPct = useMemo(() => weightPercents(cfg.symbols), [cfg.symbols]);

  async function saveEngine() {
    setSaving(true);
    try {
      const next = await saveMahjongWays3EngineConfigFn({
        data: { config: normalizeMahjongWays3Config(cfg) },
      });
      setCfg(normalizeMahjongWays3Config(next));
      toast.success("Mahjong Ways 2 engine config saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function patch(partial: Partial<MahjongWays3Config>) {
    setCfg((c) => normalizeMahjongWays3Config({ ...c, ...partial }));
  }

  function patchSymbol(id: string, partial: Partial<MahjongSymbolConfig>) {
    setCfg((c) =>
      normalizeMahjongWays3Config({
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
                Lobby visibility and live ways / cascade / free-spin odds — {game.gameId}
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
                      ? "bg-amber-500 text-black"
                      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
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
                spawnPct={spawnPct}
                allPct={allPct}
                onPatchSymbol={patchSymbol}
                onSave={saveEngine}
                saving={saving}
              />
            ) : section === "cascades" ? (
              <CascadesSection cfg={cfg} onPatch={patch} onSave={saveEngine} saving={saving} />
            ) : (
              <BonusSection
                cfg={cfg}
                allPct={allPct}
                onPatch={patch}
                onPatchSymbol={patchSymbol}
                onSave={saveEngine}
                saving={saving}
              />
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
        value={value}
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
  const [rtp, setRtp] = useState(Number(game.rtp) || 96.9);
  const [volatility, setVolatility] = useState(game.volatility ?? "High");
  const [minBet, setMinBet] = useState(Number(game.minBet) || 0.2);
  const [maxBet, setMaxBet] = useState(Number(game.maxBet) || 250);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTag(game.tag ?? "");
    setRtp(Number(game.rtp) || 96.9);
    setVolatility(game.volatility ?? "High");
    setMinBet(Number(game.minBet) || 0.2);
    setMaxBet(Number(game.maxBet) || 250);
  }, [game]);

  async function saveLobby() {
    setBusy(true);
    try {
      await onPatch({
        tag: tag.trim() || undefined,
        rtp: String(rtp),
        volatility: volatility.trim() || "High",
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
        subtitle="Visibility and display metadata (does not change spin math)."
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
          <NumInput value={rtp} onChange={setRtp} step={0.1} min={80} max={99} suffix="%" />
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
          <span className="font-semibold text-muted-foreground">Min bet</span>
          <NumInput value={minBet} onChange={setMinBet} step={0.5} min={0.1} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-muted-foreground">Max bet</span>
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
  spawnPct,
  allPct,
  onPatchSymbol,
  onSave,
  saving,
}: {
  cfg: MahjongWays3Config;
  spawnPct: Record<string, number>;
  allPct: Record<string, number>;
  onPatchSymbol: (id: string, p: Partial<MahjongSymbolConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <SectionHead
        title="Symbol weights & pays"
        subtitle="Higher weight = more frequent. Pays are × bet for 3 / 4 / 5 consecutive reels."
      />
      <div className="space-y-3">
        {cfg.symbols.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-amber-500/15 bg-white/[0.03] p-3 sm:p-4"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="grid size-12 place-items-center overflow-hidden rounded-lg bg-black/40">
                <Mahjong3Icon kind={s.kind} className="size-10" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-foreground">{s.name}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {s.tier}
                  {s.wild ? " · wild" : ""}
                  {s.scatter ? " · scatter" : ""}
                  {" · "}
                  {(s.wild || s.scatter ? allPct[s.id] : spawnPct[s.id])?.toFixed?.(1) ??
                    allPct[s.id]}
                  % spawn
                </div>
              </div>
              <FieldGuide
                title={s.name}
                body="Weight controls RNG frequency in base / free spins. Pay tiers apply only to regular symbols (wild pays 0; scatter uses 3/4/5 count tiers)."
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
                Weight
                <NumInput
                  value={s.weight}
                  onChange={(n) => onPatchSymbol(s.id, { weight: n })}
                  min={0}
                />
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
                FS weight
                <NumInput
                  value={s.weightFreeSpins}
                  onChange={(n) => onPatchSymbol(s.id, { weightFreeSpins: n })}
                  min={0}
                />
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
                Pay 3
                <NumInput
                  value={s.pay[0]}
                  onChange={(n) => onPatchSymbol(s.id, { pay: [n, s.pay[1], s.pay[2]] })}
                  step={0.001}
                  min={0}
                />
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
                Pay 4
                <NumInput
                  value={s.pay[1]}
                  onChange={(n) => onPatchSymbol(s.id, { pay: [s.pay[0], n, s.pay[2]] })}
                  step={0.001}
                  min={0}
                />
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
                Pay 5
                <NumInput
                  value={s.pay[2]}
                  onChange={(n) => onPatchSymbol(s.id, { pay: [s.pay[0], s.pay[1], n] })}
                  step={0.001}
                  min={0}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <SaveBar onSave={onSave} saving={saving} />
    </div>
  );
}

function CascadesSection({
  cfg,
  onPatch,
  onSave,
  saving,
}: {
  cfg: MahjongWays3Config;
  onPatch: (p: Partial<MahjongWays3Config>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  function patchMult(listKey: "baseCascadeMultipliers" | "freeSpinsCascadeMultipliers", idx: number, n: number) {
    const next = [...cfg[listKey]];
    next[idx] = n;
    onPatch({ [listKey]: next });
  }

  return (
    <div className="space-y-5">
      <SectionHead
        title="Cascade multipliers"
        subtitle="Step 0 = first win on a spin. Later cascade wins climb the ladder (capped at last value)."
      />
      <div className="rounded-2xl border border-amber-500/15 bg-white/[0.03] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-300">
          <Zap size={14} /> Base game ladder
          <FieldGuide title="Base multipliers" body="Default PG Soft-style: ×1 → ×2 → ×3 → ×5." />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cfg.baseCascadeMultipliers.map((m, i) => (
            <label key={i} className="space-y-1 text-[11px] font-semibold text-muted-foreground">
              Step {i + 1}
              <NumInput value={m} onChange={(n) => patchMult("baseCascadeMultipliers", i, n)} min={1} step={1} suffix="×" />
            </label>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-amber-500/15 bg-white/[0.03] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-300">
          Free spins ladder
          <FieldGuide title="FS multipliers" body="Usually doubled: ×2 → ×4 → ×6 → ×10." />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cfg.freeSpinsCascadeMultipliers.map((m, i) => (
            <label key={i} className="space-y-1 text-[11px] font-semibold text-muted-foreground">
              Step {i + 1}
              <NumInput
                value={m}
                onChange={(n) => patchMult("freeSpinsCascadeMultipliers", i, n)}
                min={1}
                step={1}
                suffix="×"
              />
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            Gold chance (initial)
            <FieldGuide title="Gold tiles" body="Probability a non-wild/scatter on reels 2–4 spawns gold-plated (transforms to wild on win)." />
          </span>
          <NumInput
            value={+(cfg.goldChanceInitial * 100).toFixed(2)}
            onChange={(n) => onPatch({ goldChanceInitial: n / 100 })}
            step={0.5}
            min={0}
            max={100}
            suffix="%"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Gold chance (cascade refill)
          <NumInput
            value={+(cfg.goldChanceCascade * 100).toFixed(2)}
            onChange={(n) => onPatch({ goldChanceCascade: n / 100 })}
            step={0.5}
            min={0}
            max={100}
            suffix="%"
          />
        </label>
      </div>
      <SaveBar onSave={onSave} saving={saving} />
    </div>
  );
}

function BonusSection({
  cfg,
  allPct,
  onPatch,
  onPatchSymbol,
  onSave,
  saving,
}: {
  cfg: MahjongWays3Config;
  allPct: Record<string, number>;
  onPatch: (p: Partial<MahjongWays3Config>) => void;
  onPatchSymbol: (id: string, p: Partial<MahjongSymbolConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const scatter = cfg.symbols.find((s) => s.scatter);

  return (
    <div className="space-y-5">
      <SectionHead
        title="Free spins, buy, ante & win cap"
        subtitle="Controls bonus trigger frequency and commercial limits. Live spins read this from the database."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Scatters to trigger
          <NumInput
            value={cfg.freeSpinsTriggerCount}
            onChange={(n) => onPatch({ freeSpinsTriggerCount: n })}
            min={2}
            max={10}
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Base free spins
          <NumInput
            value={cfg.freeSpinsBaseCount}
            onChange={(n) => onPatch({ freeSpinsBaseCount: n })}
            min={1}
            max={100}
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Extra FS per scatter
          <NumInput
            value={cfg.freeSpinsExtraPerScatter}
            onChange={(n) => onPatch({ freeSpinsExtraPerScatter: n })}
            min={0}
            max={20}
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Buy feature × bet
          <NumInput
            value={cfg.buyFeatureMult}
            onChange={(n) => onPatch({ buyFeatureMult: n })}
            min={1}
            step={1}
            suffix="×"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Ante bet mult
          <NumInput
            value={cfg.anteBetMult}
            onChange={(n) => onPatch({ anteBetMult: n })}
            min={1}
            step={0.05}
            suffix="×"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Ante scatter weight boost
          <NumInput
            value={cfg.anteScatterWeightMult}
            onChange={(n) => onPatch({ anteScatterWeightMult: n })}
            min={1}
            step={0.1}
            suffix="×"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Max win × stake (0 = off)
          <NumInput
            value={cfg.maxWinMult}
            onChange={(n) => onPatch({ maxWinMult: n })}
            min={0}
            step={1}
            suffix="×"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Target RTP (tuning guide)
          <NumInput
            value={cfg.targetRtp}
            onChange={(n) => onPatch({ targetRtp: n })}
            min={80}
            max={99}
            step={0.1}
            suffix="%"
          />
        </label>
      </div>

      {scatter && (
        <div className="rounded-2xl border border-amber-500/15 bg-white/[0.03] p-4">
          <div className="mb-2 text-sm font-black text-amber-300">
            Scatter spawn ({allPct[scatter.id]}%)
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
              Base weight
              <NumInput
                value={scatter.weight}
                onChange={(n) => onPatchSymbol(scatter.id, { weight: n })}
                min={0}
              />
            </label>
            <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
              Free spins weight
              <NumInput
                value={scatter.weightFreeSpins}
                onChange={(n) => onPatchSymbol(scatter.id, { weightFreeSpins: n })}
                min={0}
              />
            </label>
          </div>
        </div>
      )}

      <SaveBar onSave={onSave} saving={saving} />
    </div>
  );
}
