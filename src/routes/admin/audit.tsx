import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listAdminAuditLogsFn, listAdminTransactionsFn } from "@/functions/admin";
import { AuditLogsTable } from "@/components/admin/audit/AuditLogsTable";
import { TransactionsTable } from "@/components/admin/audit/TransactionsTable";
import type { AdminAuditLogRow, AdminTransactionRow } from "@/lib/admin-types";
import { useAuth } from "@/lib/auth";
import { isStaffRole } from "@/lib/user";
import { Input } from "@/components/ui/input";
import { adminGlass } from "@/components/admin/ui/glass";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAuditPage,
});

type Tab = "ledger" | "staff";

const TX_FILTERS = [
  { value: "all", label: "All types" },
  { value: "bet", label: "Bets / Losses" },
  { value: "win", label: "Wins" },
  { value: "adjust", label: "Adjustments" },
  { value: "deposit", label: "Deposits" },
  { value: "withdraw", label: "Withdrawals" },
  { value: "jackpot", label: "Jackpot" },
] as const;

const STAFF_FILTERS = [
  { value: "", label: "All actions" },
  { value: "admin.login", label: "Admin login" },
  { value: "user.create", label: "User create" },
  { value: "user.balance_adjust", label: "Balance adjust" },
  { value: "wallet.approve", label: "Fund approve" },
  { value: "wallet.reject", label: "Fund reject" },
  { value: "game.session_open", label: "Game open (Play Now)" },
];

function AdminAuditPage() {
  const { user, isReady } = useAuth();
  const [tab, setTab] = useState<Tab>("ledger");
  const [q, setQ] = useState("");
  const [txType, setTxType] = useState<(typeof TX_FILTERS)[number]["value"]>("all");
  const [staffAction, setStaffAction] = useState("");
  const [txs, setTxs] = useState<AdminTransactionRow[]>([]);
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "ledger") {
        const rows = await listAdminTransactionsFn({
          data: {
            q: q || undefined,
            type: txType,
            limit: 300,
          },
        });
        setTxs(rows);
      } else {
        const rows = await listAdminAuditLogsFn({
          data: {
            q: q || undefined,
            action: staffAction || undefined,
            limit: 200,
            scope: "system",
          },
        });
        setLogs(rows);
      }
    } catch {
      if (tab === "ledger") setTxs([]);
      else setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [tab, q, txType, staffAction]);

  useEffect(() => {
    if (!isReady || !user || !isStaffRole(user.role)) return;
    void load();
  }, [isReady, user, load]);

  // Auto-refresh player ledger every 8s so live play shows up
  useEffect(() => {
    if (!isReady || !user || !isStaffRole(user.role) || tab !== "ledger") return;
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [isReady, user, tab, load]);

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Reports</h1>
        <p className="mt-1.5 text-sm text-white/45">
          Win/Lose ledger and staff actions — same idea as Transaction History in agent panels.
        </p>
      </div>

      <div className={`${adminGlass} flex flex-wrap gap-2 p-2`}>
        <button
          type="button"
          onClick={() => setTab("ledger")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            tab === "ledger"
              ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]"
              : "text-white/50 hover:bg-white/[0.05] hover:text-white"
          }`}
        >
          Win/Lose
        </button>
        <button
          type="button"
          onClick={() => setTab("staff")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            tab === "staff"
              ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]"
              : "text-white/50 hover:bg-white/[0.05] hover:text-white"
          }`}
        >
          Staff actions
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === "ledger" ? "Search player, game, note…" : "Search actor or summary…"}
          className="h-11 max-w-md rounded-xl border-white/10 bg-white/[0.04] text-white"
        />
        {tab === "ledger" ? (
          <select
            value={txType}
            onChange={(e) => setTxType(e.target.value as typeof txType)}
            className="h-11 rounded-xl border border-white/10 bg-[#12101C] px-3 text-sm text-white"
          >
            {TX_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={staffAction}
            onChange={(e) => setStaffAction(e.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-[#12101C] px-3 text-sm text-white"
          >
            {STAFF_FILTERS.map((f) => (
              <option key={f.value || "all"} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white hover:bg-white/[0.08] disabled:opacity-60"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {tab === "ledger" ? (
        <>
          <p className="text-xs text-white/40">
            <span className="text-rose-300">Bet / Loss</span> = stake deducted ·{" "}
            <span className="text-emerald-300">Win</span> = payout credited · auto-refreshes while open
          </p>
          <TransactionsTable rows={txs} />
        </>
      ) : (
        <AuditLogsTable logs={logs} />
      )}
    </div>
  );
}
