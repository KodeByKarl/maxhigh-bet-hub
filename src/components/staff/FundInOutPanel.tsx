import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, Check, Plus, RefreshCw, X } from "lucide-react";
import {
  listAdminWalletRequestsFn,
  reviewAdminWalletRequestFn,
} from "@/functions/admin";
import type { SuperWalletRequestRow } from "@/lib/superadmin-types";
import { formatMoney } from "@/lib/currency";
import { toast } from "sonner";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

type Props = {
  /** When false, skip loading (auth not ready / not staff). */
  enabled: boolean;
  /** Panel surface class (adminGlass / saGlass). */
  panelClass: string;
  /** Active filter pill classes */
  activeFilterClass?: string;
  inactiveFilterClass?: string;
  refreshBtnClass?: string;
  rejectBtnClass?: string;
};

export function FundInOutPanel({
  enabled,
  panelClass,
  activeFilterClass = "bg-amber-500 text-black",
  inactiveFilterClass = "bg-white/[0.06] text-muted-foreground hover:bg-white/10 hover:text-foreground",
  refreshBtnClass = "inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-muted-foreground hover:bg-white/10 hover:text-foreground",
  rejectBtnClass = "inline-flex h-9 items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/10 disabled:opacity-50",
}: Props) {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [rows, setRows] = useState<SuperWalletRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await listAdminWalletRequestsFn({ data: { status, limit: 100 } });
      setRows(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    try {
      await reviewAdminWalletRequestFn({ data: { id, decision } });
      toast.success(decision === "approve" ? "Approved — balance updated" : "Request rejected");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fund In/Out</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review player deposit (add chips) and withdrawal (cash out) requests.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className={refreshBtnClass}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
            ["all", "All"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatus(id)}
            className={[
              "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
              status === id ? activeFilterClass : inactiveFilterClass,
            ].join(" ")}
          >
            {label}
            {id === "pending" && status === "pending" && !loading ? (
              <span className="ml-1.5 tabular-nums">({pendingCount})</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className={`${panelClass} overflow-hidden`}>
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No {status === "all" ? "" : status} requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Login name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Balance</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const busy = busyId === r.id;
                  const isDeposit = r.type === "deposit";
                  return (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {r.displayName || r.username}
                        </div>
                        <div className="text-xs text-muted-foreground">@{r.username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                            isDeposit
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-sky-500/15 text-sky-300 border border-sky-500/30",
                          ].join(" ")}
                        >
                          {isDeposit ? <Plus size={12} strokeWidth={3} /> : <ArrowDownToLine size={12} />}
                          {isDeposit ? "Fund in" : "Fund out"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black tabular-nums text-foreground">
                        {formatMoney(r.amount)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {formatMoney(r.balance)}
                      </td>
                      <td className="max-w-[12rem] px-4 py-3 text-xs text-muted-foreground">
                        <div className="truncate" title={r.playerNote ?? undefined}>
                          {r.playerNote || "—"}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "pending" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void review(r.id, "approve")}
                              className="inline-flex h-9 items-center gap-1 rounded-full bg-emerald-500 px-3 text-[11px] font-bold uppercase tracking-wider text-black disabled:opacity-50"
                            >
                              <Check size={14} />
                              {isDeposit ? "Add chips" : "Cash out"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void review(r.id, "reject")}
                              className={rejectBtnClass}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SuperWalletRequestRow["status"] }) {
  const styles =
    status === "pending"
      ? "bg-amber-500/20 text-amber-300"
      : status === "approved"
        ? "bg-emerald-500/20 text-emerald-400"
        : "bg-rose-500/20 text-rose-400";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles}`}>
      {status}
    </span>
  );
}
