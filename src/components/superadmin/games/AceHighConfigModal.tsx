/**
 * Superadmin Ace High engine editor — full lobby + war / side-bet math control.
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
  DEFAULT_ACE_HIGH_CONFIG,
  normalizeAceHighConfig,
  type AceHighConfig,
} from "@/lib/ace-high-config";
import {
  getAceHighEngineConfigFn,
  saveAceHighEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "lobby" | "payouts" | "war" | "risk";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "payouts", label: "Payouts", icon: Spade },
  { id: "war", label: "War / Shoe", icon: Settings2 },
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

export function AceHighConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<AceHighConfig>(() =>
    structuredClone(DEFAULT_ACE_HIGH_CONFIG),
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState(game.tag ?? "");
  const [lobbyRtp, setLobbyRtp] = useState(Number(game.rtp) || 96.5);
  const [volatility, setVolatility] = useState(game.volatility ?? "Medium");
  const [lobbyMinBet, setLobbyMinBet] = useState(Number(game.minBet) || 1);
  const [lobbyMaxBet, setLobbyMaxBet] = useState(Number(game.maxBet) || 500);
  const [notes, setNotes] = useState(game.notes ?? "");
  const [sortOrder, setSortOrder] = useState(game.sortOrder ?? 0);
  const [betStepsText, setBetStepsText] = useState(
    DEFAULT_ACE_HIGH_CONFIG.betSteps.join(", "),
  );
  const [lobbyBusy, setLobbyBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setTag(game.tag ?? "");
    setLobbyRtp(Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || 96.5);
    setVolatility(game.volatility ?? "Medium");
    setLobbyMinBet(Number(String(game.minBet ?? "").replace(/[^\d.]/g, "")) || 1);
    setLobbyMaxBet(Number(String(game.maxBet ?? "").replace(/[^\d.]/g, "")) || 500);
    setNotes(game.notes ?? "");
    setSortOrder(game.sortOrder ?? 0);
    setLoading(true);
    void getAceHighEngineConfigFn()
      .then((c) => {
        const next = normalizeAceHighConfig(c);
        setCfg(next);
        setBetStepsText(next.betSteps.join(", "));
      })
      .catch(() => {
        setCfg(structuredClone(DEFAULT_ACE_HIGH_CONFIG));
        setBetStepsText(DEFAULT_ACE_HIGH_CONFIG.betSteps.join(", "));
      })
      .finally(() => setLoading(false));
  }, [open, game]);

  function patch(partial: Partial<AceHighConfig>) {
    setCfg((prev) => normalizeAceHighConfig({ ...prev, ...partial }));
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
      const withSteps = normalizeAceHighConfig({
        ...cfg,
        betSteps: parseBetSteps(betStepsText),
      });
      const next = await saveAceHighEngineConfigFn({
        data: { config: withSteps },
      });
      const normalized = normalizeAceHighConfig(next);
      setCfg(normalized);
      setBetStepsText(normalized.betSteps.join(", "));
      await onPatchLobby({
        rtp: `${normalized.targetRtp}%`,
        minBet: `₱${normalized.minBet.toFixed(2)}`,
        maxBet: `₱${normalized.maxBet.toFixed(2)}`,
      });
      setLobbyRtp(normalized.targetRtp);
      setLobbyMinBet(normalized.minBet);
      setLobbyMaxBet(normalized.maxBet);
      toast.success("Ace High engine saved — live for all players");
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
        minBet: lobbyMinBet,
        maxBet: lobbyMaxBet,
        targetRtp: lobbyRtp,
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
      <DialogContent className="flex max-h-[92vh] w-[min(100%-1rem,52rem)] flex-col gap-0 overflow-hidden border-amber-500/20 bg-panel p-0">
        <div className="relative h-28 shrink-0 overflow-hidden">
          <img src={game.thumb} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16120F] to-transparent" />
          <div className="absolute bottom-3 left-4 right-12 flex items-end justify-between gap-3">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-foreground">
                <Spade size={18} className="text-amber-400" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Full engine · High Card · Auto-War · Tie + Ace Bonus — {game.gameId}
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
                <Field label="Tag">
                  <Input
                    className="h-9 bg-white/[0.06]"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Hot / New"
                  />
                </Field>
                <Field label="Lobby RTP %">
                  <Num value={lobbyRtp} onChange={setLobbyRtp} step={0.1} min={80} max={99} />
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
                  <Num value={lobbyMinBet} onChange={setLobbyMinBet} step={0.5} min={0.01} />
                </Field>
                <Field label="Lobby max bet">
                  <Num value={lobbyMaxBet} onChange={setLobbyMaxBet} step={1} min={0.01} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Internal notes">
                    <Input
                      className="h-9 bg-white/[0.06]"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ops notes (not shown to players)"
                    />
                  </Field>
                </div>
              </div>
              <button
                type="button"
                disabled={lobbyBusy}
                onClick={() => void saveLobby()}
                className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
              >
                {lobbyBusy ? "Saving…" : "Save lobby"}
              </button>
            </>
          ) : section === "payouts" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Base payout mult"
                hint="2 = even money (stake return + 1:1). Applied to base and winning war stakes."
              >
                <Num
                  value={cfg.basePayoutMult}
                  onChange={(n) => patch({ basePayoutMult: n })}
                  step={0.1}
                  min={1}
                />
              </Field>
              <Field
                label="Tie side-bet mult"
                hint="Credits = tieBet × mult on initial deal tie (e.g. 5 ≈ 4:1 after debit)."
              >
                <Num
                  value={cfg.tieSideBetMult}
                  onChange={(n) => patch({ tieSideBetMult: n })}
                  step={1}
                  min={1}
                />
              </Field>
              <Field label="Ace Bonus — Ace vs Ace">
                <Num
                  value={cfg.aceBonus.aceVsAce}
                  onChange={(n) =>
                    patch({ aceBonus: { ...cfg.aceBonus, aceVsAce: n } })
                  }
                  step={1}
                />
              </Field>
              <Field label="Ace Bonus — either Ace">
                <Num
                  value={cfg.aceBonus.eitherAce}
                  onChange={(n) =>
                    patch({ aceBonus: { ...cfg.aceBonus, eitherAce: n } })
                  }
                  step={1}
                />
              </Field>
              <Field label="Min / Max base bet">
                <div className="flex gap-2">
                  <Num value={cfg.minBet} onChange={(n) => patch({ minBet: n })} step={0.5} />
                  <Num value={cfg.maxBet} onChange={(n) => patch({ maxBet: n })} step={1} />
                </div>
              </Field>
              <Field label="Min / Max tie bet">
                <div className="flex gap-2">
                  <Num value={cfg.minTieBet} onChange={(n) => patch({ minTieBet: n })} />
                  <Num value={cfg.maxTieBet} onChange={(n) => patch({ maxTieBet: n })} />
                </div>
              </Field>
              <Field label="Min / Max Ace Bonus bet">
                <div className="flex gap-2">
                  <Num
                    value={cfg.minAceBonusBet}
                    onChange={(n) => patch({ minAceBonusBet: n })}
                  />
                  <Num
                    value={cfg.maxAceBonusBet}
                    onChange={(n) => patch({ maxAceBonusBet: n })}
                  />
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="Quick-bet steps (₱)"
                  hint="Comma-separated amounts shown under the chip tray (desktop). Example: 1, 5, 10, 25, 100, 500"
                >
                  <Input
                    className="h-9 bg-white/[0.06] font-mono text-sm"
                    value={betStepsText}
                    onChange={(e) => setBetStepsText(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          ) : section === "war" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="War burn count" hint="Cards burned before each war redeal.">
                <Num
                  value={cfg.warBurnCount}
                  onChange={(n) => patch({ warBurnCount: n })}
                  step={1}
                  min={0}
                />
              </Field>
              <Field label="War max depth" hint="After this many wars, still-tied → split pot.">
                <Num
                  value={cfg.warMaxDepth}
                  onChange={(n) => patch({ warMaxDepth: n })}
                  step={1}
                  min={1}
                />
              </Field>
              <Field label="Decks in shoe">
                <Num
                  value={cfg.decksInShoe}
                  onChange={(n) => patch({ decksInShoe: n })}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Max win mult (× base)"
                hint="Caps total credited win for the round as baseBet × this value."
              >
                <Num
                  value={cfg.maxWinMult}
                  onChange={(n) => patch({ maxWinMult: n })}
                  step={10}
                />
              </Field>
              <Field
                label="Target RTP %"
                hint="Lobby / compliance label. Ace High deals a fair shoe — tune side-bet mults for house edge."
              >
                <Num
                  value={cfg.targetRtp}
                  onChange={(n) => patch({ targetRtp: n })}
                  step={0.1}
                  min={80}
                  max={99}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-white/5"
          >
            Close
          </button>
          <button
            type="button"
            disabled={saving || loading || section === "lobby"}
            onClick={() => void saveEngine()}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Save className="size-3.5" />
            {saving ? "Saving…" : "Save engine"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
