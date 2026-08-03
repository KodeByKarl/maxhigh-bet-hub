/**
 * Superadmin Fortune Gems engine editor — lobby + math config.
 * Persists to game_controls.engineConfig; live spins read the same JSON.
 */
import { useEffect, useState } from "react";
import { Coins, Gem, LayoutGrid, Save, Settings2, Store, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_FORTUNE_GEMS_CONFIG,
  normalizeFortuneGemsConfig,
  type FortuneGemsConfig,
  type FgRtpProfileId,
  type FgSymKind,
} from "@/lib/fortune-gems-config";
import {
  getFortuneGemsEngineConfigFn,
  saveFortuneGemsEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { ICON_SRC } from "@/components/maxhigh/fortune-gems/animationConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "lobby" | "symbols" | "mult" | "rtp" | "risk";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "symbols", label: "Symbols", icon: LayoutGrid },
  { id: "mult", label: "Mult Reel", icon: Gem },
  { id: "rtp", label: "RTP / Weights", icon: Settings2 },
  { id: "risk", label: "Risk / Cap", icon: Coins },
];

const RTP_OPTIONS: { id: FgRtpProfileId; label: string }[] = [
  { id: "rtp_97", label: "97%*" },
  { id: "rtp_96_65", label: "96.65%*" },
  { id: "rtp_95_22", label: "95.22%*" },
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

function SymThumb({ kind, name }: { kind: FgSymKind; name: string }) {
  return (
    <img
      src={`${ICON_SRC[kind]}?v=gem5`}
      alt={name}
      className="size-10 rounded-md object-contain bg-black/40"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

export function FortuneGemsConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<FortuneGemsConfig>(() =>
    structuredClone(DEFAULT_FORTUNE_GEMS_CONFIG),
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState(game.tag ?? "");
  const [lobbyRtp, setLobbyRtp] = useState(Number(game.rtp) || 97);
  const [volatility, setVolatility] = useState(game.volatility ?? "Medium");
  const [lobbyMinBet, setLobbyMinBet] = useState(Number(game.minBet) || 0.1);
  const [lobbyMaxBet, setLobbyMaxBet] = useState(Number(game.maxBet) || 100);
  const [lobbyBusy, setLobbyBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setTag(game.tag ?? "");
    setLobbyRtp(Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || 97);
    setVolatility(game.volatility ?? "Medium");
    setLobbyMinBet(Number(String(game.minBet ?? "").replace(/[^\d.]/g, "")) || 0.1);
    setLobbyMaxBet(Number(String(game.maxBet ?? "").replace(/[^\d.]/g, "")) || 100);
    setLoading(true);
    void getFortuneGemsEngineConfigFn()
      .then((c) => setCfg(normalizeFortuneGemsConfig(c)))
      .catch(() => {
        toast.error("Failed loading config — defaults");
        setCfg(structuredClone(DEFAULT_FORTUNE_GEMS_CONFIG));
      })
      .finally(() => setLoading(false));
  }, [open, game]);

  function patch(p: Partial<FortuneGemsConfig>) {
    setCfg((c) => {
      const next = normalizeFortuneGemsConfig({ ...c, ...p });
      if (p.activeRtpProfile) {
        const profile = next.rtpProfiles.find((r) => r.id === p.activeRtpProfile);
        if (profile) next.targetRtp = profile.targetRtp;
      }
      return next;
    });
  }

  async function saveEngine() {
    setSaving(true);
    try {
      const next = await saveFortuneGemsEngineConfigFn({
        data: { config: normalizeFortuneGemsConfig(cfg) },
      });
      setCfg(normalizeFortuneGemsConfig(next));
      // Keep lobby metadata in sync with engine bet / RTP
      await onPatchLobby({
        rtp: `${next.targetRtp}%`,
        minBet: `₱${next.minBet.toFixed(2)}`,
        maxBet: `₱${next.maxBet.toFixed(2)}`,
      });
      setLobbyRtp(next.targetRtp);
      setLobbyMinBet(next.minBet);
      setLobbyMaxBet(next.maxBet);
      toast.success("Fortune Gems engine saved");
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
      // Mirror lobby bet bounds into engine config
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
      <DialogContent className="flex max-h-[92vh] w-[min(100%-1rem,48rem)] flex-col gap-0 overflow-hidden border-amber-500/20 bg-panel p-0">
        <div className="relative h-28 shrink-0 overflow-hidden">
          <img src={game.thumb} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16120F] to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-foreground">
                <Gem size={18} className="text-amber-400" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Full engine · 3×3 · 5 lines · Mult reel + EX — {game.gameId}
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
                Pay × bet-per-line for 3 matching on a payline. Config-pending with design.
              </p>
              <div className="space-y-2">
                {cfg.symbols.map((sym) => (
                  <div
                    key={sym.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_120px] items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2 text-[11px]"
                  >
                    <SymThumb kind={sym.kind} name={sym.name} />
                    <div className="min-w-0">
                      <div className="truncate font-bold text-foreground">{sym.name}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {sym.tier}
                        {sym.wild ? " · wild" : ""}
                      </div>
                    </div>
                    <label className="space-y-0.5 text-[10px] text-muted-foreground">
                      Pay × bpl
                      <Num
                        value={sym.pay}
                        onChange={(n) => {
                          const symbols = cfg.symbols.map((s) =>
                            s.id === sym.id ? { ...s, pay: n } : s,
                          );
                          patch({ symbols });
                        }}
                        step={1}
                        min={0}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Paylines (row index per reel · 0=top)
                </p>
                {cfg.paylines.map((line, li) => (
                  <div key={li} className="flex items-center gap-2">
                    <span className="w-8 text-xs text-muted-foreground">L{li + 1}</span>
                    {line.map((row, ri) => (
                      <Num
                        key={ri}
                        value={row}
                        min={0}
                        max={2}
                        onChange={(n) => {
                          const paylines = cfg.paylines.map((p, j) =>
                            j === li ? p.map((r, k) => (k === ri ? n : r)) : [...p],
                          );
                          patch({ paylines });
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : section === "mult" ? (
            <div className="grid gap-6 md:grid-cols-2">
              {(["multiplierStripBase", "multiplierStripEx"] as const).map((key) => (
                <div key={key} className="space-y-2">
                  <p className="text-sm font-semibold">
                    {key === "multiplierStripBase" ? "Base strip weights" : "EX strip weights"}
                  </p>
                  {key === "multiplierStripEx" && (
                    <p className="text-[10px] text-amber-300/80">
                      Working default: 1× weight = 0. Separate profile — not a runtime modifier.
                    </p>
                  )}
                  {cfg.multiplierValues.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-xs">
                      <span className="w-10 font-mono font-bold">{v}×</span>
                      <Num
                        value={cfg[key].weights[String(v)] ?? 0}
                        onChange={(n) => {
                          patch({
                            [key]: {
                              weights: {
                                ...cfg[key].weights,
                                [String(v)]: n,
                              },
                            },
                          });
                        }}
                        min={0}
                      />
                    </label>
                  ))}
                </div>
              ))}
              <label className="md:col-span-2 space-y-1 text-xs font-semibold text-muted-foreground">
                EX bet multiplier (1.5 = +50%)
                <Num
                  value={cfg.exBetMult}
                  onChange={(n) => patch({ exBetMult: n })}
                  step={0.05}
                  min={1}
                  max={5}
                />
              </label>
            </div>
          ) : section === "rtp" ? (
            <>
              <p className="text-[11px] text-amber-300/80">
                Placeholder profiles for conflicting published RTP figures — confirm before launch.
              </p>
              <div className="flex flex-wrap gap-2">
                {RTP_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => patch({ activeRtpProfile: o.id })}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold",
                      cfg.activeRtpProfile === o.id
                        ? "bg-amber-500 text-black"
                        : "bg-white/[0.06] text-muted-foreground",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-sm">
                Active target: <strong>{cfg.targetRtp}%</strong>
              </p>
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-muted-foreground">
                      <th className="p-2">Symbol</th>
                      <th className="p-2">R1</th>
                      <th className="p-2">R2</th>
                      <th className="p-2">R3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cfg.symbols.map((s) => {
                      const w =
                        cfg.rtpProfiles.find((p) => p.id === cfg.activeRtpProfile)?.reelWeights[
                          s.kind
                        ] ?? s.reelWeights;
                      return (
                        <tr key={s.kind} className="border-b border-white/5">
                          <td className="p-2 font-medium">{s.name}</td>
                          {[0, 1, 2].map((ri) => (
                            <td key={ri} className="p-2">
                              <Num
                                value={w[ri] ?? 0}
                                onChange={(n) => {
                                  const rtpProfiles = cfg.rtpProfiles.map((p) => {
                                    if (p.id !== cfg.activeRtpProfile) return p;
                                    const reelWeights = { ...p.reelWeights };
                                    const arr = [...(reelWeights[s.kind] ?? [0, 0, 0])];
                                    arr[ri] = n;
                                    reelWeights[s.kind] = arr;
                                    return { ...p, reelWeights };
                                  });
                                  patch({ rtpProfiles });
                                }}
                                min={0}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-[11px] text-amber-300/80">
                Max win 375× is single-sourced / unconfirmed. Engine min/max bet gate spins.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Max win × stake (0 = off)
                  <Num value={cfg.maxWinMult} onChange={(n) => patch({ maxWinMult: n })} min={0} />
                </label>
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
                    step={1}
                    min={0.01}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {section !== "lobby" && (
          <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
            <button
              type="button"
              className="rounded-lg border border-white/15 px-3 py-2 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </button>
            <button
              type="button"
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
              onClick={() => void saveEngine()}
            >
              <Save className="size-4" /> {saving ? "Saving…" : "Save engine"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
