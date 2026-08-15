/**
 * Superadmin Color Game Pro engine editor — spot multipliers + min/max bets.
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
  DEFAULT_COLOR_GAME_PRO_CONFIG,
  RTP_REFERENCE,
  normalizeColorGameProConfig,
  type ColorGameProConfig,
  type ColorSpotDef,
} from "@/lib/color-game-pro-config";
import {
  getColorGameProEngineConfigFn,
  saveColorGameProEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LobbyVisibilityToggles } from "@/components/superadmin/games/LobbyVisibilityToggles";

type Section = "lobby" | "payouts" | "limits";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "payouts", label: "Colors / Pays", icon: Coins },
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

export function ColorGameProConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<ColorGameProConfig>(() =>
    structuredClone(DEFAULT_COLOR_GAME_PRO_CONFIG),
  );
  const [saving, setSaving] = useState(false);
  const [lobbyBusy, setLobbyBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState(game.tag ?? "");
  const [lobbyRtp, setLobbyRtp] = useState(
    Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || RTP_REFERENCE.overall,
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
    DEFAULT_COLOR_GAME_PRO_CONFIG.betSteps.join(", "),
  );

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setTag(game.tag ?? "");
    setLobbyRtp(
      Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || RTP_REFERENCE.overall,
    );
    setVolatility(game.volatility ?? "Low");
    setLobbyMinBet(Number(String(game.minBet ?? "").replace(/[^\d.]/g, "")) || 1);
    setLobbyMaxBet(Number(String(game.maxBet ?? "").replace(/[^\d.]/g, "")) || 500);
    setNotes(game.notes ?? "");
    setSortOrder(game.sortOrder ?? 0);
    setLoading(true);
    void getColorGameProEngineConfigFn()
      .then((remote) => {
        setCfg(remote);
        setBetStepsText(remote.betSteps.join(", "));
      })
      .catch(() => setCfg(structuredClone(DEFAULT_COLOR_GAME_PRO_CONFIG)))
      .finally(() => setLoading(false));
  }, [open, game]);

  function patchSpot(id: string, patch: Partial<ColorSpotDef>) {
    setCfg((c) => ({
      ...c,
      spots: c.spots.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  async function saveEngine() {
    setSaving(true);
    try {
      const steps = betStepsText
        .split(/[,\s]+/)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0);
      const withSteps = normalizeColorGameProConfig({ ...cfg, betSteps: steps });
      const next = await saveColorGameProEngineConfigFn({ data: { config: withSteps } });
      setCfg(next);
      setBetStepsText(next.betSteps.join(", "));
      toast.success("Color Game Pro engine saved");
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
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            Color Game Pro config
            <button type="button" className="ml-auto" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </button>
          </DialogTitle>
          <DialogDescription>
            Spot multipliers (total return) + weights. Default 5.5× ≈ 91.7% RTP on fair 6-face die.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <nav className="flex w-40 shrink-0 flex-col gap-1 border-r border-white/10 p-3">
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
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  payoutMult = total return (incl. stake). Equal weight + 5.5× → ~{RTP_REFERENCE.singleColor}% RTP.
                </p>
                {cfg.spots.map((sp) => (
                  <div
                    key={sp.id}
                    className="grid grid-cols-[auto_1fr_1fr_1fr] items-end gap-2 rounded-lg border border-white/10 p-2"
                  >
                    <div
                      className="h-8 w-8 rounded-md border border-white/20"
                      style={{ background: sp.hex }}
                      title={sp.label}
                    />
                    <Field label={`${sp.label} mult`}>
                      <Num
                        value={sp.payoutMult}
                        onChange={(n) => patchSpot(sp.id, { payoutMult: n })}
                        step={0.1}
                        min={1.01}
                      />
                    </Field>
                    <Field label="Weight">
                      <Num
                        value={sp.weight}
                        onChange={(n) => patchSpot(sp.id, { weight: n })}
                        step={0.1}
                        min={0.01}
                      />
                    </Field>
                    <Field label="Hex">
                      <Input
                        value={sp.hex}
                        onChange={(e) => patchSpot(sp.id, { hex: e.target.value })}
                      />
                    </Field>
                  </div>
                ))}
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
                <Field label="Min spot bet">
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
                <Field label="Max per spot">
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
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-bold text-slate-900"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save engine"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
