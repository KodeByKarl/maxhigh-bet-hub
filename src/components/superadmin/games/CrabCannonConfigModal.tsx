/**
 * Superadmin Crab Cannon engine editor — lobby + fish + weapons + boss + RTP.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Coins, Fish, Save, Settings2, Store, Target, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_CRAB_CANNON_CONFIG,
  RTP_REFERENCE,
  normalizeCrabCannonConfig,
  type CrabCannonConfig,
  type FishTierConfig,
  type WeaponTierConfig,
} from "@/lib/crab-cannon-config";
import {
  getCrabCannonAdminConfigFn,
  saveCrabCannonAdminConfigFn,
} from "@/functions/crab-cannon";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LobbyVisibilityToggles } from "@/components/superadmin/games/LobbyVisibilityToggles";

type Section = "lobby" | "fish" | "weapons" | "boss" | "risk";

const NAV: { id: Section; label: string; icon: typeof Store }[] = [
  { id: "lobby", label: "Lobby", icon: Store },
  { id: "fish", label: "Fish Tiers", icon: Fish },
  { id: "weapons", label: "Weapons", icon: Target },
  { id: "boss", label: "Boss", icon: Settings2 },
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

export function CrabCannonConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [section, setSection] = useState<Section>("lobby");
  const [cfg, setCfg] = useState<CrabCannonConfig>(() =>
    structuredClone(DEFAULT_CRAB_CANNON_CONFIG),
  );
  const [saving, setSaving] = useState(false);
  const [lobbyBusy, setLobbyBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState(game.tag ?? "");
  const [lobbyRtp, setLobbyRtp] = useState(
    Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || RTP_REFERENCE.target,
  );
  const [volatility, setVolatility] = useState(game.volatility ?? "Medium");
  const [lobbyMinBet, setLobbyMinBet] = useState(
    Number(String(game.minBet ?? "").replace(/[^\d.]/g, "")) || 1,
  );
  const [lobbyMaxBet, setLobbyMaxBet] = useState(
    Number(String(game.maxBet ?? "").replace(/[^\d.]/g, "")) || 25,
  );
  const [notes, setNotes] = useState(game.notes ?? "");
  const [sortOrder, setSortOrder] = useState(game.sortOrder ?? 0);

  useEffect(() => {
    if (!open) return;
    setSection("lobby");
    setTag(game.tag ?? "");
    setLobbyRtp(
      Number.parseFloat(String(game.rtp ?? "").replace("%", "")) || RTP_REFERENCE.target,
    );
    setVolatility(game.volatility ?? "Medium");
    setLobbyMinBet(Number(String(game.minBet ?? "").replace(/[^\d.]/g, "")) || 1);
    setLobbyMaxBet(Number(String(game.maxBet ?? "").replace(/[^\d.]/g, "")) || 25);
    setNotes(game.notes ?? "");
    setSortOrder(game.sortOrder ?? 0);
    setLoading(true);
    void getCrabCannonAdminConfigFn()
      .then((c) => setCfg(normalizeCrabCannonConfig(c)))
      .catch(() => setCfg(structuredClone(DEFAULT_CRAB_CANNON_CONFIG)))
      .finally(() => setLoading(false));
  }, [open, game]);

  function patch(partial: Partial<CrabCannonConfig>) {
    setCfg((prev) => normalizeCrabCannonConfig({ ...prev, ...partial }));
  }

  function patchFish(id: string, partial: Partial<FishTierConfig>) {
    setCfg((prev) =>
      normalizeCrabCannonConfig({
        ...prev,
        fishTiers: prev.fishTiers.map((f) => (f.id === id ? { ...f, ...partial } : f)),
      }),
    );
  }

  function patchWeapon(id: string, partial: Partial<WeaponTierConfig>) {
    setCfg((prev) =>
      normalizeCrabCannonConfig({
        ...prev,
        weapons: prev.weapons.map((w) => (w.id === id ? { ...w, ...partial } : w)),
      }),
    );
  }

  async function saveEngine() {
    setSaving(true);
    try {
      const next = await saveCrabCannonAdminConfigFn({ data: { config: cfg } });
      const normalized = normalizeCrabCannonConfig(next);
      setCfg(normalized);
      await onPatchLobby({
        rtp: `${normalized.rtpTarget}%`,
        minBet: `₱${normalized.minBet.toFixed(2)}`,
        maxBet: `₱${normalized.maxBet.toFixed(2)}`,
      });
      setLobbyRtp(normalized.rtpTarget);
      setLobbyMinBet(normalized.minBet);
      setLobbyMaxBet(normalized.maxBet);
      toast.success("Crab Cannon engine saved — live for all players");
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
        minBet: lobbyMinBet,
        maxBet: lobbyMaxBet,
      });
      toast.success("Lobby fields updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lobby save failed");
    } finally {
      setLobbyBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(100%-1rem,56rem)] overflow-hidden border-teal-500/25 bg-panel p-0 text-foreground sm:rounded-2xl">
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">
                Crab Cannon — Engine Config
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Fish payouts, weapon costs, boss split, and RTP target. Persists to{" "}
                <code className="text-[10px]">game_controls.engineConfig</code>.
              </DialogDescription>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex max-h-[calc(92vh-5.5rem)] min-h-0">
          <nav className="w-40 shrink-0 space-y-1 border-r border-white/10 p-3">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium",
                  section === item.id
                    ? "bg-teal-500/20 text-teal-100"
                    : "text-muted-foreground hover:bg-white/5",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading engine…</p>
            ) : section === "lobby" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <LobbyVisibilityToggles game={game} onPatch={onPatchLobby} />
                </div>
                <Field label="Tag">
                  <Input value={tag} onChange={(e) => setTag(e.target.value)} className="h-9 bg-white/[0.06]" />
                </Field>
                <Field label="Volatility">
                  <Input
                    value={volatility}
                    onChange={(e) => setVolatility(e.target.value)}
                    className="h-9 bg-white/[0.06]"
                  />
                </Field>
                <Field label="Lobby RTP %">
                  <Num value={lobbyRtp} onChange={setLobbyRtp} step={0.01} min={80} max={99.5} />
                </Field>
                <Field label="Sort order">
                  <Num value={sortOrder} onChange={setSortOrder} step={1} />
                </Field>
                <Field label="Min bet (₱)">
                  <Num value={lobbyMinBet} onChange={setLobbyMinBet} step={0.01} min={0.01} />
                </Field>
                <Field label="Max bet (₱)">
                  <Num value={lobbyMaxBet} onChange={setLobbyMaxBet} step={0.01} min={0.01} />
                </Field>
                <Field label="Notes" hint="Internal superadmin notes">
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-9 bg-white/[0.06]" />
                </Field>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    disabled={lobbyBusy}
                    onClick={() => void saveLobby()}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save lobby
                  </button>
                </div>
              </div>
            ) : section === "fish" ? (
              <div className="space-y-4">
                {cfg.fishTiers.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="mb-2 text-sm font-bold text-foreground">
                      {f.label}{" "}
                      <span className="text-[10px] font-normal uppercase text-muted-foreground">
                        {f.id}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                      <Field label="Payout min">
                        <Num
                          value={f.payoutMin}
                          onChange={(n) => patchFish(f.id, { payoutMin: n })}
                          step={0.1}
                        />
                      </Field>
                      <Field label="Payout max">
                        <Num
                          value={f.payoutMax}
                          onChange={(n) => patchFish(f.id, { payoutMax: n })}
                          step={0.1}
                        />
                      </Field>
                      <Field label="Hits min">
                        <Num
                          value={f.hitsMin}
                          onChange={(n) => patchFish(f.id, { hitsMin: n })}
                          step={1}
                        />
                      </Field>
                      <Field label="Hits max">
                        <Num
                          value={f.hitsMax}
                          onChange={(n) => patchFish(f.id, { hitsMax: n })}
                          step={1}
                        />
                      </Field>
                      <Field label="Hit chance">
                        <Num
                          value={f.baseHitChance}
                          onChange={(n) => patchFish(f.id, { baseHitChance: n })}
                          step={0.001}
                          min={0.01}
                          max={1}
                        />
                      </Field>
                      <Field label="Spawn weight">
                        <Num
                          value={f.spawnWeight}
                          onChange={(n) => patchFish(f.id, { spawnWeight: n })}
                          step={1}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            ) : section === "weapons" ? (
              <div className="space-y-3">
                {cfg.weapons.map((w) => (
                  <div
                    key={w.id}
                    className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-3"
                  >
                    <div className="text-sm font-bold sm:col-span-3">{w.label}</div>
                    <Field label="Bet cost (₱)">
                      <Num
                        value={w.betCost}
                        onChange={(n) => patchWeapon(w.id, { betCost: n })}
                        step={0.01}
                      />
                    </Field>
                    <Field label="Hit modifier">
                      <Num
                        value={w.hitMod}
                        onChange={(n) => patchWeapon(w.id, { hitMod: n })}
                        step={0.01}
                        min={0.5}
                        max={2}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            ) : section === "boss" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Spawn chance / tick" hint="0–0.25">
                  <Num
                    value={cfg.boss.spawnChance}
                    onChange={(n) => patch({ boss: { ...cfg.boss, spawnChance: n } })}
                    step={0.001}
                  />
                </Field>
                <Field label="Cooldown (sec)">
                  <Num
                    value={cfg.boss.cooldownSec}
                    onChange={(n) => patch({ boss: { ...cfg.boss, cooldownSec: n } })}
                    step={1}
                  />
                </Field>
                <Field label="Duration (sec)">
                  <Num
                    value={cfg.boss.durationSec}
                    onChange={(n) => patch({ boss: { ...cfg.boss, durationSec: n } })}
                    step={1}
                  />
                </Field>
                <Field label="Finisher share" hint="Fraction of pot to finishing shot">
                  <Num
                    value={cfg.boss.finisherShare}
                    onChange={(n) => patch({ boss: { ...cfg.boss, finisherShare: n } })}
                    step={0.01}
                    min={0.1}
                    max={1}
                  />
                </Field>
                <Field label="Contributor share">
                  <Num
                    value={cfg.boss.contributorShare}
                    onChange={(n) =>
                      patch({ boss: { ...cfg.boss, contributorShare: n } })
                    }
                    step={0.01}
                    min={0}
                    max={1}
                  />
                </Field>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Target RTP %"
                  hint={`Reference band ${RTP_REFERENCE.min}–${RTP_REFERENCE.max}%`}
                >
                  <Num
                    value={cfg.rtpTarget}
                    onChange={(n) => patch({ rtpTarget: n })}
                    step={0.01}
                    min={80}
                    max={99.5}
                  />
                </Field>
                <Field label="Max hit chance cap">
                  <Num
                    value={cfg.maxHitChance}
                    onChange={(n) => patch({ maxHitChance: n })}
                    step={0.01}
                    min={0.2}
                    max={1}
                  />
                </Field>
                <Field label="Max fish on screen">
                  <Num
                    value={cfg.maxFishOnScreen}
                    onChange={(n) => patch({ maxFishOnScreen: n })}
                    step={1}
                  />
                </Field>
                <Field label="Spawn interval (sec)">
                  <Num
                    value={cfg.spawnIntervalSec}
                    onChange={(n) => patch({ spawnIntervalSec: n })}
                    step={0.1}
                  />
                </Field>
              </div>
            )}

            {section !== "lobby" ? (
              <div className="mt-4 flex justify-end border-t border-white/10 pt-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveEngine()}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : "Save engine config"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
