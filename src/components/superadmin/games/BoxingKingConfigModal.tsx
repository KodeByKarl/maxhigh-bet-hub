import { useEffect, useMemo, useState } from "react";
import {
  Coins,
  Flame,
  LayoutGrid,
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
  DEFAULT_BOXING_KING_CONFIG,
  effectiveReelWeights,
  normalizeBoxingKingConfig,
  weightPercents,
  type BoxingKingConfig,
  type FsRtpProfileId,
  type BkSymKind,
} from "@/lib/boxing-king-config";
import {
  getBoxingKingEngineConfigFn,
  saveBoxingKingEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { ICON_SRC } from "@/components/maxhigh/boxing-king/animationConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "lobby" | "symbols" | "mix" | "rtp" | "risk";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "symbols", label: "Symbols", icon: LayoutGrid },
  { id: "mix", label: "Mix / Jackpot", icon: Flame },
  { id: "rtp", label: "RTP / Weights", icon: Settings2 },
  { id: "risk", label: "Risk / Cap", icon: Coins },
];

const RTP_OPTIONS: { id: FsRtpProfileId; label: string }[] = [
  { id: "rtp_96_5", label: "96.5%" },
  { id: "rtp_95_5", label: "95.5%" },
  { id: "rtp_94_5", label: "94.5%" },
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

function SymThumb({ kind, name }: { kind: BkSymKind; name: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-orange-500/30 bg-black/50">
      {!broken ? (
        <img
          src={ICON_SRC[kind]}
          alt={name}
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="px-1 text-center text-[8px] font-black uppercase text-orange-300">
          {kind}
        </span>
      )}
    </div>
  );
}

export function BoxingKingConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<BoxingKingConfig>(() =>
    structuredClone(DEFAULT_BOXING_KING_CONFIG),
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lobby display fields (game_controls overlay)
  const [tag, setTag] = useState(game.tag ?? "");
  const [lobbyRtp, setLobbyRtp] = useState(Number(game.rtp) || 96.5);
  const [volatility, setVolatility] = useState(game.volatility ?? "High");
  const [lobbyMinBet, setLobbyMinBet] = useState(Number(game.minBet) || 0.1);
  const [lobbyMaxBet, setLobbyMaxBet] = useState(Number(game.maxBet) || 50);
  const [lobbyBusy, setLobbyBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setTag(game.tag ?? "");
    setLobbyRtp(Number(game.rtp) || 96.5);
    setVolatility(game.volatility ?? "High");
    setLobbyMinBet(Number(game.minBet) || 0.1);
    setLobbyMaxBet(Number(game.maxBet) || 50);
    setLoading(true);
    void getBoxingKingEngineConfigFn()
      .then((c) => setCfg(normalizeBoxingKingConfig(c)))
      .catch(() => {
        toast.error("Failed loading config — defaults");
        setCfg(structuredClone(DEFAULT_BOXING_KING_CONFIG));
      })
      .finally(() => setLoading(false));
  }, [open, game]);

  const activeWeights = useMemo(() => effectiveReelWeights(cfg), [cfg]);
  const weightPct = useMemo(() => weightPercents(activeWeights, 0), [activeWeights]);

  function patch(p: Partial<BoxingKingConfig>) {
    setCfg((c) => {
      const next = normalizeBoxingKingConfig({ ...c, ...p });
      if (p.activeRtpProfile) {
        const profile = next.rtpProfiles.find((r) => r.id === p.activeRtpProfile);
        if (profile) next.targetRtp = profile.targetRtp;
      }
      return next;
    });
  }

  function setActiveProfileWeight(kind: BkSymKind, reelIndex: number, value: number) {
    setCfg((c) => {
      const profiles = c.rtpProfiles.map((p) => {
        if (p.id !== c.activeRtpProfile) return p;
        const reelWeights = { ...p.reelWeights };
        const row = [...(reelWeights[kind] ?? [0, 0, 0, 0, 0])];
        row[reelIndex] = value;
        reelWeights[kind] = row;
        return { ...p, reelWeights };
      });
      return normalizeBoxingKingConfig({ ...c, rtpProfiles: profiles });
    });
  }

  async function saveEngine() {
    setSaving(true);
    try {
      const next = await saveBoxingKingEngineConfigFn({
        data: { config: normalizeBoxingKingConfig(cfg) },
      });
      setCfg(normalizeBoxingKingConfig(next));
      toast.success("Boxing King engine saved");
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
      <DialogContent className="flex max-h-[92vh] w-[min(100%-1rem,48rem)] flex-col gap-0 overflow-hidden border-orange-500/20 bg-panel p-0">
        <div className="relative h-28 shrink-0 overflow-hidden">
          <img src={game.thumb} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16120F] to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-foreground">
                <Flame size={18} className="text-orange-400" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Full engine · 5×3 · 10 lines · Mix + Grand Jackpot — {game.gameId}
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

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-orange-500/15 px-3 py-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold",
                section === item.id
                  ? "bg-orange-500 text-black"
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
                      ? "bg-orange-500/20 text-orange-300"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 py-2.5 text-sm font-black uppercase text-orange-200 disabled:opacity-50"
              >
                <Save size={16} />
                {lobbyBusy ? "Saving…" : "Save lobby"}
              </button>
            </>
          ) : section === "symbols" ? (
            <>
              <p className="text-[11px] text-muted-foreground">
                Pay × bet-per-line for 3 / 4 / 5 of a kind. Art from{" "}
                <code className="text-orange-300">/images/symbols/boxing-king/</code>
              </p>
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
          ) : section === "mix" ? (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Instant Wild+Scatter mix × stake (count ≥ 6)
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, i) => {
                    const count = i + 6;
                    const key = String(count);
                    return (
                      <label key={key} className="space-y-1 text-[10px] text-muted-foreground">
                        {count} in view
                        <Num
                          value={cfg.instantMixTable[key] ?? 0}
                          onChange={(n) =>
                            patch({
                              instantMixTable: { ...cfg.instantMixTable, [key]: n },
                            })
                          }
                          step={1}
                          min={0}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="block space-y-1 text-xs font-semibold text-muted-foreground">
                Grand Jackpot × stake (all-Scatter only; skips mix)
                <Num
                  value={cfg.grandJackpotMult}
                  onChange={(n) => patch({ grandJackpotMult: n })}
                  step={1}
                  min={0}
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
                          ? "bg-orange-500 text-black"
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
                Reel weights for <span className="text-orange-300">{cfg.activeRtpProfile}</span>{" "}
                (reel 0–4). Spawn share shown for reel 0.
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
                Config-pending: max-win default 25,000× (Grand Jackpot figure). Editable without
                redeploy.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Max win × (config-pending)
                  <Num
                    value={cfg.maxWinMult}
                    onChange={(n) => patch({ maxWinMult: n })}
                    step={1}
                    min={0}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Paylines (fixed)
                  <Num
                    value={cfg.paylineCount}
                    onChange={(n) => patch({ paylineCount: n })}
                    step={1}
                    min={1}
                    max={50}
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
          <div className="shrink-0 border-t border-orange-500/20 p-3">
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void saveEngine()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-black uppercase text-black disabled:opacity-50"
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
