import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  assignJackpotToPlayerFn,
  getSuperDashboardFn,
  superSetJackpotEnabledFn,
  superSetJackpotFn,
  superSetUltraMegaJackpotFn,
} from "@/functions/superadmin";
import { useAuth } from "@/lib/auth";
import { isStaffRole } from "@/lib/user";
import { Input } from "@/components/ui/input";
import { saGlass } from "@/components/superadmin/ui/glass";
import { toast } from "sonner";
import { Trophy, UserCheck, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/superadmin/jackpot")({
  component: SuperJackpotPage,
});

function SuperJackpotPage() {
  const { user, isReady } = useAuth();
  const [current, setCurrent] = useState<string>("—");
  const [amount, setAmount] = useState("10000");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [ultraAmount, setUltraAmount] = useState("500000000");
  const [ultraBusy, setUltraBusy] = useState(false);
  const [ultraLabel, setUltraLabel] = useState("—");

  const [targetUsername, setTargetUsername] = useState("");
  const [resetPoolAmount, setResetPoolAmount] = useState("10000");
  const [assigning, setAssigning] = useState(false);

  const fetchCurrentJackpot = async () => {
    try {
      const d = await getSuperDashboardFn();
      setCurrent(d.labels.jackpot);
      setAmount(String(Math.round(d.jackpot)));
      setEnabled(d.jackpotEnabled !== false);
      setUltraLabel(d.labels.ultraMegaJackpot ?? "—");
      setUltraAmount(String(Math.round(d.ultraMegaJackpot ?? 0)));
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!isReady || !user || !isStaffRole(user.role)) return;
    void fetchCurrentJackpot();
  }, [isReady, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await superSetJackpotFn({ data: { amount: Number(amount) } });
      setCurrent(
        `₱${res.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      );
      toast.success("Jackpot pool updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleEnabled() {
    const next = !enabled;
    setToggling(true);
    try {
      await superSetJackpotEnabledFn({ data: { enabled: next } });
      setEnabled(next);
      toast.success(`Mega Jackpot ${next ? "ON" : "OFF"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update toggle");
    } finally {
      setToggling(false);
    }
  }

  async function onUltraSubmit(e: FormEvent) {
    e.preventDefault();
    setUltraBusy(true);
    try {
      const res = await superSetUltraMegaJackpotFn({ data: { amount: Number(ultraAmount) } });
      setUltraLabel(
        `₱${res.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      );
      toast.success("Ultra Mega Jackpot display updated (cosmetic only)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setUltraBusy(false);
    }
  }

  async function onAssignJackpot(e: FormEvent) {
    e.preventDefault();
    if (!targetUsername.trim()) {
      toast.error("Please enter a target player username");
      return;
    }
    setAssigning(true);
    try {
      const result = await assignJackpotToPlayerFn({
        data: {
          username: targetUsername.trim(),
          resetAmount: Number(resetPoolAmount) || 10000,
        },
      });
      toast.success(
        `Successfully awarded Mega Jackpot (₱${result.amountAwarded.toLocaleString("en-PH")}) to player @${result.playerUsername}!`,
      );
      setTargetUsername("");
      await fetchCurrentJackpot();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-6">
      <div>
        <h1 className="text-3xl font-black text-foreground">Mega Jackpot Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage progressive pool funds, win eligibility, and the Player Board display amount.
        </p>
      </div>

      <div className={`${saGlass} p-6 text-center space-y-3`}>
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Trophy className="h-4 w-4 text-amber-400" /> Current Progressive Pool
        </div>
        <div className="mt-2 text-4xl font-black text-amber-300">{current}</div>
        <div className="flex items-center justify-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
              enabled
                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "border border-rose-500/40 bg-rose-500/15 text-rose-300"
            }`}
          >
            Mega Jackpot: {enabled ? "ON" : "OFF"}
          </span>
          <button
            type="button"
            disabled={toggling}
            onClick={() => void onToggleEnabled()}
            className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-60 ${
              enabled ? "bg-emerald-500" : "bg-white/20"
            }`}
            aria-pressed={enabled}
            aria-label="Toggle Mega Jackpot"
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                enabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
        {!enabled && (
          <p className="text-[11px] text-rose-300">
            When Off, Mega Jackpot cannot be won or assigned — even if win criteria are met.
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className={`${saGlass} space-y-4 p-5`}>
        <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Set Pool Amount (₱)
          <Input
            type="number"
            min={0}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2 h-11 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Update Pool Amount"}
        </button>
      </form>

      <form onSubmit={onUltraSubmit} className={`${saGlass} space-y-4 p-5 border border-violet-500/30`}>
        <div className="text-sm font-bold text-foreground">Ultra Mega Jackpot (Display Only)</div>
        <p className="text-xs text-muted-foreground">
          Cosmetic amount shown on the Player Board. Not winnable and not tied to payout logic.
        </p>
        <div className="text-2xl font-black text-violet-300">{ultraLabel}</div>
        <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Display Amount (₱)
          <Input
            type="number"
            min={0}
            step="1"
            required
            value={ultraAmount}
            onChange={(e) => setUltraAmount(e.target.value)}
            className="mt-2 h-11 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>
        <button
          type="submit"
          disabled={ultraBusy}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 text-xs font-black uppercase tracking-wider text-white hover:brightness-110 disabled:opacity-60"
        >
          {ultraBusy ? "Saving…" : "Update Ultra Mega Display"}
        </button>
      </form>

      <form onSubmit={onAssignJackpot} className={`${saGlass} space-y-4 p-5 border border-amber-500/30`}>
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <UserCheck className="h-4 w-4 text-emerald-400" />
          <span>Assign Jackpot Win to Specific Player</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Directly awards the current jackpot pool to a player account and resets the progressive pool.
          Disabled when Mega Jackpot is Off.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Target Player Username
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. player123"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              className="mt-1.5 h-11 rounded-xl bg-white/[0.06] text-foreground"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Reset Jackpot Pool To (₱)
            </label>
            <Input
              type="number"
              min={0}
              step="100"
              required
              value={resetPoolAmount}
              onChange={(e) => setResetPoolAmount(e.target.value)}
              className="mt-1.5 h-11 rounded-xl bg-white/[0.06] text-foreground"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={assigning || !enabled}
          className="flex items-center justify-center gap-2 h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-60"
        >
          <ShieldCheck className="h-4 w-4" />
          {assigning ? "Awarding Jackpot…" : "Award Jackpot & Reset Pool"}
        </button>
      </form>
    </div>
  );
}
