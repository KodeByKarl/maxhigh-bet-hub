import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { getSuperDashboardFn, superSetJackpotFn } from "@/functions/superadmin";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { Input } from "@/components/ui/input";
import { saGlass } from "@/components/superadmin/ui/glass";
import { toast } from "sonner";

export const Route = createFileRoute("/superadmin/jackpot")({
  component: SuperJackpotPage,
});

function SuperJackpotPage() {
  const { user, isReady } = useAuth();
  const [current, setCurrent] = useState<string>("—");
  const [amount, setAmount] = useState("10000");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isReady || !user || !isSuperadminRole(user.role)) return;
    getSuperDashboardFn()
      .then((d) => {
        setCurrent(d.labels.jackpot);
        setAmount(String(Math.round(d.jackpot)));
      })
      .catch(() => undefined);
  }, [isReady, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await superSetJackpotFn({ data: { amount: Number(amount) } });
      setCurrent(
        `₱${res.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      );
      toast.success("Jackpot updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mega Jackpot</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set the displayed progressive pool for the casino.</p>
      </div>

      <div className={`${saGlass} p-6 text-center`}>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Current</div>
        <div className="mt-2 text-4xl font-black text-amber-300">{current}</div>
      </div>

      <form onSubmit={onSubmit} className={`${saGlass} space-y-4 p-5`}>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          New amount (₱)
          <Input
            type="number"
            min={0}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2 h-12 rounded-xl bg-white/[0.06] text-foreground"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-black disabled:opacity-60"
        >
          {busy ? "Saving…" : "Update jackpot"}
        </button>
      </form>
    </div>
  );
}
