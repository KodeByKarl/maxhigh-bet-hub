import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  cleanupPlaySessionsFn,
  getPlatformSettingsFn,
  savePlatformSettingsFn,
} from "@/functions/superadmin";
import type { PlatformSettingsData } from "@/lib/superadmin-types";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { saGlass } from "@/components/superadmin/ui/glass";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DatabaseZap, Save, Settings, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/superadmin/settings")({
  component: SuperSettingsPage,
});

function SuperSettingsPage() {
  const { user, isReady } = useAuth();
  const [form, setForm] = useState<PlatformSettingsData>({
    maintenanceMode: false,
    announcementBanner: "Welcome to MaxHigh Casino! Instant payouts and 24/7 support available.",
    minDeposit: 100,
    maxDeposit: 50000,
    minWithdraw: 200,
    maxWithdraw: 100000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    let cancelled = false;
    getPlatformSettingsFn()
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
      const updated = await savePlatformSettingsFn({ data: form });
      setForm(updated);
      toast.success("Platform settings saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleCleanup(dryRun: boolean) {
    setCleaning(true);
    try {
      const result = await cleanupPlaySessionsFn({
        data: { dryRun },
      });
      const msg = `${dryRun ? "Dry-run" : "Cleanup"}: closed ${result.dedupedClosed + result.staleClosed} (dedupe ${result.dedupedClosed}, stale ${result.staleClosed}), purged ${result.purged}`;
      setLastCleanup(msg);
      toast.success(msg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Play session cleanup failed");
    } finally {
      setCleaning(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading platform settings…</div>;
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-3xl">System Settings</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Global platform settings, maintenance locks, deposit/withdrawal thresholds, and player banners.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <div className={`${saGlass} p-6 space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Maintenance & Status</h2>
              <p className="text-xs text-muted-foreground">Toggle platform-wide maintenance locks.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-white/[0.04] p-4">
            <div>
              <div className="text-sm font-semibold text-foreground">Maintenance Mode</div>
              <div className="text-xs text-muted-foreground">
                Lock game plays and deposit operations globally.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
              className={[
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                form.maintenanceMode ? "bg-amber-500" : "bg-white/20",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-4 w-4 transform rounded-full bg-black transition-transform",
                  form.maintenanceMode ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Announcement Banner</label>
            <Input
              value={form.announcementBanner}
              onChange={(e) => setForm((prev) => ({ ...prev, announcementBanner: e.target.value }))}
              placeholder="Header marquee text for players…"
              className="h-11 border-amber-500/20 bg-white/[0.06] text-foreground"
            />
          </div>
        </div>

        <div className={`${saGlass} p-6 space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Deposit & Withdrawal Limits</h2>
              <p className="text-xs text-muted-foreground">Minimum and maximum transaction thresholds in PHP (₱).</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Min Deposit (₱)</label>
              <Input
                type="number"
                value={form.minDeposit}
                onChange={(e) => setForm((prev) => ({ ...prev, minDeposit: Number(e.target.value) }))}
                className="h-11 border-amber-500/20 bg-white/[0.06] text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Max Deposit (₱)</label>
              <Input
                type="number"
                value={form.maxDeposit}
                onChange={(e) => setForm((prev) => ({ ...prev, maxDeposit: Number(e.target.value) }))}
                className="h-11 border-amber-500/20 bg-white/[0.06] text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Min Withdrawal (₱)</label>
              <Input
                type="number"
                value={form.minWithdraw}
                onChange={(e) => setForm((prev) => ({ ...prev, minWithdraw: Number(e.target.value) }))}
                className="h-11 border-amber-500/20 bg-white/[0.06] text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Max Withdrawal (₱)</label>
              <Input
                type="number"
                value={form.maxWithdraw}
                onChange={(e) => setForm((prev) => ({ ...prev, maxWithdraw: Number(e.target.value) }))}
                className="h-11 border-amber-500/20 bg-white/[0.06] text-foreground"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? "Saving…" : "Save Platform Settings"}
        </button>
      </form>

      <div className={`${saGlass} p-6 space-y-4 max-w-3xl`}>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
            <DatabaseZap size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Play Sessions Cleanup</h2>
            <p className="text-xs text-muted-foreground">
              Close abandoned opens (24h, no free spins), dedupe open rows, delete closed sessions older than 30 days.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={cleaning}
            onClick={() => void handleCleanup(true)}
            className="inline-flex h-10 items-center rounded-xl border border-amber-500/30 bg-white/[0.04] px-4 text-sm font-semibold text-foreground hover:bg-white/[0.08] disabled:opacity-50"
          >
            {cleaning ? "Running…" : "Dry run"}
          </button>
          <button
            type="button"
            disabled={cleaning}
            onClick={() => void handleCleanup(false)}
            className="inline-flex h-10 items-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {cleaning ? "Running…" : "Run cleanup"}
          </button>
        </div>
        {lastCleanup ? <p className="text-xs text-muted-foreground">{lastCleanup}</p> : null}
      </div>
    </div>
  );
}
