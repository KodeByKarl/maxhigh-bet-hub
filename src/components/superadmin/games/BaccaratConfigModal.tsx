/**
 * Superadmin Baccarat engine editor — lobby + payouts + shoe/limits + RTP label.
 * Wired from Super Admin → Games → Baccarat (full config).
 */
import { useEffect, useState, type ReactNode } from "react";
import { Coins, Save, Settings2, Spade, Store, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_BACCARAT_CONFIG,
  RTP_REFERENCE,
  normalizeBaccaratConfig,
  type BaccaratConfig,
} from "@/lib/baccarat-config";
import {
  getBaccaratAdminConfigFn,
  saveBaccaratAdminConfigFn,
} from "@/functions/baccarat";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "lobby" | "payouts" | "limits" | "risk";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "payouts", label: "Payouts", icon: Spade },
  { id: "limits", label: "Limits / Shoe", icon: Settings2 },
  { id: "risk", label: "Risk / RTP", icon: Coins },
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-[10px] text-muted-foreground/70">{hint}</span> : null}
    </label>
  );
}

export function BaccaratConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<BaccaratConfig>(() =>
    structuredClone(DEFAULT_BACCARAT_CONFIG),
  );
  const [saving, setSaving] = useState(false);
  const [lobbyBusy, setLobbyBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState(game.tag ?? "");
  const [lobbyRtp, setLobbyRtp] = useState(
    Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || RTP_REFERENCE.banker,
  );
  const [volatility, setVolatility] = useState(game.volatility ?? "Low");
  const [lobbyMinBet, setLobbyMinBet] = useState(
    Number(String(game.minBet ?? "").replace(/[^\d.]/g, "")) || 1,
  );
  const [lobbyMaxBet, setLobbyMaxBet] = useState(
    Number(String(game.maxBet ?? "").replace(/[^\d.]/g, "")) || 500,
  );
  const [notes, setNotes] = useState(game.notes ?? "");
  const [sortOrder, setSortOrder] = useState(game.sortOrder ?? 0);
  const [betStepsText, setBetStepsText] = useState(
    DEFAULT_BACCARAT_CONFIG.betSteps.join(", "),
  );

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setTag(game.tag ?? "");
    setLobbyRtp(
      Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || RTP_REFERENCE.banker,
    );
    setVolatility(game.volatility ?? "Low");
    setLobbyMinBet(Number(String(game.minBet ?? "").replace(/[^\d.]/g, "")) || 1);
    setLobbyMaxBet(Number(String(game.maxBet ?? "").replace(/[^\d.]/g, "")) || 500);
    setNotes(game.notes ?? "");
    setSortOrder(game.sortOrder ?? 0);
    setLoading(true);
    void getBaccaratAdminConfigFn()
      .then((c) => {
        const next = normalizeBaccaratConfig(c);
        setCfg(next);
        setBetStepsText(next.betSteps.join(", "));
      })
      .catch(() => {
        setCfg(structuredClone(DEFAULT_BACCARAT_CONFIG));
        setBetStepsText(DEFAULT_BACCARAT_CONFIG.betSteps.join(", "));
      })
      .finally(() => setLoading(false));
  }, [open, game]);

  function patch(partial: Partial<BaccaratConfig>) {
    setCfg((prev) => normalizeBaccaratConfig({ ...prev, ...partial }));
  }

  function parseBetSteps(text: string): number[] {
    return text
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  async function saveEngine() {
    setSaving(true);
    try {
      const withSteps = normalizeBaccaratConfig({
        ...cfg,
        betSteps: parseBetSteps(betStepsText),
      });
      const next = await saveBaccaratAdminConfigFn({ data: { config: withSteps } });
      const normalized = normalizeBaccaratConfig(next);
      setCfg(normalized);
      setBetStepsText(normalized.betSteps.join(", "));
      const minMain = Math.min(normalized.minPlayerBet, normalized.minBankerBet);
      const maxMain = Math.max(normalized.maxPlayerBet, normalized.maxBankerBet);
      await onPatchLobby({
        rtp: `${normalized.rtpTarget}%`,
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      });
      setLobbyRtp(normalized.rtpTarget);
      setLobbyMinBet(minMain);
      setLobbyMaxBet(maxMain);
      toast.success("Baccarat engine saved — live for all players");
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
        volatility: volatility.trim() || "Low",
        minBet: `₱${lobbyMinBet}`,
        maxBet: `₱${lobbyMaxBet}`,
        notes: notes.trim() || null,
        sortOrder,
      });
      patch({
        rtpTarget: lobbyRtp,
        minPlayerBet: lobbyMinBet,
        minBankerBet: lobbyMinBet,
        maxPlayerBet: lobbyMaxBet,
        maxBankerBet: lobbyMaxBet,
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
      <DialogContent className="flex max-h-[92vh] w-[min(100%-1rem,52rem)] flex-col gap-0 overflow-hidden border-emerald-500/20 bg-panel p-0">
        <div className="relative h-28 shrink-0 overflow-hidden">
          <img src={game.thumb} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1524] to-transparent" />
          <div className="absolute bottom-3 left-4 right-12 flex items-end justify-between gap-3">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-foreground">
                <Spade size={18} className="text-emerald-400" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Full engine · Punto Banco · Player / Banker / Tie / Pairs — {game.gameId}
              </DialogDescription>
            </DialogHeader>
          </div>
          <button
            type="button"
            className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/50 p-1.5 text-white hover:bg-black/70"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-3 py-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
                section === item.id
                  ? "bg-emerald-500 text-black"
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
                <Field label="Tag">
                  <Input
                    className="h-9 bg-white/[0.06]"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Hot / New"
                  />
                </Field>
                <Field label="Lobby RTP %" hint="Display only">
                  <Num value={lobbyRtp} onChange={setLobbyRtp} step={0.01} min={80} max={99.5} />
                </Field>
                <Field label="Volatility">
                  <Input
                    className="h-9 bg-white/[0.06]"
                    value={volatility}
                    onChange={(e) => setVolatility(e.target.value)}
                  />
                </Field>
                <Field label="Sort order">
                  <Num value={sortOrder} onChange={setSortOrder} step={1} />
                </Field>
                <Field label="Lobby min bet">
                  <Num value={lobbyMinBet} onChange={setLobbyMinBet} step={0.01} min={0.01} />
                </Field>
                <Field label="Lobby max bet">
                  <Num value={lobbyMaxBet} onChange={setLobbyMaxBet} step={1} min={1} />
                </Field>
                <Field label="Notes">
                  <Input
                    className="h-9 bg-white/[0.06]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Field>
                <Field label="Quick bet steps" hint="Comma-separated chip presets">
                  <Input
                    className="h-9 bg-white/[0.06]"
                    value={betStepsText}
                    onChange={(e) => setBetStepsText(e.target.value)}
                  />
                </Field>
              </div>
              <button
                type="button"
                disabled={lobbyBusy}
                onClick={() => void saveLobby()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Save className="size-3.5" />
                {lobbyBusy ? "Saving…" : "Save lobby"}
              </button>
            </>
          ) : section === "payouts" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Player payout (profit odds)" hint="1.0 = 1:1 even money">
                <Num
                  value={cfg.playerPayout}
                  onChange={(n) => patch({ playerPayout: n })}
                  step={0.01}
                  min={0.5}
                  max={2}
                />
              </Field>
              <Field label="Banker payout" hint="0.95 = 1:1 − 5% commission">
                <Num
                  value={cfg.bankerPayout}
                  onChange={(n) => patch({ bankerPayout: n })}
                  step={0.01}
                  min={0.5}
                  max={2}
                />
              </Field>
              <Field label="Banker commission" hint="0.05 = 5%">
                <Num
                  value={cfg.bankerCommission}
                  onChange={(n) =>
                    patch({
                      bankerCommission: n,
                      bankerPayout: +(1 - n).toFixed(4),
                    })
                  }
                  step={0.01}
                  min={0}
                  max={0.5}
                />
              </Field>
              <Field label="Tie payout" hint="8 = 8:1">
                <Num
                  value={cfg.tiePayout}
                  onChange={(n) => patch({ tiePayout: n })}
                  step={1}
                  min={1}
                  max={100}
                />
              </Field>
              <Field label="Player Pair payout" hint="11 = 11:1">
                <Num
                  value={cfg.playerPairPayout}
                  onChange={(n) => patch({ playerPairPayout: n })}
                  step={1}
                  min={1}
                  max={100}
                />
              </Field>
              <Field label="Banker Pair payout" hint="11 = 11:1">
                <Num
                  value={cfg.bankerPairPayout}
                  onChange={(n) => patch({ bankerPairPayout: n })}
                  step={1}
                  min={1}
                  max={100}
                />
              </Field>
            </div>
          ) : section === "limits" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Deck count (shoe)">
                <Num
                  value={cfg.deckCount}
                  onChange={(n) => patch({ deckCount: n })}
                  step={1}
                  min={1}
                  max={8}
                />
              </Field>
              <Field label="Reshuffle below fraction">
                <Num
                  value={cfg.reshuffleBelowFraction}
                  onChange={(n) => patch({ reshuffleBelowFraction: n })}
                  step={0.05}
                  min={0.05}
                  max={0.75}
                />
              </Field>
              <Field label="Player min / max">
                <div className="flex gap-2">
                  <Num value={cfg.minPlayerBet} onChange={(n) => patch({ minPlayerBet: n })} step={0.01} />
                  <Num value={cfg.maxPlayerBet} onChange={(n) => patch({ maxPlayerBet: n })} step={1} />
                </div>
              </Field>
              <Field label="Banker min / max">
                <div className="flex gap-2">
                  <Num value={cfg.minBankerBet} onChange={(n) => patch({ minBankerBet: n })} step={0.01} />
                  <Num value={cfg.maxBankerBet} onChange={(n) => patch({ maxBankerBet: n })} step={1} />
                </div>
              </Field>
              <Field label="Tie min / max">
                <div className="flex gap-2">
                  <Num value={cfg.minTieBet} onChange={(n) => patch({ minTieBet: n })} step={0.01} />
                  <Num value={cfg.maxTieBet} onChange={(n) => patch({ maxTieBet: n })} step={1} />
                </div>
              </Field>
              <Field label="Player Pair min / max">
                <div className="flex gap-2">
                  <Num
                    value={cfg.minPlayerPairBet}
                    onChange={(n) => patch({ minPlayerPairBet: n })}
                    step={0.01}
                  />
                  <Num
                    value={cfg.maxPlayerPairBet}
                    onChange={(n) => patch({ maxPlayerPairBet: n })}
                    step={1}
                  />
                </div>
              </Field>
              <Field label="Banker Pair min / max">
                <div className="flex gap-2">
                  <Num
                    value={cfg.minBankerPairBet}
                    onChange={(n) => patch({ minBankerPairBet: n })}
                    step={0.01}
                  />
                  <Num
                    value={cfg.maxBankerPairBet}
                    onChange={(n) => patch({ maxBankerPairBet: n })}
                    step={1}
                  />
                </div>
              </Field>
              <Field label="Quick bet steps" hint="Saved with engine">
                <Input
                  className="h-9 bg-white/[0.06]"
                  value={betStepsText}
                  onChange={(e) => setBetStepsText(e.target.value)}
                />
              </Field>
            </div>
          ) : (
            <div className="space-y-3">
              <Field
                label="RTP target % (label)"
                hint={`Reference: Banker ${RTP_REFERENCE.banker}% · Player ${RTP_REFERENCE.player}% · Tie ${RTP_REFERENCE.tie}% — not enforced live`}
              >
                <Num
                  value={cfg.rtpTarget}
                  onChange={(n) => patch({ rtpTarget: n })}
                  step={0.01}
                  min={80}
                  max={99.5}
                />
              </Field>
              <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[11px] text-muted-foreground">
                Baccarat RTP is fixed by the Punto Banco tableau. Changing payouts alters house edge;
                the target field is for lobby / compliance display only. Persisted in{" "}
                <code className="text-emerald-300/90">game_controls.engineConfig</code>.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-3 text-sm text-muted-foreground hover:bg-white/5"
          >
            <X className="size-3.5" />
            Close
          </button>
          {section !== "lobby" ? (
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void saveEngine()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Save className="size-3.5" />
              {saving ? "Saving…" : "Save engine"}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void saveEngine()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Save className="size-3.5" />
              {saving ? "Saving…" : "Save engine + steps"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
