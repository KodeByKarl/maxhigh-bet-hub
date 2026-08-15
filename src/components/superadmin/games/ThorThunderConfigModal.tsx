import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Dices,
  Info,
  Landmark,
  LayoutGrid,
  Save,
  Settings2,
  Sparkles,
  Store,
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
  DEFAULT_THOR_THUNDER_CONFIG,
  normalizeThorThunderConfig,
  weightPercents,
  type ThorThunderConfig,
  type ThorThunderSymbolConfig,
} from "@/lib/thor-thunder-config";
import {
  getThorThunderEngineConfigFn,
  saveThorThunderEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { SymbolIcon } from "@/components/maxhigh/thor-thunder/SymbolIcon";
import type { SymKind } from "@/components/maxhigh/thor-thunder/types";
import { cn } from "@/lib/utils";

type Section = "lobby" | "dead" | "symbols" | "freespins" | "mult";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "dead", label: "Dead spin", icon: Dices },
  { id: "symbols", label: "Symbols", icon: LayoutGrid },
  { id: "freespins", label: "Free spins", icon: Landmark },
  { id: "mult", label: "Multiplier", icon: Sparkles },
];

type Props = {
  game: SuperGameRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatchLobby: (
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) => Promise<void>;
};

export function ThorThunderConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<ThorThunderConfig>(() =>
    structuredClone(DEFAULT_THOR_THUNDER_CONFIG),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setLoading(true);
    void getThorThunderEngineConfigFn()
      .then((c) => setCfg(normalizeThorThunderConfig(c)))
      .catch(() => setCfg(structuredClone(DEFAULT_THOR_THUNDER_CONFIG)))
      .finally(() => setLoading(false));
  }, [open]);

  const spawnPct = useMemo(() => weightPercents(cfg.symbols), [cfg.symbols]);

  async function saveEngine() {
    setSaving(true);
    try {
      const next = await saveThorThunderEngineConfigFn({
        data: { config: normalizeThorThunderConfig(cfg) },
      });
      setCfg(next);
      toast.success("Engine config saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function patch(partial: Partial<ThorThunderConfig>) {
    setCfg((c) => normalizeThorThunderConfig({ ...c, ...partial }));
  }

  function patchSymbol(id: string, partial: Partial<ThorThunderSymbolConfig>) {
    setCfg((c) =>
      normalizeThorThunderConfig({
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
                Lobby visibility and live engine odds — {game.gameId}
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
            ) : section === "dead" ? (
              <DeadSpinSection cfg={cfg} onPatch={patch} onSave={saveEngine} saving={saving} />
            ) : section === "symbols" ? (
              <SymbolsSection
                cfg={cfg}
                spawnPct={spawnPct}
                onPatchSymbol={patchSymbol}
                onSave={saveEngine}
                saving={saving}
              />
            ) : section === "freespins" ? (
              <FreeSpinsSection
                cfg={cfg}
                spawnPct={spawnPct}
                onPatch={patch}
                onPatchSymbol={patchSymbol}
                onSave={saveEngine}
                saving={saving}
              />
            ) : (
              <MultSection cfg={cfg} onPatch={patch} onSave={saveEngine} saving={saving} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-1">
      <h3 className="text-base font-black text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

type FieldGuide = {
  about: string;
  levels?: { value: string; mean: string }[];
  tip?: string;
};

function Field({
  label,
  hint,
  guide,
  children,
}: {
  label: string;
  hint?: string;
  guide?: FieldGuide;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </label>
        {guide ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-white/[0.06] text-muted-foreground transition hover:border-amber-400/60 hover:text-amber-300"
                aria-label={`Guide for ${label}`}
              >
                <Info size={12} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="z-[100] w-[min(100vw-2rem,20rem)] border-amber-400/30 bg-panel p-3 text-foreground shadow-2xl"
            >
              <p className="text-xs font-semibold leading-relaxed text-amber-300">{guide.about}</p>
              {guide.levels?.length ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {guide.levels.map((lv) => (
                    <div key={lv.value} className="rounded-lg bg-amber-500/15 px-2 py-1.5 text-center">
                      <div className="text-sm font-black text-amber-300">{lv.value}</div>
                      <div className="text-[10px] leading-tight text-muted-foreground">{lv.mean}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {guide.tip ? <p className="mt-2 text-[11px] text-muted-foreground">{guide.tip}</p> : null}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/[0.06] px-4 py-3 hover:bg-white/[0.07]">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-amber-500" : "bg-amber-500/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </label>
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
          "h-11 rounded-xl border-transparent bg-white/[0.06] text-foreground",
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

function SaveEngineButton({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <button
      type="button"
      disabled={saving}
      onClick={() => void onSave()}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-amber-500 px-5 text-sm font-bold uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-60"
    >
      <Save size={16} />
      {saving ? "Saving…" : "Save engine"}
    </button>
  );
}

function HintBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function LobbySection({
  game,
  onPatch,
}: {
  game: SuperGameRow;
  onPatch: (
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) => Promise<void>;
}) {
  const [tag, setTag] = useState(game.tag ?? "");
  const [rtp, setRtp] = useState(game.rtp ?? "");
  const [minBet, setMinBet] = useState(game.minBet ?? "");
  const [maxBet, setMaxBet] = useState(game.maxBet ?? "");

  useEffect(() => {
    setTag(game.tag ?? "");
    setRtp(game.rtp ?? "");
    setMinBet(game.minBet ?? "");
    setMaxBet(game.maxBet ?? "");
  }, [game]);

  return (
    <div className="space-y-4">
      <SectionHead title="Lobby" subtitle="How Thor Thunder appears on the casino site." />
      <Toggle
        checked={game.enabled}
        onChange={(v) => void onPatch({ enabled: v })}
        label="Enabled on lobby"
        hint="Off hides this title from players."
      />
      <Toggle
        checked={game.featured}
        onChange={(v) => void onPatch({ featured: v })}
        label="Featured"
        hint="Highlight in featured / promo placements."
      />
      <Field label="Tag">
        <Input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onBlur={() => {
            if (tag !== (game.tag ?? "")) void onPatch({ tag: tag || null });
          }}
          className="h-11 rounded-xl border-transparent bg-white/[0.06] text-foreground"
        />
      </Field>
      <Field label="RTP (display)">
        <Input
          value={rtp}
          onChange={(e) => setRtp(e.target.value)}
          onBlur={() => {
            if (rtp !== (game.rtp ?? "")) void onPatch({ rtp: rtp || null });
          }}
          className="h-11 rounded-xl border-transparent bg-white/[0.06] text-foreground"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Min bet">
          <Input
            value={minBet}
            onChange={(e) => setMinBet(e.target.value)}
            onBlur={() => {
              if (minBet !== (game.minBet ?? "")) void onPatch({ minBet: minBet || null });
            }}
            className="h-11 rounded-xl border-transparent bg-white/[0.06] text-foreground"
          />
        </Field>
        <Field label="Max bet">
          <Input
            value={maxBet}
            onChange={(e) => setMaxBet(e.target.value)}
            onBlur={() => {
              if (maxBet !== (game.maxBet ?? "")) void onPatch({ maxBet: maxBet || null });
            }}
            className="h-11 rounded-xl border-transparent bg-white/[0.06] text-foreground"
          />
        </Field>
      </div>
      <HintBox>Lobby fields save when you leave each input. Engine tabs need Save engine.</HintBox>
    </div>
  );
}

function DeadSpinSection({
  cfg,
  onPatch,
  onSave,
  saving,
}: {
  cfg: ThorThunderConfig;
  onPatch: (p: Partial<ThorThunderConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const hitChance = +(100 - cfg.deadSpinChancePercent).toFixed(1);
  return (
    <div className="space-y-4">
      <SectionHead
        title="Dead spin"
        subtitle="Chance the opening board is not force-seeded with a ways hit."
      />
      <Field
        label="Dead spin chance"
        hint={`Forced-hit chance ≈ ${hitChance}% per spin`}
        guide={{
          about: "Dead spin = opening board na WALANG seeded ways win. Mas mataas = mas madalas blank ang unang drop.",
          levels: [
            { value: "30", mean: "Default — madalas may hit" },
            { value: "50", mean: "Half blank / half hit" },
            { value: "75", mean: "Madalas blank" },
            { value: "100", mean: "Laging blank opening" },
          ],
        }}
      >
        <NumInput
          value={cfg.deadSpinChancePercent}
          min={0}
          max={100}
          suffix="%"
          onChange={(n) => onPatch({ deadSpinChancePercent: n })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seed ways length min">
          <NumInput
            value={cfg.seedWinLengthMin}
            min={3}
            max={6}
            onChange={(n) => onPatch({ seedWinLengthMin: n })}
          />
        </Field>
        <Field label="Seed ways length max">
          <NumInput
            value={cfg.seedWinLengthMax}
            min={3}
            max={6}
            onChange={(n) => onPatch({ seedWinLengthMax: n })}
          />
        </Field>
        <Field label="Seed wild chance" hint="When seeding a hit, chance a reel cell is wild.">
          <NumInput
            value={cfg.seedWildChancePercent}
            min={0}
            max={100}
            suffix="%"
            onChange={(n) => onPatch({ seedWildChancePercent: n })}
          />
        </Field>
        <Field label="FS board wild chance">
          <NumInput
            value={cfg.freeSpinsWildChancePercent}
            min={0}
            max={100}
            suffix="%"
            onChange={(n) => onPatch({ freeSpinsWildChancePercent: n })}
          />
        </Field>
        <Field label="Cascade wild chance (FS)">
          <NumInput
            value={cfg.cascadeWildChancePercent}
            min={0}
            max={100}
            suffix="%"
            onChange={(n) => onPatch({ cascadeWildChancePercent: n })}
          />
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <SaveEngineButton onSave={onSave} saving={saving} />
      </div>
    </div>
  );
}

function SymbolsSection({
  cfg,
  spawnPct,
  onPatchSymbol,
  onSave,
  saving,
}: {
  cfg: ThorThunderConfig;
  spawnPct: Record<string, number>;
  onPatchSymbol: (id: string, p: Partial<ThorThunderSymbolConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <SectionHead
        title="Symbols"
        subtitle="Spawn weights and way pays × bet for 3 / 4 / 5 / 6 of a kind."
      />
      <div className="space-y-3">
        {cfg.symbols.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-amber-500/15 bg-white/[0.04] p-3 sm:p-4"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="grid size-12 place-items-center overflow-hidden rounded-lg bg-black/30">
                <SymbolIcon kind={s.kind as SymKind} className="size-10" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-foreground">{s.label}</div>
                <div className="text-[11px] text-amber-300/90">
                  Spawn ≈ {spawnPct[s.id] ?? 0}%
                  {s.wild ? " · WILD" : ""}
                  {s.scatter ? " · SCATTER" : ""}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              <Field label="Weight">
                <NumInput
                  value={s.weight}
                  step={0.1}
                  min={0}
                  onChange={(n) => onPatchSymbol(s.id, { weight: n })}
                />
              </Field>
              {([0, 1, 2, 3] as const).map((i) => (
                  <Field key={i} label={`${i + 3}-kind`}>
                  <NumInput
                    value={s.pay[i]}
                    step={0.05}
                    min={0}
                    onChange={(n) => {
                      if (s.wild || s.scatter) return;
                      const pay = [...s.pay] as [number, number, number, number];
                      pay[i] = n;
                      onPatchSymbol(s.id, { pay });
                    }}
                  />
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <SaveEngineButton onSave={onSave} saving={saving} />
      </div>
    </div>
  );
}

function FreeSpinsSection({
  cfg,
  spawnPct,
  onPatch,
  onPatchSymbol,
  onSave,
  saving,
}: {
  cfg: ThorThunderConfig;
  spawnPct: Record<string, number>;
  onPatch: (p: Partial<ThorThunderConfig>) => void;
  onPatchSymbol: (id: string, p: Partial<ThorThunderSymbolConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const scatter = cfg.symbols.find((s) => s.scatter)!;
  return (
    <div className="space-y-4">
      <SectionHead title="Free spins" subtitle="Scatter trigger, awards, buy feature, cash tiers." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Scatter weight" hint={`Spawn ≈ ${spawnPct.scatter ?? 0}%`}>
          <NumInput
            value={scatter.weight}
            step={0.1}
            min={0}
            onChange={(n) => onPatchSymbol("scatter", { weight: n })}
          />
        </Field>
        <Field label="Buy feature cost">
          <NumInput
            value={cfg.buyFeatureMult}
            suffix="× bet"
            min={1}
            onChange={(n) => onPatch({ buyFeatureMult: n })}
          />
        </Field>
        <Field label="FS trigger count">
          <NumInput
            value={cfg.freeSpinsTriggerCount}
            min={1}
            onChange={(n) => onPatch({ freeSpinsTriggerCount: n })}
          />
        </Field>
        <Field label="Retrigger count (in FS)">
          <NumInput
            value={cfg.freeSpinsRetriggerCount}
            min={1}
            onChange={(n) => onPatch({ freeSpinsRetriggerCount: n })}
          />
        </Field>
        <Field label="Retrigger +spins">
          <NumInput
            value={cfg.freeSpinsRetrigger}
            min={0}
            onChange={(n) => onPatch({ freeSpinsRetrigger: n })}
          />
        </Field>
      </div>

      <SectionHead title="FS awards by scatter count" subtitle="Spins granted when triggering." />
      <div className="space-y-2">
        {cfg.freeSpinsAwards.map((t, i) => (
          <div
            key={`${t.count}-${i}`}
            className="grid grid-cols-2 gap-3 rounded-2xl bg-white/[0.06] px-4 py-3"
          >
            <Field label="Scatters ≥">
              <NumInput
                value={t.count}
                onChange={(n) => {
                  const freeSpinsAwards = cfg.freeSpinsAwards.map((row, idx) =>
                    idx === i ? { ...row, count: n } : row,
                  );
                  onPatch({ freeSpinsAwards });
                }}
              />
            </Field>
            <Field label="Spins">
              <NumInput
                value={t.spins}
                onChange={(n) => {
                  const freeSpinsAwards = cfg.freeSpinsAwards.map((row, idx) =>
                    idx === i ? { ...row, spins: n } : row,
                  );
                  onPatch({ freeSpinsAwards });
                }}
              />
            </Field>
          </div>
        ))}
      </div>

      <SectionHead title="Scatter cash" subtitle="× bet by scatter count on base game." />
      <div className="space-y-2">
        {cfg.scatterCashTiers.map((t, i) => (
          <div
            key={`${t.count}-${i}`}
            className="grid grid-cols-2 gap-3 rounded-2xl bg-white/[0.06] px-4 py-3"
          >
            <Field label="Count ≥">
              <NumInput
                value={t.count}
                onChange={(n) => {
                  const scatterCashTiers = cfg.scatterCashTiers.map((row, idx) =>
                    idx === i ? { ...row, count: n } : row,
                  );
                  onPatch({ scatterCashTiers });
                }}
              />
            </Field>
            <Field label="× bet">
              <NumInput
                value={t.mult}
                step={0.5}
                onChange={(n) => {
                  const scatterCashTiers = cfg.scatterCashTiers.map((row, idx) =>
                    idx === i ? { ...row, mult: n } : row,
                  );
                  onPatch({ scatterCashTiers });
                }}
              />
            </Field>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <SaveEngineButton onSave={onSave} saving={saving} />
      </div>
    </div>
  );
}

function MultSection({
  cfg,
  onPatch,
  onSave,
  saving,
}: {
  cfg: ThorThunderConfig;
  onPatch: (p: Partial<ThorThunderConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <SectionHead
        title="Free-spin multiplier"
        subtitle="Progressive cascade multiplier during free spins."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start multiplier" hint="Usually 1× at the start of free spins.">
          <NumInput
            value={cfg.fsMultStart}
            min={1}
            step={1}
            suffix="×"
            onChange={(n) => onPatch({ fsMultStart: n })}
          />
        </Field>
        <Field label="Step per cascade" hint="Added after each winning cascade in FS.">
          <NumInput
            value={cfg.fsMultStep}
            min={0}
            step={1}
            suffix="+"
            onChange={(n) => onPatch({ fsMultStep: n })}
          />
        </Field>
      </div>
      <HintBox>
        Example: start 1×, step +1 → after 3 cascades the board pays at 4×. Cascade wins already apply
        this each step.
      </HintBox>
      <div className="flex justify-end pt-2">
        <SaveEngineButton onSave={onSave} saving={saving} />
      </div>
    </div>
  );
}
