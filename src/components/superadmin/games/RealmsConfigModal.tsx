import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Crown,
  Dices,
  LayoutGrid,
  RotateCcw,
  Save,
  Sparkles,
  Store,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getRealmsEngineConfigFn } from "@/functions/realms";
import { saveRealmsEngineConfigFn } from "@/functions/superadmin";
import {
  FAMILY_NAME,
  getRealmsGame,
  realmsBuyMaxQuantity,
  realmsBuyPricePerSpin,
  realmsDefaultConfig,
} from "@/lib/realms";
import { REALMS_BUY_CURVE } from "@/lib/realms/buy-curve";
import { buyBonusTotal } from "@/lib/buy-bonus";
import { formatMoney } from "@/lib/currency";
import {
  BOMB_MULTS,
  bombTablePercents,
  weightPercents,
  type RealmsConfig,
  type RealmsSymbolConfig,
} from "@/lib/realms/schema";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { cn } from "@/lib/utils";
import { SymbolIcon } from "@/components/maxhigh/realms/SymbolIcon";
import { realmsAssets } from "@/components/maxhigh/realms/theme";
import { GuideLink, GuideProvider, InfoButton, type GuideKey } from "./RealmsConfigGuide";

type Section = "lobby" | "dead" | "symbols" | "mult" | "freespins";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "dead", label: "Hit rate", icon: Dices },
  { id: "symbols", label: "Symbols", icon: LayoutGrid },
  { id: "mult", label: "Multipliers", icon: Sparkles },
  { id: "freespins", label: "Free spins & buy", icon: Crown },
];

/** Calibrated return the defaults were measured at (see scripts/realms/calibrate-realms.ts). */
const CALIBRATED_RTP = 96;
const PREVIEW_BETS = [0.2, 1, 2, 5, 10, 50, 100];
const NO_SCROLLBAR = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** Which saved config keys belong to which tab, so a tab can show a "modified" dot. */
const SECTION_KEYS: Record<Exclude<Section, "lobby">, (keyof RealmsConfig)[]> = {
  dead: [
    "deadSpinChancePercent",
    "seedBiasPercent",
    "seedClusterMin",
    "seedClusterMax",
    "maxWinMult",
  ],
  symbols: ["symbols"],
  mult: [
    "bombChanceBasePercent",
    "bombChanceFreeSpinsPercent",
    "maxBaseBombSum",
    "maxFsBombMult",
    "bombTable",
  ],
  freespins: [
    "freeSpinsTriggerCount",
    "freeSpinsBase",
    "freeSpinsRetriggerCount",
    "freeSpinsRetrigger",
    "maxFsSessionSpins",
    "buyFeatureMult",
    "anteBetMult",
    "anteScatterWeightMult",
  ],
};

/** Lobby text fields are stored as strings ("96.0%", "₱0.20") — edited as strings. */
type LobbyDraft = { tag: string; rtp: string; volatility: string; minBet: string; maxBet: string };

function lobbyDraft(game: SuperGameRow): LobbyDraft {
  return {
    tag: game.tag ?? "",
    rtp: game.rtp ?? "",
    volatility: game.volatility ?? "",
    minBet: game.minBet ?? "",
    maxBet: game.maxBet ?? "",
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Props = {
  game: SuperGameRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatchLobby: (
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) => Promise<void>;
};

/** One config editor for every Realms title — fields come from the shared schema. */
export function RealmsConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const def = useMemo(() => getRealmsGame(game.gameId), [game.gameId]);
  const defaults = useMemo(() => realmsDefaultConfig(def.id), [def.id]);
  const icons = useMemo(() => realmsAssets(def.id).icons, [def.id]);
  const cells = def.board.cols * def.board.rows;
  const [section, setSection] = useState<Section>("lobby");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<RealmsConfig>(defaults);
  const [lobby, setLobby] = useState<LobbyDraft>(() => lobbyDraft(game));
  const [baseCfg, setBaseCfg] = useState<RealmsConfig>(defaults);
  const [baseLobby, setBaseLobby] = useState<LobbyDraft>(() => lobbyDraft(game));

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const l = lobbyDraft(game);
    setLobby(l);
    setBaseLobby(l);
    void getRealmsEngineConfigFn({ data: { gameId: def.id } })
      .then((c) => {
        setCfg(c);
        setBaseCfg(c);
      })
      .catch(() => {
        toast.error("Failed loading engine config — showing calibrated defaults");
        const d = realmsDefaultConfig(def.id);
        setCfg(d);
        setBaseCfg(d);
      })
      .finally(() => setLoading(false));
  }, [open, game, def.id]);

  const spawnPercents = useMemo(
    () => weightPercents(cfg.symbols.filter((s) => s.weight > 0 && !s.bomb)),
    [cfg.symbols],
  );
  const bombPercents = useMemo(() => bombTablePercents(cfg.bombTable), [cfg.bombTable]);

  const set = <K extends keyof RealmsConfig>(key: K, value: RealmsConfig[K]) =>
    setCfg((prev) => ({ ...prev, [key]: value }));

  function updateSymbol(id: RealmsSymbolConfig["id"], patch: Partial<RealmsSymbolConfig>) {
    setCfg((prev) => ({
      ...prev,
      symbols: prev.symbols.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  // Unsaved-change tracking (per tab, plus a total for the footer).
  const dirtySections = useMemo(() => {
    const out = new Set<Section>();
    if (!same(lobby, baseLobby)) out.add("lobby");
    for (const [sec, keys] of Object.entries(SECTION_KEYS) as [Section, (keyof RealmsConfig)[]][]) {
      if (keys.some((k) => !same(cfg[k], baseCfg[k]))) out.add(sec);
    }
    return out;
  }, [cfg, baseCfg, lobby, baseLobby]);
  const changeCount = useMemo(() => {
    let n = 0;
    for (const k of Object.keys(lobby) as (keyof LobbyDraft)[]) if (lobby[k] !== baseLobby[k]) n++;
    for (const keys of Object.values(SECTION_KEYS))
      for (const k of keys) if (!same(cfg[k], baseCfg[k])) n++;
    return n;
  }, [cfg, baseCfg, lobby, baseLobby]);

  async function handleSaveAll() {
    setSaving(true);
    try {
      await onPatchLobby({
        tag: lobby.tag.trim() || null,
        rtp: lobby.rtp.trim() || game.rtp,
        volatility: lobby.volatility.trim() || game.volatility,
        minBet: lobby.minBet.trim() || game.minBet,
        maxBet: lobby.maxBet.trim() || game.maxBet,
      });
      const saved = await saveRealmsEngineConfigFn({ data: { gameId: def.id, config: cfg } });
      setCfg(saved);
      setBaseCfg(saved);
      setBaseLobby(lobby);
      toast.success(`${def.name} engine math & lobby settings saved`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  /** Shared props for a numeric field: value, setter and the calibrated default it can snap back to. */
  const num = <K extends keyof RealmsConfig>(key: K) => ({
    value: cfg[key] as number,
    onChange: (v: number) => set(key, v as RealmsConfig[K]),
    calibrated: defaults[key] as number,
  });

  const sectionMeta: Record<Section, { title: string; blurb: string }> = {
    lobby: {
      title: "Lobby",
      blurb: "What players see on the game card, and the bet range the server accepts.",
    },
    dead: {
      title: "Hit rate",
      blurb: "How rounds begin and the most a single round can pay.",
    },
    symbols: {
      title: "Symbols",
      blurb: "How often each symbol lands and what its clusters pay.",
    },
    mult: {
      title: `${def.bomb.name} multipliers`,
      blurb: "How often multiplier orbs appear, their values, and their caps.",
    },
    freespins: {
      title: "Free spins & buy",
      blurb: "The bonus round, Buy Bonus pricing and Ante.",
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,860px)] max-w-5xl flex-col gap-0 overflow-hidden border-amber-500/25 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-0 text-foreground">
        <GuideProvider cfg={cfg} def={def}>
          <DialogHeader className="shrink-0 space-y-0 border-b border-white/10 px-6 pb-0 pt-5 text-left">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                  {def.name}
                  <span className="ml-2 font-normal text-muted-foreground">
                    Engine configuration
                  </span>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Edit the math, bonus and lobby settings of {def.name}.
                </DialogDescription>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    `${FAMILY_NAME} #${def.no}`,
                    `${def.board.cols}×${def.board.rows} board`,
                    `${def.volatility} volatility`,
                    `Min cluster ${cfg.minCluster}`,
                    `Calibrated RTP ${CALIBRATED_RTP}%`,
                  ].map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <GuideLink />
            </div>

            <nav
              className="mt-4 flex gap-1 overflow-x-auto pb-3"
              aria-label="Configuration sections"
            >
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = section === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSection(n.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-medium transition",
                      active
                        ? "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon size={15} aria-hidden />
                    {n.label}
                    {dirtySections.has(n.id) && (
                      <span
                        className="size-1.5 rounded-full bg-amber-400"
                        title="Unsaved changes in this tab"
                        aria-label="Unsaved changes"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </DialogHeader>

          <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-6", NO_SCROLLBAR)}>
            {loading ? (
              <div className="flex h-48 animate-pulse items-center justify-center text-sm font-medium text-amber-400">
                Loading engine configuration…
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                <header>
                  <h2 className="text-xl font-semibold text-white">{sectionMeta[section].title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{sectionMeta[section].blurb}</p>
                </header>

                {section === "lobby" && (
                  <>
                    <Card
                      title="Game card"
                      description="Display text only. None of this changes how the game plays or pays."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <TextField
                          label="Tag / badge"
                          description="Small label on the card, e.g. NEW or HOT."
                          value={lobby.tag}
                          onChange={(tag) => setLobby((l) => ({ ...l, tag }))}
                          guide="lobbyTag"
                        />
                        <TextField
                          label="Volatility"
                          description="How swingy the game feels."
                          value={lobby.volatility}
                          onChange={(volatility) => setLobby((l) => ({ ...l, volatility }))}
                          guide="lobbyVolatility"
                        />
                        <TextField
                          label="RTP (display)"
                          description="Text only. The real return comes from the math tabs."
                          value={lobby.rtp}
                          onChange={(rtp) => setLobby((l) => ({ ...l, rtp }))}
                          guide="lobbyRtp"
                        />
                      </div>
                    </Card>
                    <Card
                      title="Bet range"
                      description="The server checks every wager against this range and refuses bets outside it."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <TextField
                          label="Min bet"
                          description="Smallest accepted bet, e.g. ₱0.20."
                          value={lobby.minBet}
                          onChange={(minBet) => setLobby((l) => ({ ...l, minBet }))}
                          guide="lobbyMinBet"
                        />
                        <TextField
                          label="Max bet"
                          description="Largest accepted bet, e.g. ₱100."
                          value={lobby.maxBet}
                          onChange={(maxBet) => setLobby((l) => ({ ...l, maxBet }))}
                          guide="lobbyMaxBet"
                        />
                      </div>
                    </Card>
                  </>
                )}

                {section === "dead" && (
                  <>
                    <Card
                      title="Round seeding"
                      description="Each round either starts from a plain random board or has a small winning cluster placed first."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <NumField
                          label="Dead spin chance"
                          description="Rounds that start from a plain random board."
                          unit="%"
                          min={0}
                          max={100}
                          guide="deadSpin"
                          {...num("deadSpinChancePercent")}
                        />
                        <NumField
                          label="Seed bias toward Q"
                          description="When a cluster is placed, how often it uses Q."
                          unit="%"
                          min={0}
                          max={100}
                          guide="seedBias"
                          {...num("seedBiasPercent")}
                        />
                        <NumField
                          label="Seed cluster min"
                          description="Smallest placed cluster."
                          unit="symbols"
                          min={3}
                          max={cells}
                          guide="seedClusterMin"
                          {...num("seedClusterMin")}
                        />
                        <NumField
                          label="Seed cluster max"
                          description="Largest placed cluster."
                          unit="symbols"
                          min={3}
                          max={cells}
                          guide="seedClusterMax"
                          {...num("seedClusterMax")}
                        />
                      </div>
                      <Callout>
                        At {cfg.deadSpinChancePercent}%, about{" "}
                        <strong>{Math.round(cfg.deadSpinChancePercent / 10)} of every 10</strong>{" "}
                        rounds start from a plain random board and{" "}
                        <strong>{10 - Math.round(cfg.deadSpinChancePercent / 10)}</strong> start
                        with a placed cluster of {cfg.seedClusterMin}–{cfg.seedClusterMax} symbols.
                        {cfg.seedClusterMin < cfg.minCluster && (
                          <span className="mt-1 block text-orange-300">
                            Seed cluster min is below this game's minimum cluster ({cfg.minCluster}
                            ), so some placed clusters will not pay.
                          </span>
                        )}
                      </Callout>
                    </Card>
                    <Card
                      title="Payout limit"
                      description="A safety ceiling on what one round can pay."
                    >
                      <NumField
                        label="Max win multiplier"
                        description="A round's payout is cut down to bet × this number."
                        unit="× bet"
                        min={0}
                        max={100000}
                        guide="maxWin"
                        {...num("maxWinMult")}
                      />
                      <Callout>
                        At {cfg.maxWinMult}×, a ₱1.00 bet can win at most{" "}
                        <strong>{formatMoney(cfg.maxWinMult)}</strong> and a ₱10.00 bet at most{" "}
                        <strong>{formatMoney(cfg.maxWinMult * 10)}</strong> in one round.
                      </Callout>
                    </Card>
                  </>
                )}

                {section === "symbols" && (
                  <Card
                    title="Weights & pay table"
                    description={`A symbol's spawn share is its weight divided by the total. Pays are multiples of the bet for a cluster of ${cfg.minCluster}+, ${cfg.minCluster + 2}+ and ${cfg.minCluster + 4}+ matching symbols.`}
                    flush
                  >
                    <div className={cn("overflow-x-auto", NO_SCROLLBAR)}>
                      <div className="min-w-[640px]">
                        <div className="grid grid-cols-[minmax(170px,1.6fr)_96px_repeat(3,84px)] items-center gap-3 border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <span>Symbol</span>
                          <span className="flex items-center gap-1.5">
                            Weight <InfoButton topic="symbolWeight" />
                          </span>
                          <span className="col-span-3 flex items-center gap-1.5">
                            Pays ({cfg.minCluster}+ / {cfg.minCluster + 2}+ / {cfg.minCluster + 4}+)
                            <InfoButton topic="symbolPay" />
                          </span>
                        </div>
                        {cfg.symbols.map((sym) => {
                          const pct = sym.bomb
                            ? cfg.bombChanceBasePercent
                            : (spawnPercents[sym.id] ?? 0);
                          return (
                            <div
                              key={sym.id}
                              className="grid grid-cols-[minmax(170px,1.6fr)_96px_repeat(3,84px)] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="size-10 shrink-0">
                                  <SymbolIcon
                                    kind={sym.kind}
                                    src={icons[sym.kind]}
                                    label={sym.label}
                                    showBombBadge={false}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-[13px] font-medium text-white">
                                    {sym.label}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2">
                                    <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                                      <div
                                        className="h-full rounded-full bg-amber-400"
                                        style={{
                                          width: `${Math.min(100, pct * (sym.bomb ? 4 : 3))}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-[11px] tabular-nums text-amber-300">
                                      {pct}%{sym.bomb ? " per cell" : " spawn"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {sym.bomb ? (
                                <span className="text-xs text-muted-foreground">
                                  see Multipliers
                                </span>
                              ) : (
                                <NumberInput
                                  value={sym.weight}
                                  onChange={(weight) => updateSymbol(sym.id, { weight })}
                                  min={0}
                                  max={10000}
                                  aria-label={`${sym.label} weight`}
                                  className="h-9 text-sm"
                                />
                              )}
                              {!sym.scatter && !sym.bomb ? (
                                sym.pay.map((p, i) => (
                                  <NumberInput
                                    key={i}
                                    value={p}
                                    onChange={(v) => {
                                      const pay: [number, number, number] = [...sym.pay];
                                      pay[i] = v;
                                      updateSymbol(sym.id, { pay });
                                    }}
                                    min={0}
                                    max={1000000}
                                    aria-label={`${sym.label} pay for tier ${i + 1}`}
                                    className="h-9 text-sm"
                                  />
                                ))
                              ) : (
                                <span className="col-span-3 text-xs text-muted-foreground">
                                  {sym.scatter
                                    ? "Scatter: starts free spins, no cluster pay"
                                    : "Multiplier orb: no cluster pay"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}

                {section === "mult" && (
                  <>
                    <Card
                      title="Appearance"
                      description="Per-cell chance that a cell is a multiplier orb."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <NumField
                          label="Base game chance"
                          description="Orb chance in the main game."
                          unit="%"
                          min={0}
                          max={100}
                          guide="bombChanceBase"
                          {...num("bombChanceBasePercent")}
                        />
                        <NumField
                          label="Free spins chance"
                          description="Orb chance during free spins."
                          unit="%"
                          min={0}
                          max={100}
                          guide="bombChanceFs"
                          {...num("bombChanceFreeSpinsPercent")}
                        />
                      </div>
                      <Callout>
                        About{" "}
                        <strong>{((cfg.bombChanceBasePercent / 100) * cells).toFixed(1)}</strong>{" "}
                        {def.bomb.name}s on a typical {cells}-cell base-game board.
                      </Callout>
                    </Card>
                    <Card title="Caps" description="The highest multiplier that can ever apply.">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <NumField
                          label="Base multiplier cap"
                          description="Highest multiplier on a base-game win."
                          unit="×"
                          min={0}
                          max={5}
                          guide="bombCapBase"
                          {...num("maxBaseBombSum")}
                        />
                        <NumField
                          label="Free spins multiplier cap"
                          description="Highest collected multiplier on the bonus total."
                          unit="×"
                          min={0}
                          max={5}
                          guide="bombCapFs"
                          {...num("maxFsBombMult")}
                        />
                      </div>
                    </Card>
                    <Card
                      title="Multiplier values"
                      description="Relative weights: a higher weight makes that value more common."
                      guide="bombWeights"
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        {BOMB_MULTS.map((mult) => {
                          const row = cfg.bombTable.find((b) => b.mult === mult) ?? {
                            mult,
                            weight: 0,
                          };
                          const pct = bombPercents[mult] ?? 0;
                          return (
                            <div
                              key={mult}
                              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                            >
                              <span className="w-10 text-lg font-semibold tabular-nums text-yellow-300">
                                {mult}×
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-yellow-400"
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                                  {pct}% of orbs
                                </div>
                              </div>
                              <NumberInput
                                value={row.weight}
                                onChange={(weight) =>
                                  set(
                                    "bombTable",
                                    BOMB_MULTS.map((m) => ({
                                      mult: m,
                                      weight:
                                        m === mult
                                          ? weight
                                          : (cfg.bombTable.find((b) => b.mult === m)?.weight ?? 0),
                                    })),
                                  )
                                }
                                min={0}
                                max={10000}
                                aria-label={`${mult}× weight`}
                                className="h-9 w-24 text-sm"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </>
                )}

                {section === "freespins" && (
                  <>
                    <Card
                      title="Free spins bonus"
                      description="What starts the bonus, how many spins it gives and how it can grow."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <NumField
                          label={`Trigger ${def.scatter.name}`}
                          description="Scatters in one spin that start the bonus."
                          unit="scatters"
                          min={1}
                          max={cells}
                          guide="fsTrigger"
                          {...num("freeSpinsTriggerCount")}
                        />
                        <NumField
                          label="Free spins awarded"
                          description="Spins given by a normal trigger."
                          unit="spins"
                          min={1}
                          max={100}
                          guide="fsAwarded"
                          {...num("freeSpinsBase")}
                        />
                        <NumField
                          label="Retrigger scatters"
                          description="Scatters during the bonus that add spins."
                          unit="scatters"
                          min={1}
                          max={cells}
                          guide="retriggerScatters"
                          {...num("freeSpinsRetriggerCount")}
                        />
                        <NumField
                          label="Retrigger spins"
                          description="Spins added by each retrigger."
                          unit="spins"
                          min={0}
                          max={100}
                          guide="retriggerSpins"
                          {...num("freeSpinsRetrigger")}
                        />
                        <NumField
                          label="Session cap"
                          description="Longest a bonus can run, and the most a player can buy at once."
                          unit="spins"
                          min={0}
                          max={200}
                          guide="sessionCap"
                          {...num("maxFsSessionSpins")}
                        />
                      </div>
                    </Card>

                    <BuyPricing
                      def={def}
                      cfg={cfg}
                      defaults={defaults}
                      onChange={(v) => set("buyFeatureMult", v)}
                    />

                    <Card
                      title="Ante"
                      description="An optional higher-cost bet that makes scatters land more often."
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <NumField
                          label="Ante cost"
                          description="Bet multiplier charged per spin with Ante on."
                          unit="× bet"
                          min={1}
                          max={5}
                          guide="anteCost"
                          {...num("anteBetMult")}
                        />
                        <NumField
                          label="Ante scatter boost"
                          description="How much more often scatters land with Ante on."
                          unit="×"
                          min={1}
                          max={10}
                          guide="anteBoost"
                          {...num("anteScatterWeightMult")}
                        />
                      </div>
                      <Callout>
                        A ₱1.00 bet is charged <strong>{formatMoney(cfg.anteBetMult)}</strong> per
                        spin with Ante on, and scatters land about{" "}
                        <strong>{Math.round((cfg.anteScatterWeightMult - 1) * 100)}%</strong> more
                        often.
                      </Callout>
                    </Card>
                  </>
                )}
              </div>
            )}
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/40 px-6 py-3.5">
            <div
              className="flex min-w-0 flex-1 items-center gap-2 text-[13px]"
              role="status"
              aria-live="polite"
            >
              {changeCount > 0 ? (
                <>
                  <span className="size-2 rounded-full bg-amber-400" aria-hidden />
                  <span className="font-medium text-amber-200">
                    {changeCount} unsaved {changeCount === 1 ? "change" : "changes"}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">All changes saved</span>
              )}
              <span className="hidden truncate text-xs text-muted-foreground lg:inline">
                · Calibrated values return {CALIBRATED_RTP}% RTP; changing pays, weights, prices or
                ante moves it.
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={loading || saving}
                onClick={() => setCfg(realmsDefaultConfig(def.id))}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-white/15 px-3.5 py-2 text-[13px] font-medium text-white/85 transition hover:bg-white/5 disabled:opacity-50"
                title="Load the calibrated defaults into the form (not saved until you press Save)"
              >
                <RotateCcw size={14} aria-hidden />
                Calibrated defaults
              </button>
              <button
                type="button"
                disabled={loading || saving}
                onClick={() => void handleSaveAll()}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-[13px] font-semibold text-amber-950 shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                <Save size={15} aria-hidden />
                {saving ? "Saving…" : "Save config"}
              </button>
            </div>
          </footer>
        </GuideProvider>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────────────────────────────────────────── Buy pricing

/** Position on the calibrated per-spin curve, clamped the same way the server clamps it. */
function curveAt(id: string, quantity: number): number {
  const curve = REALMS_BUY_CURVE[id];
  if (!curve?.length) return 1;
  return curve[Math.min(curve.length, Math.max(1, Math.round(quantity))) - 1]!;
}

/**
 * Buy Bonus pricing editor. The owner types the price of ONE free spin; the stored value (`buyFeatureMult`, the price per spin at the
 * standard award) is derived from it, and every other quantity follows the calibrated curve automatically. The table is a live preview
 * of exactly what the server will charge (same functions).
 */
function BuyPricing({
  def,
  cfg,
  defaults,
  onChange,
}: {
  def: ReturnType<typeof getRealmsGame>;
  cfg: RealmsConfig;
  defaults: RealmsConfig;
  onChange: (buyFeatureMult: number) => void;
}) {
  const [bet, setBet] = useState(1);
  const maxQty = realmsBuyMaxQuantity(cfg);
  // stored value = price(1) × curve(standard) / curve(1)
  const toStored = (priceForOne: number) =>
    +((priceForOne * curveAt(def.id, def.freeSpins)) / curveAt(def.id, 1)).toFixed(6);
  const priceForOne = realmsBuyPricePerSpin(def.id, cfg, 1);
  const calibratedForOne = realmsBuyPricePerSpin(def.id, defaults, 1);
  const minForOne = +((1 * curveAt(def.id, 1)) / curveAt(def.id, def.freeSpins)).toFixed(2);

  const quantities = useMemo(() => {
    const base = Array.from({ length: Math.min(10, maxQty) }, (_, i) => i + 1);
    const extra = [15, 20, 25, 50].filter((q) => q <= maxQty && q > 10);
    return [...base, ...extra];
  }, [maxQty]);

  const scale = defaults.buyFeatureMult > 0 ? cfg.buyFeatureMult / defaults.buyFeatureMult : 1;
  const estRtp = scale > 0 ? CALIBRATED_RTP / scale : CALIBRATED_RTP;
  const rtpTone =
    estRtp > CALIBRATED_RTP + 0.5 ? "high" : estRtp < CALIBRATED_RTP - 0.5 ? "low" : "ok";
  const first = realmsBuyPricePerSpin(def.id, cfg, 1);

  return (
    <Card
      title="Buy Bonus pricing"
      description="Set the price of 1 free spin. Prices for 2, 3, 4… spins are calibrated from it automatically."
      guide="buyPrice"
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <NumField
          label="Price for 1 free spin"
          description="Type the multiple of the bet you want for buying a single spin."
          unit="× bet"
          value={priceForOne}
          calibrated={calibratedForOne}
          min={minForOne}
          max={100000}
          onChange={(v) => onChange(toStored(Math.max(minForOne, v)))}
        />
        <div className="sm:pb-0.5">
          <div className="text-xs text-muted-foreground">At a {formatMoney(bet)} bet</div>
          <div className="text-2xl font-semibold tabular-nums text-amber-300">
            {formatMoney(buyBonusTotal(bet, first, 1))}
          </div>
          <div className="text-[11px] text-muted-foreground">for 1 spin</div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground" id="buy-bet-label">
          Preview with bet
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="buy-bet-label">
          {PREVIEW_BETS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBet(b)}
              aria-pressed={bet === b}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[13px] font-medium tabular-nums transition",
                bet === b
                  ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                  : "border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white",
              )}
            >
              {formatMoney(b)}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("overflow-x-auto rounded-xl border border-white/10", NO_SCROLLBAR)}>
        <table className="w-full min-w-[520px] text-right text-[13px] tabular-nums">
          <thead className="bg-white/[0.04] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left">Spins</th>
              <th className="px-4 py-2.5">Per spin (× bet)</th>
              <th className="px-4 py-2.5">Per spin</th>
              <th className="px-4 py-2.5">Total wallet deduction</th>
            </tr>
          </thead>
          <tbody>
            {quantities.map((q) => {
              const per = realmsBuyPricePerSpin(def.id, cfg, q);
              const vs = first > 0 ? Math.round((per / first - 1) * 100) : 0;
              return (
                <tr
                  key={q}
                  className={cn(
                    "border-t border-white/5",
                    q === def.freeSpins && "bg-amber-400/[0.06]",
                  )}
                >
                  <td className="px-4 py-2 text-left font-medium text-white">
                    {q}
                    {q === def.freeSpins && (
                      <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                        standard award
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {per}×
                    {q > 1 && (
                      <span className="ml-1.5 text-[11px] opacity-70">
                        ({vs >= 0 ? "+" : ""}
                        {vs}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{formatMoney(bet * per)}</td>
                  <td className="px-4 py-2 font-semibold text-white">
                    {formatMoney(buyBonusTotal(bet, per, q))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Total = bet × price per spin × spins, charged once. Players can pick any bet on the game's
        fixed ladder (₱0.20 – ₱100) and 1 – {maxQty} spins; the bets above are examples. Stored as
        “price per spin at the standard {def.freeSpins}-spin award” = {cfg.buyFeatureMult}.
      </p>

      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-3.5 text-[13px] leading-snug",
          rtpTone === "high"
            ? "border-orange-400/40 bg-orange-400/10 text-orange-100"
            : "border-white/10 bg-white/[0.03] text-white/85",
        )}
      >
        {rtpTone === "high" && (
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-orange-300" aria-hidden />
        )}
        <div>
          <div className="font-semibold">
            Estimated return when buying: ≈ {estRtp.toFixed(1)}%{" "}
            <span className="font-normal opacity-70">(calibrated {CALIBRATED_RTP}%)</span>
          </div>
          <div className="mt-0.5 text-xs opacity-80">
            {rtpTone === "high"
              ? "This price is cheaper than the calibrated fair price, so on average players win back more than they pay."
              : rtpTone === "low"
                ? "This price is higher than the calibrated fair price, so players win back less than the calibrated return."
                : "This matches the calibrated fair price."}{" "}
            A rough estimate from the calibrated curve; re-run scripts/realms/calibrate-realms.ts to
            measure.
          </div>
        </div>
      </div>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────── building blocks

function Card({
  title,
  description,
  guide,
  flush,
  children,
}: {
  title: string;
  description?: string;
  guide?: GuideKey;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <h3 className="text-[15px] font-semibold text-white">{title}</h3>
          {description && (
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{description}</p>
          )}
        </div>
        {guide && <InfoButton topic={guide} className="mt-0.5" />}
      </div>
      <div className={cn(flush ? "mt-3" : "space-y-4 px-5 pb-5 pt-4")}>{children}</div>
    </section>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-sky-400/25 bg-sky-400/[0.07] px-4 py-3 text-[13px] leading-relaxed text-white/85">
      {children}
    </div>
  );
}

function FieldLabel({
  id,
  label,
  guide,
  description,
}: {
  id: string;
  label: string;
  guide?: GuideKey;
  description?: string;
}) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-[13px] font-medium text-white">
          {label}
        </label>
        {guide && <InfoButton topic={guide} />}
      </div>
      {description && (
        <p className="mb-1.5 mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
      )}
    </>
  );
}

function TextField({
  label,
  description,
  value,
  onChange,
  guide,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  guide?: GuideKey;
}) {
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} guide={guide} description={description} />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 text-sm"
      />
    </div>
  );
}

/**
 * Number input that keeps what the person is typing (so "4." and an empty box are fine) and only snaps to the allowed range when
 * they leave the field. Reports every valid number as they type.
 */
function NumberInput({
  value,
  onChange,
  min,
  max,
  unit,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);
  const clamp = (n: number) =>
    Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, n));
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        min={min}
        max={max}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const n = Number(raw);
          if (raw.trim() !== "" && Number.isFinite(n)) onChange(n);
        }}
        onBlur={() => {
          focused.current = false;
          const n = Number(text);
          const next = text.trim() === "" || !Number.isFinite(n) ? clamp(value) : clamp(n);
          setText(String(next));
          if (next !== value) onChange(next);
        }}
        className={cn(
          "h-10 text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          unit && "pr-16",
          className,
        )}
      />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          {unit}
        </span>
      )}
    </div>
  );
}

function NumField({
  label,
  description,
  value,
  onChange,
  calibrated,
  unit,
  min,
  max,
  guide,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  /** The measured default; shown as a chip that snaps the field back to it. */
  calibrated?: number;
  unit?: string;
  min?: number;
  max?: number;
  guide?: GuideKey;
}) {
  const id = useId();
  const isCalibrated = calibrated !== undefined && same(value, calibrated);
  return (
    <div>
      <FieldLabel id={id} label={label} guide={guide} description={description} />
      <NumberInput id={id} value={value} onChange={onChange} min={min} max={max} unit={unit} />
      <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {min !== undefined && max !== undefined && max < 1_000_000 && (
          <span>
            Range {min}–{max}
          </span>
        )}
        {calibrated !== undefined &&
          (isCalibrated ? (
            <span className="text-emerald-400">✓ Calibrated</span>
          ) : (
            <button
              type="button"
              onClick={() => onChange(calibrated)}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-400/10"
              title="Set back to the calibrated value"
            >
              <RotateCcw size={10} aria-hidden /> Calibrated {calibrated}
            </button>
          ))}
      </div>
    </div>
  );
}
