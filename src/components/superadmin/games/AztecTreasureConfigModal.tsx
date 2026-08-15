import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Crown,
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
  DEFAULT_AZTEC_TREASURE_CONFIG,
  normalizeAztecTreasureConfig,
  weightPercents,
  type AztecTreasureConfig,
  type AztecTreasureSymbolConfig,
} from "@/lib/aztec-treasure-config";
import {
  getAztecTreasureEngineConfigFn,
  saveAztecTreasureEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { AztecTreasureIcon } from "@/components/maxhigh/aztec-treasure/AztecTreasureIcon";
import type { AztecTreasureSymKind } from "@/lib/aztec-treasure-config";
import { cn } from "@/lib/utils";
import { LobbyVisibilityToggles } from "@/components/superadmin/games/LobbyVisibilityToggles";

type Section = "lobby" | "dead" | "symbols" | "mult" | "freespins";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "dead", label: "Dead spin", icon: Dices },
  { id: "symbols", label: "Symbols", icon: LayoutGrid },
  { id: "mult", label: "Wilds/Bombs", icon: Sparkles },
  { id: "freespins", label: "Free spins", icon: Crown },
];

type Props = {
  game: SuperGameRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatchLobby: (
    data: Partial<SuperGameRow> & { enabled?: boolean; featured?: boolean },
  ) => Promise<void>;
};

export function AztecTreasureConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<AztecTreasureConfig>(() =>
    structuredClone(DEFAULT_AZTEC_TREASURE_CONFIG),
  );

  const [tag, setTag] = useState(game.tag ?? "");
  const [rtp, setRtp] = useState(game.rtp ?? "");
  const [volatility, setVolatility] = useState(game.volatility ?? "High");
  const [minBet, setMinBet] = useState(game.minBet ?? "");
  const [maxBet, setMaxBet] = useState(game.maxBet ?? "");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTag(game.tag ?? "");
    setRtp(game.rtp ?? "");
    setVolatility(game.volatility ?? "High");
    setMinBet(game.minBet ?? "");
    setMaxBet(game.maxBet ?? "");

    void getAztecTreasureEngineConfigFn()
      .then((res) => {
        setCfg(normalizeAztecTreasureConfig(res));
      })
      .catch(() => {
        toast.error("Failed loading engine config — using defaults");
        setCfg(structuredClone(DEFAULT_AZTEC_TREASURE_CONFIG));
      })
      .finally(() => setLoading(false));
  }, [open, game]);

  const cellWeightsForDisplay = useMemo(() => {
    const list = cfg.symbols
      .filter((s) => s.weight > 0 && !s.bomb)
      .map((s) => ({ id: s.id, weight: s.weight }));
    return weightPercents(list);
  }, [cfg.symbols]);

  const bombPercents = useMemo(
    () => bombTablePercents(cfg.bombTable),
    [cfg.bombTable],
  );

  async function handleSaveAll() {
    setSaving(true);
    try {
      await onPatchLobby({
        tag: tag.trim() || undefined,
        rtp: String(Number(rtp) || game.rtp || ""),
        volatility: (volatility.trim() || game.volatility || "High") as SuperGameRow["volatility"],
        minBet: String(Number(minBet) || game.minBet || ""),
        maxBet: String(Number(maxBet) || game.maxBet || ""),
      });

      const normalized = await saveAztecTreasureEngineConfigFn({
        data: { config: cfg },
      });
      setCfg(normalizeAztecTreasureConfig(normalized));
      toast.success("Aztec Treasure engine math & lobby settings saved");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateSymbol(id: string, patch: Partial<AztecTreasureSymbolConfig>) {
    setCfg((prev) => ({
      ...prev,
      symbols: prev.symbols.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-amber-500/30 bg-gradient-to-b from-neutral-900 via-black to-neutral-950 text-foreground">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-amber-500/20 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-black uppercase text-amber-300 tracking-wider">
                Aztec Treasure Engine Configuration
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure live RNG parameters, symbol weights, wild/bomb multipliers, and free spins.
              </DialogDescription>
            </div>

            <button
              type="button"
              disabled={loading || saving}
              onClick={() => void handleSaveAll()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-black uppercase text-amber-950 shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 transition"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Config"}
            </button>
          </div>

          <div className="mt-4 flex gap-2 border-t border-amber-500/10 pt-3">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = section === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSection(n.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                    active
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
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
            <div className="flex h-48 items-center justify-center text-amber-400 font-bold animate-pulse">
              Loading engine configuration...
            </div>
          ) : (
            <>
              {section === "lobby" && (
                <div className="space-y-4 max-w-md">
                  <h4 className="text-sm font-bold text-amber-300">Lobby Settings</h4>
                  <LobbyVisibilityToggles game={game} onPatch={onPatchLobby} />
                  <div className="grid gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Tag / Badge</label>
                      <Input value={tag} onChange={(e) => setTag(e.target.value)} className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">RTP %</label>
                        <Input
                          type="number"
                          value={rtp}
                          onChange={(e) => setRtp(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Volatility</label>
                        <Input
                          value={volatility}
                          onChange={(e) => setVolatility(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Min Bet (₱)</label>
                        <Input
                          type="number"
                          value={minBet}
                          onChange={(e) => setMinBet(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Max Bet (₱)</label>
                        <Input
                          type="number"
                          value={maxBet}
                          onChange={(e) => setMaxBet(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {section === "dead" && (
                <div className="space-y-4 max-w-md">
                  <h4 className="text-sm font-bold text-amber-300">Dead Spin & Seeding Parameters</h4>
                  <div className="grid gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground font-bold">
                        Dead Spin Chance: {cfg.deadSpinChancePercent}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={cfg.deadSpinChancePercent}
                        onChange={(e) =>
                          setCfg((p) => ({ ...p, deadSpinChancePercent: Number(e.target.value) }))
                        }
                        className="w-full mt-2"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Chance that an initial board contains NO winning cluster.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground font-bold">
                        Seed Q (Melon) Bias: {cfg.seedMelonBiasPercent}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={cfg.seedMelonBiasPercent}
                        onChange={(e) =>
                          setCfg((p) => ({ ...p, seedMelonBiasPercent: Number(e.target.value) }))
                        }
                        className="w-full mt-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {section === "symbols" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-amber-300">Symbol Weights & Pay Tables</h4>
                  <div className="grid gap-3">
                    {cfg.symbols.map((sym) => {
                      const spawnPct = cellWeightsForDisplay[sym.id] ?? 0;
                      return (
                        <div
                          key={sym.id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                        >
                          <div className="flex items-center gap-3 min-w-[140px]">
                            <AztecTreasureIcon kind={sym.kind as AztecTreasureSymKind} className="size-8 object-contain" />
                            <div>
                              <div className="text-xs font-bold text-white">{sym.label}</div>
                              <div className="text-[10px] text-amber-400">{spawnPct}% spawn</div>
                            </div>
                          </div>

                          {!sym.bomb && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Weight:</span>
                              <Input
                                type="number"
                                value={sym.weight}
                                onChange={(e) =>
                                  updateSymbol(sym.id, { weight: Number(e.target.value) })
                                }
                                className="w-20 h-8 text-xs"
                              />
                            </div>
                          )}

                          {!sym.scatter && !sym.bomb && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Pay (8-9 / 10-11 / 12+):</span>
                              <Input
                                type="number"
                                value={sym.pay[0]}
                                onChange={(e) =>
                                  updateSymbol(sym.id, {
                                    pay: [Number(e.target.value), sym.pay[1], sym.pay[2]],
                                  })
                                }
                                className="w-16 h-8 text-xs"
                              />
                              <Input
                                type="number"
                                value={sym.pay[1]}
                                onChange={(e) =>
                                  updateSymbol(sym.id, {
                                    pay: [sym.pay[0], Number(e.target.value), sym.pay[2]],
                                  })
                                }
                                className="w-16 h-8 text-xs"
                              />
                              <Input
                                type="number"
                                value={sym.pay[2]}
                                onChange={(e) =>
                                  updateSymbol(sym.id, {
                                    pay: [sym.pay[0], sym.pay[1], Number(e.target.value)],
                                  })
                                }
                                className="w-16 h-8 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {section === "mult" && (
                <div className="space-y-6 max-w-lg">
                  <h4 className="text-sm font-bold text-amber-300">Wild / Bomb Probabilities</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground font-bold">
                        Base Game Chance: {cfg.bombChanceBasePercent}%
                      </label>
                      <Input
                        type="number"
                        value={cfg.bombChanceBasePercent}
                        onChange={(e) =>
                          setCfg((p) => ({ ...p, bombChanceBasePercent: Number(e.target.value) }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-bold">
                        Free Spins Chance: {cfg.bombChanceFreeSpinsPercent}%
                      </label>
                      <Input
                        type="number"
                        value={cfg.bombChanceFreeSpinsPercent}
                        onChange={(e) =>
                          setCfg((p) => ({
                            ...p,
                            bombChanceFreeSpinsPercent: Number(e.target.value),
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-white">Multiplier Weights</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {cfg.bombTable.map((b, idx) => (
                        <div
                          key={b.mult}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5"
                        >
                          <span className="text-xs font-bold text-yellow-300">{b.mult}x</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {bombPercents[b.mult]}%
                            </span>
                            <Input
                              type="number"
                              value={b.weight}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setCfg((p) => ({
                                  ...p,
                                  bombTable: p.bombTable.map((row, i) =>
                                    i === idx ? { ...row, weight: val } : row,
                                  ),
                                }));
                              }}
                              className="w-16 h-7 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {section === "freespins" && (
                <div className="space-y-4 max-w-md">
                  <h4 className="text-sm font-bold text-amber-300">Free Spins & Feature Buy</h4>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Trigger Scatters</label>
                        <Input
                          type="number"
                          value={cfg.freeSpinsTriggerCount}
                          onChange={(e) =>
                            setCfg((p) => ({ ...p, freeSpinsTriggerCount: Number(e.target.value) }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Base Free Spins</label>
                        <Input
                          type="number"
                          value={cfg.freeSpinsBase}
                          onChange={(e) =>
                            setCfg((p) => ({ ...p, freeSpinsBase: Number(e.target.value) }))
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Retrigger Scatters</label>
                        <Input
                          type="number"
                          value={cfg.freeSpinsRetriggerCount}
                          onChange={(e) =>
                            setCfg((p) => ({
                              ...p,
                              freeSpinsRetriggerCount: Number(e.target.value),
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Retrigger Spins</label>
                        <Input
                          type="number"
                          value={cfg.freeSpinsRetrigger}
                          onChange={(e) =>
                            setCfg((p) => ({ ...p, freeSpinsRetrigger: Number(e.target.value) }))
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Buy Feature Cost (x bet)</label>
                        <Input
                          type="number"
                          value={cfg.buyFeatureMult}
                          onChange={(e) =>
                            setCfg((p) => ({ ...p, buyFeatureMult: Number(e.target.value) }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Super Buy Cost (x bet)</label>
                        <Input
                          type="number"
                          value={cfg.superBuyFeatureMult}
                          onChange={(e) =>
                            setCfg((p) => ({ ...p, superBuyFeatureMult: Number(e.target.value) }))
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
