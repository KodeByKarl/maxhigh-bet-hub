import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Crown, Dices, LayoutGrid, RotateCcw, Save, Sparkles, Store } from "lucide-react";
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
import { FAMILY_NAME, getRealmsGame, realmsDefaultConfig } from "@/lib/realms";
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

type Section = "lobby" | "dead" | "symbols" | "mult" | "freespins";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "dead", label: "Hit rate", icon: Dices },
  { id: "symbols", label: "Symbols", icon: LayoutGrid },
  { id: "mult", label: "Multipliers", icon: Sparkles },
  { id: "freespins", label: "Free spins & buy", icon: Crown },
];

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
  const [section, setSection] = useState<Section>("lobby");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<RealmsConfig>(defaults);
  const [lobby, setLobby] = useState<LobbyDraft>(() => lobbyDraft(game));

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setLobby(lobbyDraft(game));
    void getRealmsEngineConfigFn({ data: { gameId: def.id } })
      .then(setCfg)
      .catch(() => {
        toast.error("Failed loading engine config — showing calibrated defaults");
        setCfg(realmsDefaultConfig(def.id));
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
      toast.success(`${def.name} engine math & lobby settings saved`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden border-amber-500/30 bg-gradient-to-b from-neutral-900 via-black to-neutral-950 p-0 text-foreground">
        <DialogHeader className="shrink-0 border-b border-amber-500/20 px-6 pb-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-wider text-amber-300">
                {def.name} Engine Configuration
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {FAMILY_NAME} #{def.no} · {def.board.cols}×{def.board.rows} board · {def.volatility}{" "}
                volatility · min cluster {cfg.minCluster}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading || saving}
                onClick={() => setCfg(realmsDefaultConfig(def.id))}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/5 disabled:opacity-50"
                title="Load the calibrated defaults (not saved until you press Save)"
              >
                <RotateCcw size={14} />
                Calibrated defaults
              </button>
              <button
                type="button"
                disabled={loading || saving}
                onClick={() => void handleSaveAll()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-black uppercase text-amber-950 shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Config"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 border-t border-amber-500/10 pt-3">
            {NAV.map((n) => {
              const Icon = n.icon;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSection(n.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                    section === n.id
                      ? "border border-amber-400/40 bg-amber-400/20 text-amber-300"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon size={14} />
                  {n.label}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-48 animate-pulse items-center justify-center font-bold text-amber-400">
              Loading engine configuration...
            </div>
          ) : (
            <>
              {section === "lobby" && (
                <Panel title="Lobby Settings">
                  <TextField
                    label="Tag / Badge"
                    value={lobby.tag}
                    onChange={(tag) => setLobby((l) => ({ ...l, tag }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="RTP (display)"
                      value={lobby.rtp}
                      onChange={(rtp) => setLobby((l) => ({ ...l, rtp }))}
                    />
                    <TextField
                      label="Volatility"
                      value={lobby.volatility}
                      onChange={(volatility) => setLobby((l) => ({ ...l, volatility }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Min Bet"
                      value={lobby.minBet}
                      onChange={(minBet) => setLobby((l) => ({ ...l, minBet }))}
                    />
                    <TextField
                      label="Max Bet"
                      value={lobby.maxBet}
                      onChange={(maxBet) => setLobby((l) => ({ ...l, maxBet }))}
                    />
                  </div>
                </Panel>
              )}

              {section === "dead" && (
                <Panel title="Hit Rate & Seeding">
                  <NumField
                    label={`Dead spin chance (%) — calibrated ${defaults.deadSpinChancePercent}`}
                    value={cfg.deadSpinChancePercent}
                    onChange={(v) => set("deadSpinChancePercent", v)}
                    hint="Chance the opening board is not seeded with a winning cluster."
                  />
                  <NumField
                    label="Seed bias toward Q (%)"
                    value={cfg.seedBiasPercent}
                    onChange={(v) => set("seedBiasPercent", v)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <NumField
                      label="Seed cluster min"
                      value={cfg.seedClusterMin}
                      onChange={(v) => set("seedClusterMin", v)}
                    />
                    <NumField
                      label="Seed cluster max"
                      value={cfg.seedClusterMax}
                      onChange={(v) => set("seedClusterMax", v)}
                    />
                  </div>
                  <NumField
                    label="Max win multiplier (× bet)"
                    value={cfg.maxWinMult}
                    onChange={(v) => set("maxWinMult", v)}
                    hint="Round payout is clamped to bet × this value."
                  />
                </Panel>
              )}

              {section === "symbols" && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-amber-300">Symbol Weights & Pay Tables</h4>
                  {cfg.symbols.map((sym) => (
                    <div
                      key={sym.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                    >
                      <div className="flex min-w-[160px] items-center gap-3">
                        <div className="size-9">
                          <SymbolIcon
                            kind={sym.kind}
                            src={icons[sym.kind]}
                            label={sym.label}
                            showBombBadge={false}
                          />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{sym.label}</div>
                          <div className="text-[10px] text-amber-400">
                            {sym.bomb
                              ? `${cfg.bombChanceBasePercent}% per cell`
                              : `${spawnPercents[sym.id] ?? 0}% spawn`}
                          </div>
                        </div>
                      </div>
                      {!sym.bomb && (
                        <InlineNum
                          label="Weight"
                          value={sym.weight}
                          onChange={(weight) => updateSymbol(sym.id, { weight })}
                        />
                      )}
                      {!sym.scatter && !sym.bomb && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Pay {cfg.minCluster}+ / {cfg.minCluster + 2}+ / {cfg.minCluster + 4}+
                          </span>
                          {sym.pay.map((p, i) => (
                            <Input
                              key={i}
                              type="number"
                              value={p}
                              onChange={(e) => {
                                const pay: [number, number, number] = [...sym.pay];
                                pay[i] = Number(e.target.value);
                                updateSymbol(sym.id, { pay });
                              }}
                              className="h-8 w-16 text-xs"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {section === "mult" && (
                <Panel title={`${def.bomb.name} Multipliers`}>
                  <div className="grid grid-cols-2 gap-3">
                    <NumField
                      label="Base game chance (%)"
                      value={cfg.bombChanceBasePercent}
                      onChange={(v) => set("bombChanceBasePercent", v)}
                    />
                    <NumField
                      label="Free spins chance (%)"
                      value={cfg.bombChanceFreeSpinsPercent}
                      onChange={(v) => set("bombChanceFreeSpinsPercent", v)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumField
                      label="Base multiplier cap"
                      value={cfg.maxBaseBombSum}
                      onChange={(v) => set("maxBaseBombSum", v)}
                    />
                    <NumField
                      label="Free spins multiplier cap"
                      value={cfg.maxFsBombMult}
                      onChange={(v) => set("maxFsBombMult", v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-white">
                      Multiplier weights (2× / 3× / 4× / 5×)
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      {BOMB_MULTS.map((mult) => {
                        const row = cfg.bombTable.find((b) => b.mult === mult) ?? {
                          mult,
                          weight: 0,
                        };
                        return (
                          <div
                            key={mult}
                            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5"
                          >
                            <span className="text-xs font-bold text-yellow-300">{mult}×</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                {bombPercents[mult] ?? 0}%
                              </span>
                              <Input
                                type="number"
                                value={row.weight}
                                onChange={(e) => {
                                  const weight = Number(e.target.value);
                                  set(
                                    "bombTable",
                                    BOMB_MULTS.map((m) => ({
                                      mult: m,
                                      weight:
                                        m === mult
                                          ? weight
                                          : (cfg.bombTable.find((b) => b.mult === m)?.weight ?? 0),
                                    })),
                                  );
                                }}
                                className="h-7 w-16 text-xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Panel>
              )}

              {section === "freespins" && (
                <Panel title="Free Spins, Buy & Ante">
                  <div className="grid grid-cols-2 gap-3">
                    <NumField
                      label={`Trigger ${def.scatter.name}`}
                      value={cfg.freeSpinsTriggerCount}
                      onChange={(v) => set("freeSpinsTriggerCount", v)}
                    />
                    <NumField
                      label="Free spins awarded"
                      value={cfg.freeSpinsBase}
                      onChange={(v) => set("freeSpinsBase", v)}
                    />
                    <NumField
                      label="Retrigger scatters"
                      value={cfg.freeSpinsRetriggerCount}
                      onChange={(v) => set("freeSpinsRetriggerCount", v)}
                    />
                    <NumField
                      label="Retrigger spins"
                      value={cfg.freeSpinsRetrigger}
                      onChange={(v) => set("freeSpinsRetrigger", v)}
                    />
                    <NumField
                      label="Session cap (spins)"
                      value={cfg.maxFsSessionSpins}
                      onChange={(v) => set("maxFsSessionSpins", v)}
                      hint="Hard stop on free spins + retriggers in one feature; also the most spins one Buy can purchase."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
                    <NumField
                      label={`Buy price per spin at the standard award (other quantities follow the calibrated curve) — calibrated ${defaults.buyFeatureMult}`}
                      value={cfg.buyFeatureMult}
                      onChange={(v) => set("buyFeatureMult", v)}
                    />
                    <NumField
                      label="Ante cost (× bet)"
                      value={cfg.anteBetMult}
                      onChange={(v) => set("anteBetMult", v)}
                    />
                    <NumField
                      label={`Ante scatter boost — calibrated ${defaults.anteScatterWeightMult}`}
                      value={cfg.anteScatterWeightMult}
                      onChange={(v) => set("anteScatterWeightMult", v)}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Calibrated values return 96% RTP. Changing pays, weights, prices or the ante
                    boost moves RTP — re-run scripts/realms/calibrate-realms.ts after deliberate
                    math changes.
                  </p>
                </Panel>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="max-w-xl space-y-4">
      <h4 className="text-sm font-bold text-amber-300">{title}</h4>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1"
      />
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function InlineNum({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-20 text-xs"
      />
    </div>
  );
}
