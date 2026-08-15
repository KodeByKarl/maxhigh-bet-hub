/**
 * Superadmin Drop Deluxe engine editor — payout mult + pick limits.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Coins, Save, Settings2, Store, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_DROP_DELUXE_CONFIG,
  RTP_REFERENCE,
  normalizeDropDeluxeConfig,
  type DropDeluxeConfig,
} from "@/lib/drop-deluxe-config";
import {
  getDropDeluxeEngineConfigFn,
  saveDropDeluxeEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LobbyVisibilityToggles } from "@/components/superadmin/games/LobbyVisibilityToggles";

type Section = "lobby" | "payouts" | "limits";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "payouts", label: "Payout", icon: Coins },
  { id: "limits", label: "Limits", icon: Settings2 },
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

export function DropDeluxeConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<DropDeluxeConfig>(() =>
    structuredClone(DEFAULT_DROP_DELUXE_CONFIG),
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
    DEFAULT_DROP_DELUXE_CONFIG.betSteps.join(", "),
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
    void getDropDeluxeEngineConfigFn()
      .then((remote) => {
        setCfg(remote);
        setBetStepsText(remote.betSteps.join(", "));
      })
      .catch(() => setCfg(structuredClone(DEFAULT_DROP_DELUXE_CONFIG)))
      .finally(() => setLoading(false));
  }, [open, game]);

  async function saveEngine() {
    setSaving(true);
    try {
      const steps = betStepsText
        .split(/[,\s]+/)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0);
      const withSteps = normalizeDropDeluxeConfig({ ...cfg, betSteps: steps });
      const next = await saveDropDeluxeEngineConfigFn({ data: { config: withSteps } });
      setCfg(next);
      setBetStepsText(next.betSteps.join(", "));
      toast.success("Drop Deluxe engine saved");
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
        tag,
        rtp: `${lobbyRtp}%`,
        volatility,
        minBet: `₱${lobbyMinBet}`,
        maxBet: `₱${lobbyMaxBet}`,
        notes,
        sortOrder,
      });
      toast.success("Lobby fields saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lobby save failed");
    } finally {
      setLobbyBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            Drop Deluxe config
            <button type="button" className="ml-auto" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </button>
          </DialogTitle>
          <DialogDescription>
            Fair 1–10 die. Default 9× total return ≈ 90% RTP on a single lane.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <nav className="flex w-36 shrink-0 flex-col gap-1 border-r border-white/10 p-3">
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSection(n.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                  section === n.id ? "bg-white/10 text-white" : "text-muted-foreground",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : section === "lobby" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <LobbyVisibilityToggles game={game} onPatch={onPatchLobby} />
                </div>
                <Field label="Tag">
                  <Input value={tag} onChange={(e) => setTag(e.target.value)} />
                </Field>
                <Field label="Lobby RTP %">
                  <Num value={lobbyRtp} onChange={setLobbyRtp} step={0.1} />
                </Field>
                <Field label="Volatility">
                  <Input value={volatility} onChange={(e) => setVolatility(e.target.value)} />
                </Field>
                <Field label="Sort order">
                  <Num value={sortOrder} onChange={setSortOrder} />
                </Field>
                <Field label="Lobby min bet">
                  <Num value={lobbyMinBet} onChange={setLobbyMinBet} step={0.01} />
                </Field>
                <Field label="Lobby max bet">
                  <Num value={lobbyMaxBet} onChange={setLobbyMaxBet} step={0.01} />
                </Field>
                <Field label="Notes">
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    disabled={lobbyBusy}
                    onClick={() => void saveLobby()}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"
                  >
                    <Save className="h-4 w-4" /> Save lobby
                  </button>
                </div>
              </div>
            ) : section === "payouts" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Payout multiplier"
                  hint={`Total return incl. stake. Single lane @ 9× → ~${RTP_REFERENCE.singlePick}% RTP.`}
                >
                  <Num
                    value={cfg.payoutMult}
                    onChange={(n) => setCfg((c) => ({ ...c, payoutMult: n }))}
                    step={0.1}
                    min={1.01}
                  />
                </Field>
                <Field label="Max picks per drop">
                  <Num
                    value={cfg.maxPicks}
                    onChange={(n) => setCfg((c) => ({ ...c, maxPicks: n }))}
                    min={1}
                    max={10}
                  />
                </Field>
                <Field label="RTP target % (display)">
                  <Num
                    value={cfg.rtpTarget}
                    onChange={(n) => setCfg((c) => ({ ...c, rtpTarget: n }))}
                    step={0.1}
                  />
                </Field>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Min lane bet">
                  <Num
                    value={cfg.minBet}
                    onChange={(n) => setCfg((c) => ({ ...c, minBet: n }))}
                    step={0.01}
                  />
                </Field>
                <Field label="Max total bet">
                  <Num
                    value={cfg.maxBet}
                    onChange={(n) => setCfg((c) => ({ ...c, maxBet: n }))}
                    step={0.01}
                  />
                </Field>
                <Field label="Max per lane">
                  <Num
                    value={cfg.maxSpotBet}
                    onChange={(n) => setCfg((c) => ({ ...c, maxSpotBet: n }))}
                    step={0.01}
                  />
                </Field>
                <Field label="Chip steps" hint="Comma-separated">
                  <Input value={betStepsText} onChange={(e) => setBetStepsText(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-3">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void saveEngine()}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-400/90 px-4 py-2 text-sm font-bold text-slate-900"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save engine"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
