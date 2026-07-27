import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { assignJackpotToPlayerFn, getSuperDashboardFn, superSetJackpotFn } from "@/functions/superadmin";
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

  // Assign Player state
  const [targetUsername, setTargetUsername] = useState("");
  const [resetPoolAmount, setResetPoolAmount] = useState("10000");
  const [assigning, setAssigning] = useState(false);

  const fetchCurrentJackpot = async () => {
    try {
      const d = await getSuperDashboardFn();
      setCurrent(d.labels.jackpot);
      setAmount(String(Math.round(d.jackpot)));
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
          Manage progressive pool funds or directly award the active jackpot to a specific player.
        </p>
      </div>

      <div className={`${saGlass} p-6 text-center space-y-1`}>
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Trophy className="h-4 w-4 text-amber-400" /> Current Progressive Pool
        </div>
        <div className="mt-2 text-4xl font-black text-amber-300">{current}</div>
      </div>

      {/* Manual Pool Update */}
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

      {/* Task 4: Jackpot Assignment to Specific Player */}
      <form onSubmit={onAssignJackpot} className={`${saGlass} space-y-4 p-5 border border-amber-500/30`}>
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <UserCheck className="h-4 w-4 text-emerald-400" />
          <span>Assign Jackpot Win to Specific Player</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Directly awards the current jackpot pool to a player account and resets the progressive pool.
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
          disabled={assigning}
          className="flex items-center justify-center gap-2 h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:opacity-60"
        >
          <ShieldCheck className="h-4 w-4" />
          {assigning ? "Awarding Jackpot…" : "Award Jackpot & Reset Pool"}
        </button>
      </form>
    </div>
  );
}
