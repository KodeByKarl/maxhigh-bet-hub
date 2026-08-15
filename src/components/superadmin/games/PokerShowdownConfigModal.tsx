/**
 * Superadmin Poker Showdown engine editor — lobby + payouts + qualify + limits.
 * Wired from Super Admin → Games → Poker Showdown (full config).
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
  DEFAULT_POKER_SHOWDOWN_CONFIG,
  RTP_REFERENCE,
  normalizePokerShowdownConfig,
  type QualifyRank,
  type PokerShowdownConfig,
} from "@/lib/poker-showdown-config";
import {
  getPokerShowdownEngineConfigFn,
  savePokerShowdownEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LobbyVisibilityToggles } from "@/components/superadmin/games/LobbyVisibilityToggles";

type Section = "lobby" | "payouts" | "limits" | "risk";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "payouts", label: "Payouts / Bonus", icon: Spade },
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

export function PokerShowdownConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<PokerShowdownConfig>(() =>
    structuredClone(DEFAULT_POKER_SHOWDOWN_CONFIG),
  );
  const [saving, setSaving] = useState(false);
  const [lobbyBusy, setLobbyBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState(game.tag ?? "");
  const [lobbyRtp, setLobbyRtp] = useState(
    Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || RTP_REFERENCE.overall,
  );
  const [volatility, setVolatility] = useState(game.volatility ?? "Medium");
  const [lobbyMinBet, setLobbyMinBet] = useState(
    Number(String(game.minBet ?? "").replace(/[^\d.]/g, "")) || 1,
  );
  const [lobbyMaxBet, setLobbyMaxBet] = useState(
    Number(String(game.maxBet ?? "").replace(/[^\d.]/g, "")) || 500,
  );
  const [notes, setNotes] = useState(game.notes ?? "");
  const [sortOrder, setSortOrder] = useState(game.sortOrder ?? 0);
  const [betStepsText, setBetStepsText] = useState(
    DEFAULT_POKER_SHOWDOWN_CONFIG.betSteps.join(", "),
  );

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setTag(game.tag ?? "");
    setLobbyRtp(
      Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || RTP_REFERENCE.overall,
    );
    setVolatility(game.volatility ?? "Medium");
    setLobbyMinBet(Number(String(game.minBet ?? "").replace(/[^\d.]/g, "")) || 1);
    setLobbyMaxBet(Number(String(game.maxBet ?? "").replace(/[^\d.]/g, "")) || 500);
    setNotes(game.notes ?? "");
    setSortOrder(game.sortOrder ?? 0);
    setLoading(true);
    void getPokerShowdownEngineConfigFn()
      .then((c) => {
        const next = normalizePokerShowdownConfig(c);
        setCfg(next);
        setBetStepsText(next.betSteps.join(", "));
      })
      .catch(() => {
        setCfg(structuredClone(DEFAULT_POKER_SHOWDOWN_CONFIG));
        setBetStepsText(DEFAULT_POKER_SHOWDOWN_CONFIG.betSteps.join(", "));
      })
      .finally(() => setLoading(false));
  }, [open, game]);

  function patch(partial: Partial<PokerShowdownConfig>) {
    setCfg((prev) => normalizePokerShowdownConfig({ ...prev, ...partial }));
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
      const withSteps = normalizePokerShowdownConfig({
        ...cfg,
        betSteps: parseBetSteps(betStepsText),
      });
      const next = await savePokerShowdownEngineConfigFn({ data: { config: withSteps } });
      const normalized = normalizePokerShowdownConfig(next);
      setCfg(normalized);
      setBetStepsText(normalized.betSteps.join(", "));
      const minMain = normalized.minAnteBet;
      const maxMain = Math.max(normalized.maxAnteBet, normalized.maxPairPlusBet);
      await onPatchLobby({
        rtp: `${normalized.rtpTarget}%`,
        minBet: `₱${minMain.toFixed(2)}`,
        maxBet: `₱${maxMain.toFixed(2)}`,
      });
      setLobbyRtp(normalized.rtpTarget);
      setLobbyMinBet(minMain);
      setLobbyMaxBet(maxMain);
      toast.success("Poker Showdown engine saved — live for all players");
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
        minBet: `₱${lobbyMinBet}`,
        maxBet: `₱${lobbyMaxBet}`,
        notes: notes.trim() || null,
        sortOrder,
      });
      patch({
        rtpTarget: lobbyRtp,
        minAnteBet: lobbyMinBet,
        maxAnteBet: lobbyMaxBet,
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
      <DialogContent className="flex max-h-[92vh] w-[min(100%-1rem,52rem)] flex-col gap-0 overflow-hidden border-violet-500/20 bg-panel p-0">
        <div className="relative h-28 shrink-0 overflow-hidden">
          <img src={game.thumb} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1524] to-transparent" />
          <div className="absolute bottom-3 left-4 right-12 flex items-end justify-between gap-3">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-foreground">
                <Spade size={18} className="text-violet-400" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Full engine · Ante/Play · Pair Plus · Qualify — {game.gameId}
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
                  ? "bg-violet-500 text-black"
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
              <LobbyVisibilityToggles game={game} onPatch={onPatchLobby} />
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
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-violet-500/40 bg-violet-500/10 px-3 text-sm font-medium text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
              >
                <Save className="size-3.5" />
                {lobbyBusy ? "Saving…" : "Save lobby"}
              </button>
            </>
          ) : section === "payouts" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ante payout" hint="1.0 = 1:1 when player wins / dealer no-qualify">
                  <Num
                    value={cfg.antePayout}
                    onChange={(n) => patch({ antePayout: n })}
                    step={0.01}
                    min={0.5}
                    max={2}
                  />
                </Field>
                <Field label="Play payout" hint="1.0 = 1:1">
                  <Num
                    value={cfg.playPayout}
                    onChange={(n) => patch({ playPayout: n })}
                    step={0.01}
                    min={0.5}
                    max={2}
                  />
                </Field>
                <Field label="Dealer qualify rank" hint="Pair-or-better always qualifies">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-white/[0.06] px-3 text-sm"
                    value={cfg.dealerQualifyRank}
                    onChange={(e) =>
                      patch({ dealerQualifyRank: e.target.value as QualifyRank })
                    }
                  >
                    {(["10", "J", "Q", "K", "A"] as QualifyRank[]).map((r) => (
                      <option key={r} value={r}>
                        {r}-high or better
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold tracking-wide text-sky-300 uppercase">
                  Pair Plus (profit odds)
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Pair">
                    <Num
                      value={cfg.pairPlus.pair}
                      onChange={(n) => patch({ pairPlus: { ...cfg.pairPlus, pair: n } })}
                      step={0.5}
                      min={0.5}
                      max={50}
                    />
                  </Field>
                  <Field label="Flush" hint="House often uses 3:1 or 4:1">
                    <Num
                      value={cfg.pairPlus.flush}
                      onChange={(n) => patch({ pairPlus: { ...cfg.pairPlus, flush: n } })}
                      step={1}
                      min={1}
                      max={50}
                    />
                  </Field>
                  <Field label="Straight">
                    <Num
                      value={cfg.pairPlus.straight}
                      onChange={(n) => patch({ pairPlus: { ...cfg.pairPlus, straight: n } })}
                      step={1}
                      min={1}
                      max={100}
                    />
                  </Field>
                  <Field label="Three of a Kind" hint="Often 30:1 or 25:1">
                    <Num
                      value={cfg.pairPlus.threeOfAKind}
                      onChange={(n) =>
                        patch({ pairPlus: { ...cfg.pairPlus, threeOfAKind: n } })
                      }
                      step={1}
                      min={1}
                      max={200}
                    />
                  </Field>
                  <Field label="Straight Flush">
                    <Num
                      value={cfg.pairPlus.straightFlush}
                      onChange={(n) =>
                        patch({ pairPlus: { ...cfg.pairPlus, straightFlush: n } })
                      }
                      step={1}
                      min={1}
                      max={500}
                    />
                  </Field>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold tracking-wide text-emerald-300 uppercase">
                    Ante Bonus (profit on Ante stake)
                  </h3>
                  <button
                    type="button"
                    onClick={() => patch({ anteBonusEnabled: !cfg.anteBonusEnabled })}
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-bold",
                      cfg.anteBonusEnabled
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/[0.06] text-muted-foreground",
                    )}
                  >
                    {cfg.anteBonusEnabled ? "Enabled" : "Disabled (MVP)"}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Straight">
                    <Num
                      value={cfg.anteBonus.straight}
                      onChange={(n) => patch({ anteBonus: { ...cfg.anteBonus, straight: n } })}
                      step={0.5}
                      min={0}
                      max={50}
                    />
                  </Field>
                  <Field label="Three of a Kind">
                    <Num
                      value={cfg.anteBonus.threeOfAKind}
                      onChange={(n) =>
                        patch({ anteBonus: { ...cfg.anteBonus, threeOfAKind: n } })
                      }
                      step={0.5}
                      min={0}
                      max={100}
                    />
                  </Field>
                  <Field label="Straight Flush">
                    <Num
                      value={cfg.anteBonus.straightFlush}
                      onChange={(n) =>
                        patch({ anteBonus: { ...cfg.anteBonus, straightFlush: n } })
                      }
                      step={0.5}
                      min={0}
                      max={200}
                    />
                  </Field>
                </div>
              </div>
            </div>
          ) : section === "limits" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Min Ante">
                <Num
                  value={cfg.minAnteBet}
                  onChange={(n) => patch({ minAnteBet: n })}
                  step={0.01}
                  min={0.01}
                />
              </Field>
              <Field label="Max Ante">
                <Num
                  value={cfg.maxAnteBet}
                  onChange={(n) => patch({ maxAnteBet: n })}
                  step={1}
                  min={1}
                />
              </Field>
              <Field label="Min Pair Plus">
                <Num
                  value={cfg.minPairPlusBet}
                  onChange={(n) => patch({ minPairPlusBet: n })}
                  step={0.01}
                  min={0.01}
                />
              </Field>
              <Field label="Max Pair Plus">
                <Num
                  value={cfg.maxPairPlusBet}
                  onChange={(n) => patch({ maxPairPlusBet: n })}
                  step={1}
                  min={1}
                />
              </Field>
              <Field label="Decks in shoe" hint="Standard TCP is 1 deck">
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
            </div>
          ) : (
            <div className="space-y-3">
              <Field
                label="Target RTP %"
                hint={`Reference ~${RTP_REFERENCE.overall}% overall · Ante/Play ~${RTP_REFERENCE.antePlay}% · Pair Plus ~${RTP_REFERENCE.pairPlus}% — label only`}
              >
                <Num
                  value={cfg.rtpTarget}
                  onChange={(n) => patch({ rtpTarget: n })}
                  step={0.01}
                  min={80}
                  max={99.5}
                />
              </Field>
              <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-muted-foreground">
                Ranking: Straight Flush &gt; Trips &gt; Straight &gt; Flush &gt; Pair &gt; High Card.
                Ace is high except A-2-3 (wheel). Pair Plus settles on the player hand only,
                independent of Play/Fold and dealer qualification.
              </p>
            </div>
          )}
        </div>

        {section !== "lobby" ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 px-4 py-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEngine()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-500 px-4 text-sm font-bold text-black hover:bg-violet-400 disabled:opacity-50"
            >
              <Save className="size-3.5" />
              {saving ? "Saving…" : "Save engine"}
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
