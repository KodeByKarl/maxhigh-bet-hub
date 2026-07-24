import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { getRiskControlsFn, saveRiskControlsFn } from "@/functions/superadmin";
import type { RiskControlData } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { saGlass } from "@/components/superadmin/ui/glass";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle, Lock, Save, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/superadmin/risk")({
  component: SuperRiskPage,
});

function SuperRiskPage() {
  const { user, isReady } = useAuth();
  const [form, setForm] = useState<RiskControlData>({
    maxSingleBet: 10000,
    maxDailyPayout: 500000,
    autoFlagLargeWins: true,
    largeWinThreshold: 50000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    let cancelled = false;
    getRiskControlsFn()
      .then((data) => {
        if (!cancelled) {
          setForm(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await saveRiskControlsFn({ data: form });
      setForm(updated);
      toast.success("Risk control parameters updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save risk settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading risk controls…</div>;
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Risk Management & Fraud Control</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure maximum wager caps, payout limits, automated win triggers, and fraud detection.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <div className={`${saGlass} p-6 space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Wagering & Payout Limits</h2>
              <p className="text-xs text-muted-foreground">Enforce system-wide cap rules per player transaction.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Max Single Bet Limit (₱)</label>
              <Input
                type="number"
                value={form.maxSingleBet}
                onChange={(e) => setForm((prev) => ({ ...prev, maxSingleBet: Number(e.target.value) }))}
                className="h-11 border-amber-500/20 bg-white/[0.06] text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Max Daily Payout Limit (₱)</label>
              <Input
                type="number"
                value={form.maxDailyPayout}
                onChange={(e) => setForm((prev) => ({ ...prev, maxDailyPayout: Number(e.target.value) }))}
                className="h-11 border-amber-500/20 bg-white/[0.06] text-foreground"
              />
            </div>
          </div>
        </div>

        <div className={`${saGlass} p-6 space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Automated Fraud Detection</h2>
              <p className="text-xs text-muted-foreground">Automatically trigger review flags on abnormal user events.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-white/[0.04] p-4">
            <div>
              <div className="text-sm font-semibold text-foreground">Auto-Flag Large Wins</div>
              <div className="text-xs text-muted-foreground">
                Automatically flag accounts for audit when winning above the threshold.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, autoFlagLargeWins: !prev.autoFlagLargeWins }))}
              className={[
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                form.autoFlagLargeWins ? "bg-amber-500" : "bg-white/20",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-4 w-4 transform rounded-full bg-black transition-transform",
                  form.autoFlagLargeWins ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Large Win Flag Threshold (₱)</label>
            <Input
              type="number"
              value={form.largeWinThreshold}
              onChange={(e) => setForm((prev) => ({ ...prev, largeWinThreshold: Number(e.target.value) }))}
              className="h-11 border-amber-500/20 bg-white/[0.06] text-foreground"
            />
          </div>
        </div>

        <div className={`${saGlass} p-5 flex items-center justify-between`}>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <ShieldCheck size={16} />
            Risk engine active and protecting platform operations
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "Saving…" : "Save Risk Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
