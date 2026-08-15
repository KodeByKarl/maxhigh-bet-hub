import { useEffect, useState } from "react";
import { Save, Settings2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_CRYSTAL_CAVE_CONFIG,
  normalizeCrystalCaveConfig,
  type CrystalCaveConfig,
} from "@/lib/crystal-cave-config";
import {
  getCrystalCaveEngineConfigFn,
  saveCrystalCaveEngineConfigFn,
} from "@/functions/superadmin";
import type { SuperGameRow } from "@/lib/superadmin-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function CrystalCaveConfigModal({ game, open, onOpenChange, onPatchLobby }: Props) {
  const [cfg, setCfg] = useState<CrystalCaveConfig>(() =>
    structuredClone(DEFAULT_CRYSTAL_CAVE_CONFIG),
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void getCrystalCaveEngineConfigFn()
      .then((c) => setCfg(normalizeCrystalCaveConfig(c)))
      .catch(() => {
        toast.error("Failed loading config — defaults");
        setCfg(structuredClone(DEFAULT_CRYSTAL_CAVE_CONFIG));
      })
      .finally(() => setLoading(false));
  }, [open]);

  function patch(p: Partial<CrystalCaveConfig>) {
    setCfg((c) => normalizeCrystalCaveConfig({ ...c, ...p }));
  }

  async function save() {
    setSaving(true);
    try {
      const next = await saveCrystalCaveEngineConfigFn({
        data: { config: normalizeCrystalCaveConfig(cfg) },
      });
      setCfg(normalizeCrystalCaveConfig(next));
      toast.success("Crystal Cave engine saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[min(100%-1rem,40rem)] flex-col gap-0 overflow-hidden border-amber-500/20 bg-panel p-0">
        <div className="relative h-28 shrink-0 overflow-hidden">
          <img src={game.thumb} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16120F] to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-foreground">
                <Settings2 size={18} className="text-amber-400" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Diamond 3-4-5-4-3 · 720 ways · Hold & Win · Free Spins — {game.gameId}
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onPatchLobby({ enabled: !game.enabled })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    game.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400",
                  )}
                >
                  {game.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => void onPatchLobby({ featured: !game.featured })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    game.featured ? "bg-amber-500/20 text-amber-300" : "bg-white/[0.06] text-muted-foreground",
                  )}
                >
                  {game.featured ? "Featured" : "Not featured"}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Target RTP %
                  <Num value={cfg.targetRtp} onChange={(n) => patch({ targetRtp: n })} step={0.01} min={80} max={99} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Max win ×
                  <Num value={cfg.maxWinMult} onChange={(n) => patch({ maxWinMult: n })} step={1} min={0} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  FS base count
                  <Num value={cfg.freeSpinsBaseCount} onChange={(n) => patch({ freeSpinsBaseCount: n })} step={1} min={1} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Scatter trigger
                  <Num value={cfg.freeSpinsTriggerCount} onChange={(n) => patch({ freeSpinsTriggerCount: n })} step={1} min={2} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Hold & Win coin trigger
                  <Num value={cfg.holdWinTriggerCount} onChange={(n) => patch({ holdWinTriggerCount: n })} step={1} min={3} max={15} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Hold & Win respins
                  <Num value={cfg.holdWinRespins} onChange={(n) => patch({ holdWinRespins: n })} step={1} min={1} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  H&W coin chance %
                  <Num
                    value={+(cfg.holdWinCoinChance * 100).toFixed(1)}
                    onChange={(n) => patch({ holdWinCoinChance: n / 100 })}
                    step={0.5}
                    min={0}
                    max={100}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  H&W jackpot coin %
                  <Num
                    value={+((cfg.holdWinJackpotChance ?? 0.02) * 100).toFixed(1)}
                    onChange={(n) => patch({ holdWinJackpotChance: n / 100 })}
                    step={0.1}
                    min={0}
                    max={100}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                  Buy feature ×
                  <Num value={cfg.buyFeatureMult} onChange={(n) => patch({ buyFeatureMult: n })} step={1} min={1} />
                </label>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Jackpots Mini/Minor/Major/Grand and coin value weights are stored in engine JSON
                (edit via save after adjusting defaults in code / future advanced editor).
              </p>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-amber-500/20 p-3">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void save()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-black uppercase text-black disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save engine"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
