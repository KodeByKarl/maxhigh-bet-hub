import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Candy,
  Dices,
  Info,
  LayoutGrid,
  Save,
  Settings2,
  SlidersHorizontal,
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
  bombTablePercents,
  DEFAULT_BORACAY_BOUNCE_CONFIG,
  normalizeBoracayBounceConfig,
  weightPercents,
  type BoracayBounceConfig,
  type BoracayBounceSymbolConfig,
} from "@/lib/boracay-bounce-config";
import {
  getBoracayBounceEngineConfigFn,
  saveBoracayBounceEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { BoracayBounceIcon } from "@/components/maxhigh/boracay-bounce/BoracayBounceIcon";
import type { SymKind } from "@/components/maxhigh/boracay-bounce/types";
import { cn } from "@/lib/utils";

type Section = "lobby" | "dead" | "symbols" | "mult" | "freespins";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "dead", label: "Dead spin", icon: Dices },
  { id: "symbols", label: "Symbols", icon: LayoutGrid },
  { id: "mult", label: "Multipliers", icon: Sparkles },
  { id: "freespins", label: "Rocket", icon: Candy },
];

type Props = {
  game: SuperGameRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatchLobby: (
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) => Promise<void>;
};

export function BoracayBounceConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<BoracayBounceConfig>(() =>
    structuredClone(DEFAULT_BORACAY_BOUNCE_CONFIG),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setLoading(true);
    void getBoracayBounceEngineConfigFn()
      .then((c) => setCfg(normalizeBoracayBounceConfig(c)))
      .catch(() => setCfg(structuredClone(DEFAULT_BORACAY_BOUNCE_CONFIG)))
      .finally(() => setLoading(false));
  }, [open]);

  const spawnPct = useMemo(
    () => weightPercents(cfg.symbols.filter((s) => !s.bomb)),
    [cfg.symbols],
  );
  const bombPct = useMemo(() => bombTablePercents(cfg.bombTable), [cfg.bombTable]);

  async function saveEngine() {
    setSaving(true);
    try {
      const next = await saveBoracayBounceEngineConfigFn({
        data: { config: normalizeBoracayBounceConfig(cfg) },
      });
      setCfg(next);
      toast.success("Boracay Bounce engine config saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function patch(partial: Partial<BoracayBounceConfig>) {
    setCfg((c) => normalizeBoracayBounceConfig({ ...c, ...partial }));
  }

  function patchSymbol(id: string, partial: Partial<BoracayBounceSymbolConfig>) {
    setCfg((c) =>
      normalizeBoracayBounceConfig({
        ...c,
        symbols: c.symbols.map((s) => (s.id === id ? { ...s, ...partial } : s)),
      }),
    );
  }

  function patchBombWeight(mult: number, weight: number) {
    setCfg((c) =>
      normalizeBoracayBounceConfig({
        ...c,
        bombTable: c.bombTable.map((b) => (b.mult === mult ? { ...b, weight } : b)),
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
            ) : section === "mult" ? (
              <MultSection
                cfg={cfg}
                bombPct={bombPct}
                onPatch={patch}
                onPatchBomb={patchBombWeight}
                onSave={saveEngine}
                saving={saving}
              />
            ) : (
              <FreeSpinsSection
                cfg={cfg}
                spawnPct={spawnPct}
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
    <div className="mb-1">
      <h3 className="text-base font-black text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

type GuideLevel = { value: string; mean: string };

type FieldGuide = {
  /** Short what-this-does text */
  about: string;
  /** Optional quick scale like 25 / 50 / 75 / 100 */
  levels?: GuideLevel[];
  tip?: string;
};

/** Reusable guides so owners (matatanda) get clear meaning. */
const GUIDE = {
  deadSpin: {
    about:
      "Dead spin = opening board na WALANG winning cluster. Mas mataas = mas madalas blank ang unang drop.",
    levels: [
      { value: "25", mean: "Madalas may opening win" },
      { value: "50", mean: "Half blank / half hit" },
      { value: "75", mean: "Madalas blank" },
      { value: "100", mean: "Laging blank opening (no pay yet)" },
    ],
    tip: "Sa 100, opening board is always dead. Wins can still appear after tumble refill — that is normal.",
  } satisfies FieldGuide,
  melonBias: {
    about: "Kapag may forced win, gaano kadalas melon ang pipiliin.",
    levels: [
      { value: "25", mean: "Madalang melon" },
      { value: "50", mean: "Half of the time melon" },
      { value: "75", mean: "Madalas melon" },
      { value: "100", mean: "Laging melon" },
    ],
  } satisfies FieldGuide,
  symbolChance: {
    about:
      "Relative chance ng icon sa bawat cell. Hindi exact % — ikukumpara sa ibang symbols. Mas mataas = mas madalas lumabas.",
    levels: [
      { value: "5", mean: "Bihira (premium)" },
      { value: "10", mean: "Katamtaman" },
      { value: "15–18", mean: "Madalas (common)" },
      { value: "25+", mean: "Napakadalas" },
    ],
    tip: "Tingnan ang amber % sa taas — yan ang actual chance per cell.",
  } satisfies FieldGuide,
  payTier: {
    about:
      "Payout × bet kapag umabot ang bilang ng matching symbols. Halimbawa 2.0 = 2× ng bet.",
    levels: [
      { value: "0.5", mean: "Maliit na win" },
      { value: "2–5", mean: "Katamtaman" },
      { value: "10–25", mean: "Malaki" },
      { value: "50+", mean: "Jackpot-style" },
    ],
  } satisfies FieldGuide,
  bombPct: {
    about: "Chance na maging bomb ang isang cell (pagkatapos pumili ng symbol).",
    levels: [
      { value: "4", mean: "Default base — bihira" },
      { value: "10–15", mean: "Mas maraming bombs" },
      { value: "22", mean: "Default free spins" },
      { value: "50+", mean: "Sobrang agresibo" },
    ],
    tip: "Base game: mababa. Free spins: pwedeng mas mataas.",
  } satisfies FieldGuide,
  multChance: {
    about:
      "Relative chance ng multiplier na ito kapag may bomb. Mas mataas = mas madalas makita ang × value na ito.",
    levels: [
      { value: "1–3", mean: "Bihira (high ×)" },
      { value: "8–12", mean: "Katamtaman" },
      { value: "20–28", mean: "Madalas (low ×)" },
      { value: "40+", mean: "Halos lagi ito" },
    ],
    tip: "Tingnan ang % sa ilalim ng × — yan ang share kapag may bomb.",
  } satisfies FieldGuide,
  caneSpawn: {
    about: "Gaano kadalas lumabas ang rocket (scatter) sa bawat cell. Dapat rare.",
    levels: [
      { value: "1–2", mean: "Sobrang rare" },
      { value: "3.2", mean: "Default — rare" },
      { value: "6–8", mean: "Mas madalas FS" },
      { value: "15+", mean: "Hindi na rare" },
    ],
  } satisfies FieldGuide,
  anteBoost: {
    about: "Kapag naka-Ante ang player, multiply ang rocket chance.",
    levels: [
      { value: "1", mean: "Walang boost" },
      { value: "2", mean: "Default — 2× cane chance" },
      { value: "3", mean: "Mas agresibo" },
      { value: "5+", mean: "Sobrang madaling mag-FS" },
    ],
  } satisfies FieldGuide,
  fsTrigger: {
    about: "Ilang rocket ang kailangan para magsimula ang Free Spins.",
    levels: [
      { value: "3", mean: "Madaling mag-trigger" },
      { value: "4", mean: "Default — balanced" },
      { value: "5", mean: "Mahirap" },
      { value: "6+", mean: "Sobrang rare" },
    ],
  } satisfies FieldGuide,
  clusterCount: {
    about: "Ilang matching symbols ang kailangan para may win.",
    levels: [
      { value: "6", mean: "Madaling manalo" },
      { value: "8", mean: "Default" },
      { value: "10", mean: "Mahirap" },
      { value: "12+", mean: "Sobrang tipid" },
    ],
  } satisfies FieldGuide,
  seedSize: {
    about: "Kapag may forced win, ilang symbols ang i-plant sa board.",
    levels: [
      { value: "8", mean: "Minimum win cluster" },
      { value: "10", mean: "Solid win" },
      { value: "12", mean: "Malaking cluster" },
      { value: "15+", mean: "Sobrang laki" },
    ],
  } satisfies FieldGuide,
  buyCost: {
    about: "Presyo ng Buy Feature = number × current bet. Hal. 100 × ₱5 = ₱500.",
    levels: [
      { value: "50", mean: "Mura / agresibo" },
      { value: "100", mean: "Default buy" },
      { value: "500", mean: "Default super buy" },
      { value: "1000+", mean: "Premium / mahal" },
    ],
  } satisfies FieldGuide,
  spinCount: {
    about: "Ilang free spins ang ibibigay / idadagdag.",
    levels: [
      { value: "5", mean: "Konti" },
      { value: "10", mean: "Default start" },
      { value: "15", mean: "Generous" },
      { value: "20+", mean: "Sobrang daming spins" },
    ],
  } satisfies FieldGuide,
  payMult: {
    about: "Cash × bet kapag umabot ang cane count. Hal. 3 = 3× bet.",
    levels: [
      { value: "1", mean: "Maliit" },
      { value: "3–5", mean: "Katamtaman" },
      { value: "10–50", mean: "Malaki" },
      { value: "100", mean: "Mega scatter pay" },
    ],
  } satisfies FieldGuide,
  tag: {
    about: "Badge sa lobby (Hot, New, Mega, atbp.). Display only — hindi ito odds.",
  } satisfies FieldGuide,
  rtp: {
    about:
      "Display text lang para sa players (hal. 96.8%). Hindi automatic na nagbabago ang math — gamitin ang engine tabs para sa totoong odds.",
  } satisfies FieldGuide,
  betDisplay: {
    about: "Min/Max bet text sa game card. Display / marketing — i-align sa actual bet steps kung kaya.",
  } satisfies FieldGuide,
} as const;

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
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-white/[0.06] text-muted-foreground transition hover:border-amber-400/60 hover:text-amber-300 data-[state=open]:border-amber-400 data-[state=open]:bg-amber-500 data-[state=open]:text-black"
                aria-label={`Guide for ${label}`}
              >
                <Info size={12} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              sideOffset={8}
              collisionPadding={16}
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

function ResetLink({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
    >
      Reset this section to defaults
    </button>
  );
}

function HintBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-white/[0.05] px-4 py-3 text-xs text-muted-foreground">
      <SlidersHorizontal size={14} className="mt-0.5 shrink-0 text-amber-400" />
      <span>{children}</span>
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
      <SectionHead title="Lobby" subtitle="How Boracay Bounce appears on the casino site." />
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
      <Field label="Tag" guide={GUIDE.tag}>
        <Input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onBlur={() => {
            if (tag !== (game.tag ?? "")) void onPatch({ tag: tag || null });
          }}
          className="h-11 rounded-xl border-transparent bg-white/[0.06] text-foreground"
        />
      </Field>
      <Field label="RTP (display)" guide={GUIDE.rtp}>
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
        <Field label="Min bet" guide={GUIDE.betDisplay}>
          <Input
            value={minBet}
            onChange={(e) => setMinBet(e.target.value)}
            onBlur={() => {
              if (minBet !== (game.minBet ?? "")) void onPatch({ minBet: minBet || null });
            }}
            className="h-11 rounded-xl border-transparent bg-white/[0.06] text-foreground"
          />
        </Field>
        <Field label="Max bet" guide={GUIDE.betDisplay}>
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
  cfg: BoracayBounceConfig;
  onPatch: (p: Partial<BoracayBounceConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const hitChance = +(100 - cfg.deadSpinChancePercent).toFixed(1);
  return (
    <div className="space-y-4">
      <SectionHead
        title="Dead spin"
        subtitle="Chance the opening board is not force-seeded with a win."
      />
      <Field
        label="Dead spin chance"
        hint={`Forced-hit chance ≈ ${hitChance}% per spin`}
        guide={GUIDE.deadSpin}
      >
        <NumInput
          value={cfg.deadSpinChancePercent}
          min={0}
          max={100}
          suffix="%"
          onChange={(n) => onPatch({ deadSpinChancePercent: n })}
        />
      </Field>
      <Field label="Melon bias when seeding a win" guide={GUIDE.melonBias}>
        <NumInput
          value={cfg.seedMelonBiasPercent}
          min={0}
          max={100}
          suffix="%"
          onChange={(n) => onPatch({ seedMelonBiasPercent: n })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seed cluster min" guide={GUIDE.seedSize}>
          <NumInput
            value={cfg.seedClusterMin}
            min={3}
            max={30}
            onChange={(n) => onPatch({ seedClusterMin: n })}
          />
        </Field>
        <Field label="Seed cluster max" guide={GUIDE.seedSize}>
          <NumInput
            value={cfg.seedClusterMax}
            min={3}
            max={30}
            onChange={(n) => onPatch({ seedClusterMax: n })}
          />
        </Field>
      </div>
      <Field
        label="Min cluster to win"
        hint="Matching symbols anywhere on the grid."
        guide={GUIDE.clusterCount}
      >
        <NumInput
          value={cfg.minCluster}
          min={3}
          max={30}
          onChange={(n) => onPatch({ minCluster: n })}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SaveEngineButton onSave={onSave} saving={saving} />
        <ResetLink
          onReset={() =>
            onPatch({
              deadSpinChancePercent: DEFAULT_BORACAY_BOUNCE_CONFIG.deadSpinChancePercent,
              seedMelonBiasPercent: DEFAULT_BORACAY_BOUNCE_CONFIG.seedMelonBiasPercent,
              seedClusterMin: DEFAULT_BORACAY_BOUNCE_CONFIG.seedClusterMin,
              seedClusterMax: DEFAULT_BORACAY_BOUNCE_CONFIG.seedClusterMax,
              minCluster: DEFAULT_BORACAY_BOUNCE_CONFIG.minCluster,
            })
          }
        />
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
  cfg: BoracayBounceConfig;
  spawnPct: Record<string, number>;
  onPatchSymbol: (id: string, p: Partial<BoracayBounceSymbolConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const pays = cfg.symbols.filter((s) => !s.scatter && !s.bomb);
  return (
    <div className="space-y-4">
      <SectionHead
        title="Symbols & pays"
        subtitle={`Chance = how often this symbol shows per cell. Pays × bet at ${cfg.minCluster} / ${cfg.minCluster + 2} / ${cfg.minCluster + 4}+.`}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {pays.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl bg-white/[0.06] px-4 py-3 hover:bg-white/[0.06]"
          >
            <div className="mb-3 flex items-center gap-3">
              <BoracayBounceIcon kind={s.kind as SymKind} className="size-9 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{s.label}</div>
                <div className="text-xs text-amber-300">
                  {spawnPct[s.id]?.toFixed(2) ?? "0"}% per cell
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Chance" guide={GUIDE.symbolChance}>
                <NumInput
                  value={s.weight}
                  step={0.1}
                  onChange={(n) => onPatchSymbol(s.id, { weight: n })}
                />
              </Field>
              <Field label={`${cfg.minCluster}+`} guide={GUIDE.payTier}>
                <NumInput
                  value={s.pay[0]}
                  step={0.05}
                  onChange={(n) => onPatchSymbol(s.id, { pay: [n, s.pay[1], s.pay[2]] })}
                />
              </Field>
              <Field label={`${cfg.minCluster + 2}+`} guide={GUIDE.payTier}>
                <NumInput
                  value={s.pay[1]}
                  step={0.05}
                  onChange={(n) => onPatchSymbol(s.id, { pay: [s.pay[0], n, s.pay[2]] })}
                />
              </Field>
              <Field label={`${cfg.minCluster + 4}+`} guide={GUIDE.payTier}>
                <NumInput
                  value={s.pay[2]}
                  step={0.05}
                  onChange={(n) => onPatchSymbol(s.id, { pay: [s.pay[0], s.pay[1], n] })}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SaveEngineButton onSave={onSave} saving={saving} />
      </div>
    </div>
  );
}

function MultSection({
  cfg,
  bombPct,
  onPatch,
  onPatchBomb,
  onSave,
  saving,
}: {
  cfg: BoracayBounceConfig;
  bombPct: Record<number, number>;
  onPatch: (p: Partial<BoracayBounceConfig>) => void;
  onPatchBomb: (mult: number, weight: number) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <SectionHead
        title="Multipliers"
        subtitle="Bomb spawn chance, then which multiplier value appears."
      />
      <Field
        label="Bomb chance · base game"
        hint="Per cell on each spin / tumble refill."
        guide={GUIDE.bombPct}
      >
        <NumInput
          value={cfg.bombChanceBasePercent}
          min={0}
          max={100}
          step={0.5}
          suffix="%"
          onChange={(n) => onPatch({ bombChanceBasePercent: n })}
        />
      </Field>
      <Field label="Bomb chance · free spins" guide={GUIDE.bombPct}>
        <NumInput
          value={cfg.bombChanceFreeSpinsPercent}
          min={0}
          max={100}
          step={0.5}
          suffix="%"
          onChange={(n) => onPatch({ bombChanceFreeSpinsPercent: n })}
        />
      </Field>
      <SectionHead title="Multiplier table" subtitle="% when a bomb lands on that value." />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {cfg.bombTable.map((b) => (
          <div
            key={b.mult}
            className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3"
          >
            <div className="w-16 shrink-0 text-center">
              <div className="text-lg font-black text-amber-300">{b.mult}×</div>
              <div className="text-[11px] text-muted-foreground">{bombPct[b.mult]?.toFixed(2) ?? 0}%</div>
            </div>
            <Field label="Chance" guide={GUIDE.multChance}>
              <NumInput
                value={b.weight}
                step={0.1}
                min={0}
                onChange={(n) => onPatchBomb(b.mult, n)}
              />
            </Field>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
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
  cfg: BoracayBounceConfig;
  spawnPct: Record<string, number>;
  onPatch: (p: Partial<BoracayBounceConfig>) => void;
  onPatchSymbol: (id: string, p: Partial<BoracayBounceSymbolConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const cane = cfg.symbols.find((s) => s.scatter)!;
  return (
    <div className="space-y-4">
      <SectionHead
        title="Rocket / free spins"
        subtitle="Scatter rarity, trigger thresholds, and buy feature costs."
      />
      <div className="flex items-center gap-3 rounded-2xl bg-rose-500/10 px-4 py-3">
        <BoracayBounceIcon kind="lollipop" className="size-11 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-rose-200">Rocket (scatter)</div>
          <div className="text-xs text-muted-foreground">
            Rare ·{" "}
            <span className="font-bold text-amber-300">
              {spawnPct.lollipop?.toFixed(2) ?? 0}%
            </span>{" "}
            per cell each spin
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Spawn chance" guide={GUIDE.caneSpawn}>
          <NumInput
            value={cane.weight}
            step={0.1}
            onChange={(n) => onPatchSymbol("lollipop", { weight: n })}
          />
        </Field>
        <Field
          label="Ante chance boost"
          hint="Makes rockets show more often when Ante is on."
          guide={GUIDE.anteBoost}
        >
          <NumInput
            value={cfg.anteScatterWeightMult}
            step={0.25}
            min={1}
            max={10}
            onChange={(n) => onPatch({ anteScatterWeightMult: n })}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="FS trigger (base)"
          hint="Rockets needed to start free spins."
          guide={GUIDE.fsTrigger}
        >
          <NumInput
            value={cfg.freeSpinsTriggerCount}
            onChange={(n) => onPatch({ freeSpinsTriggerCount: n })}
          />
        </Field>
        <Field label="Retrigger count (in FS)" guide={GUIDE.fsTrigger}>
          <NumInput
            value={cfg.freeSpinsRetriggerCount}
            onChange={(n) => onPatch({ freeSpinsRetriggerCount: n })}
          />
        </Field>
        <Field label="Free spins awarded" guide={GUIDE.spinCount}>
          <NumInput value={cfg.freeSpinsBase} onChange={(n) => onPatch({ freeSpinsBase: n })} />
        </Field>
        <Field label="Retrigger +spins" guide={GUIDE.spinCount}>
          <NumInput
            value={cfg.freeSpinsRetrigger}
            onChange={(n) => onPatch({ freeSpinsRetrigger: n })}
          />
        </Field>
        <Field label="Buy feature cost" guide={GUIDE.buyCost}>
          <NumInput
            value={cfg.buyFeatureMult}
            suffix="× bet"
            onChange={(n) => onPatch({ buyFeatureMult: n })}
          />
        </Field>
        <Field label="Super buy cost" guide={GUIDE.buyCost}>
          <NumInput
            value={cfg.superBuyFeatureMult}
            suffix="× bet"
            onChange={(n) => onPatch({ superBuyFeatureMult: n })}
          />
        </Field>
        <Field label="Ante bet mult" guide={GUIDE.anteBoost}>
          <NumInput
            value={cfg.anteBetMult}
            step={0.05}
            min={1}
            onChange={(n) => onPatch({ anteBetMult: n })}
          />
        </Field>
      </div>

      <SectionHead title="Scatter cash" subtitle="× bet by rocket count on the spin." />
      <div className="space-y-2">
        {cfg.scatterCashTiers.map((t, i) => (
          <div
            key={`${t.count}-${i}`}
            className="grid grid-cols-2 gap-3 rounded-2xl bg-white/[0.06] px-4 py-3"
          >
            <Field label="Count ≥" guide={GUIDE.fsTrigger}>
              <NumInput
                value={t.count}
                onChange={(n) => {
                  const next = cfg.scatterCashTiers.map((row, j) =>
                    j === i ? { ...row, count: n } : row,
                  );
                  onPatch({ scatterCashTiers: next });
                }}
              />
            </Field>
            <Field label="Pay × bet" guide={GUIDE.payMult}>
              <NumInput
                value={t.mult}
                step={0.5}
                onChange={(n) => {
                  const next = cfg.scatterCashTiers.map((row, j) =>
                    j === i ? { ...row, mult: n } : row,
                  );
                  onPatch({ scatterCashTiers: next });
                }}
              />
            </Field>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SaveEngineButton onSave={onSave} saving={saving} />
      </div>
    </div>
  );
}
