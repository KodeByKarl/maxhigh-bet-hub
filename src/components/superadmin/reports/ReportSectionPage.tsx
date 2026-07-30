import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import {
  getWinLoseByLevelFn,
  getWinLoseByProductFn,
  getWinLoseSummaryFn,
  listAdminTransactionsFn,
  listAdminWalletRequestsFn,
  reviewAdminWalletRequestFn,
} from "@/functions/admin";
import { TransactionsTable } from "@/components/admin/audit/TransactionsTable";
import { ReportPageHeader, ReportSubnav, type ReportSection } from "./ReportNav";
import type {
  AdminTransactionRow,
  WinLoseByLevelRow,
  WinLoseByProductRow,
  WinLoseSummary,
} from "@/lib/admin-types";
import type { SuperWalletRequestRow } from "@/lib/superadmin-types";
import { formatMoney } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { saGlass } from "@/components/superadmin/ui/glass";
import { toast } from "sonner";

const META: Record<ReportSection, { title: string; blurb: string }> = {
  winlose: {
    title: "Win/Lose",
    blurb: "Game bets, wins, and jackpots only — deposits and withdrawals are excluded.",
  },
  "by-level": {
    title: "Win/Lose By Level",
    blurb: "Per-player bet vs win totals (game activity only).",
  },
  "by-product": {
    title: "Win/Lose By Product",
    blurb: "Bet vs win totals grouped by game / product.",
  },
  transactions: {
    title: "Transaction History",
    blurb: "Deposit and withdraw records only (approved fund movements).",
  },
  outstanding: {
    title: "Outstanding",
    blurb: "Pending deposit and withdraw requests — approve or reject here.",
  },
  "chip-distribution": {
    title: "Chip Distribution Log",
    blurb: "Audit log of all chip allocations transferred from Super Admin to Admin / Staff accounts.",
  },
};

export function ReportSectionPage({
  view,
  enabled,
  prefix = "/superadmin",
}: {
  view: ReportSection;
  enabled: boolean;
  prefix?: "/superadmin" | "/admin";
}) {
  const meta = META[view];

  return (
    <div className="space-y-5 pb-6">
      <ReportPageHeader title={meta.title} blurb={meta.blurb} />
      <ReportSubnav active={view} prefix={prefix} />

      {view === "winlose" && <WinLosePanel enabled={enabled} />}
      {view === "by-level" && <ByLevelPanel enabled={enabled} />}
      {view === "by-product" && <ByProductPanel enabled={enabled} />}
      {view === "transactions" && <FundHistoryPanel enabled={enabled} />}
      {view === "outstanding" && <OutstandingPanel enabled={enabled} />}
      {view === "chip-distribution" && <ChipDistributionPanel enabled={enabled} />}
    </div>
  );
}

function WinLosePanel({ enabled }: { enabled: boolean }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<WinLoseSummary | null>(null);
  const [rows, setRows] = useState<AdminTransactionRow[]>([]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [s, txs] = await Promise.all([
        getWinLoseSummaryFn(),
        listAdminTransactionsFn({
          data: { q: q || undefined, type: "game", limit: 300 },
        }),
      ]);
      setSummary(s);
      setRows(txs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load Win/Lose");
      setSummary(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Toolbar q={q} setQ={setQ} onRefresh={() => void load()} placeholder="Search player or game…" />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Bet volume" value={formatMoney(summary.betVolume)} sub={`${summary.betCount} bets`} />
          <StatCard label="Win volume" value={formatMoney(summary.winVolume)} sub={`${summary.winCount} wins`} />
          <StatCard
            label="Net (win − bet)"
            value={formatMoney(summary.net)}
            sub={summary.net >= 0 ? "Player ahead" : "House ahead"}
            tone={summary.net >= 0 ? "text-emerald-400" : "text-rose-400"}
          />
        </div>
      )}
      {!loading && <TransactionsTable rows={rows} />}
    </>
  );
}

function ByLevelPanel({ enabled }: { enabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<WinLoseByLevelRow[]>([]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setRows(await getWinLoseByLevelFn({ data: { limit: 300 } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <button
        type="button"
        onClick={() => void load()}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-500/20 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]"
      >
        <RefreshCw size={14} />
        Refresh
      </button>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && (
        <Empty>No player win/lose data yet. Play games to populate this report.</Empty>
      )}
      {!loading && rows.length > 0 && (
        <div className={`${saGlass} overflow-x-auto`}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-amber-500/20 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Bets</th>
                <th className="px-4 py-3">Bet volume</th>
                <th className="px-4 py-3">Wins</th>
                <th className="px-4 py-3">Win volume</th>
                <th className="px-4 py-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b border-white/[0.06]">
                  <td className="px-4 py-3 font-semibold text-foreground">@{r.username}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{r.betCount}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{formatMoney(r.betVolume)}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{r.winCount}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{formatMoney(r.winVolume)}</td>
                  <td
                    className={`px-4 py-3 font-semibold tabular-nums ${
                      r.net >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {r.net >= 0 ? "+" : ""}
                    {formatMoney(r.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ByProductPanel({ enabled }: { enabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<WinLoseByProductRow[]>([]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setRows(await getWinLoseByProductFn({ data: { limit: 100 } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <button
        type="button"
        onClick={() => void load()}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-500/20 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]"
      >
        <RefreshCw size={14} />
        Refresh
      </button>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && (
        <Empty>No product win/lose data yet.</Empty>
      )}
      {!loading && rows.length > 0 && (
        <div className={`${saGlass} overflow-x-auto`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-amber-500/20 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Bets</th>
                <th className="px-4 py-3">Bet volume</th>
                <th className="px-4 py-3">Wins</th>
                <th className="px-4 py-3">Win volume</th>
                <th className="px-4 py-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.product} className="border-b border-white/[0.06]">
                  <td className="px-4 py-3 font-semibold text-foreground">{r.product}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{r.betCount}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{formatMoney(r.betVolume)}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{r.winCount}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{formatMoney(r.winVolume)}</td>
                  <td
                    className={`px-4 py-3 font-semibold tabular-nums ${
                      r.net >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {r.net >= 0 ? "+" : ""}
                    {formatMoney(r.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function FundHistoryPanel({ enabled }: { enabled: boolean }) {
  const [q, setQ] = useState("");
  const [fundType, setFundType] = useState<"fund" | "deposit" | "withdraw">("fund");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AdminTransactionRow[]>([]);
  const [summary, setSummary] = useState<WinLoseSummary | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [txs, s] = await Promise.all([
        listAdminTransactionsFn({
          data: { q: q || undefined, type: fundType, limit: 300 },
        }),
        getWinLoseSummaryFn(),
      ]);
      setRows(txs);
      setSummary(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load history");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, q, fundType]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {([
          { id: "fund" as const, label: "All" },
          { id: "deposit" as const, label: "Deposit" },
          { id: "withdraw" as const, label: "Withdraw" },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFundType(t.id)}
            className={[
              "h-10 rounded-xl px-3 text-sm font-semibold transition-colors",
              fundType === t.id
                ? "bg-amber-500 text-black"
                : "border border-amber-500/20 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
        <Toolbar q={q} setQ={setQ} onRefresh={() => void load()} placeholder="Search player…" />
      </div>

      {!loading && summary && (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Total deposits" value={formatMoney(summary.depositVolume)} sub="Fund in" tone="text-emerald-400" />
          <StatCard label="Total withdrawals" value={formatMoney(summary.withdrawVolume)} sub="Fund out" tone="text-rose-400" />
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && <TransactionsTable rows={rows} />}
    </>
  );
}

function OutstandingPanel({ enabled }: { enabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rows, setRows] = useState<SuperWalletRequestRow[]>([]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setRows(await listAdminWalletRequestsFn({ data: { status: "pending", limit: 100 } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    try {
      await reviewAdminWalletRequestFn({ data: { id, decision } });
      toast.success(decision === "approve" ? "Approved" : "Rejected");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void load()}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-500/20 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]"
      >
        <RefreshCw size={14} />
        Refresh
      </button>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && <Empty>No outstanding requests. All clear.</Empty>}
      {!loading && rows.length > 0 && (
        <div className={`${saGlass} overflow-x-auto`}>
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-amber-500/20 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.06]">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("en-PH")}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">@{r.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        r.type === "deposit"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {r.type === "deposit" ? "Deposit" : "Withdraw"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                    {formatMoney(r.amount)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatMoney(r.balance)}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs text-muted-foreground">
                    {r.playerNote ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void review(r.id, "approve")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        <Check size={12} />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void review(r.id, "reject")}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
                      >
                        <X size={12} />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Toolbar({
  q,
  setQ,
  onRefresh,
  placeholder,
}: {
  q: string;
  setQ: (v: string) => void;
  onRefresh: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="h-11 max-w-md rounded-xl border-amber-500/20 bg-white/[0.06] text-foreground"
      />
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-500/20 px-4 text-sm font-semibold text-foreground hover:bg-white/[0.06]"
      >
        <RefreshCw size={14} />
        Refresh
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
}) {
  return (
    <div className={`${saGlass} p-4`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${tone ?? "text-foreground"}`}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className={`${saGlass} p-8 text-center text-sm text-muted-foreground`}>{children}</div>;
}

function ChipDistributionPanel({ enabled }: { enabled: boolean }) {
  const [adminUsername, setAdminUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      actorUsername: string;
      targetId: string | null;
      targetUsername: string;
      amount: number;
      runningBalance: number;
      summary: string;
      createdAt: string;
    }>
  >([]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { listChipDistributionLogsFn } = await import("@/functions/superadmin");
      setLogs(await listChipDistributionLogsFn({ data: { adminUsername: adminUsername || undefined, limit: 300 } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load distribution logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, adminUsername]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Toolbar
        q={adminUsername}
        setQ={setAdminUsername}
        onRefresh={() => void load()}
        placeholder="Filter by Admin username..."
      />

      {loading && <p className="text-sm text-muted-foreground">Loading distribution history...</p>}

      {!loading && logs.length === 0 && (
        <Empty>No chip transfers recorded yet. Transfer chips to admins from the Admins Management page.</Empty>
      )}

      {!loading && logs.length > 0 && (
        <div className={`${saGlass} overflow-x-auto`}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-amber-500/20 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Allocated By (Super Admin)</th>
                <th className="px-4 py-3">Recipient Staff / Admin</th>
                <th className="px-4 py-3">Amount Transferred</th>
                <th className="px-4 py-3">Admin Running Balance</th>
                <th className="px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.06]">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("en-PH")}
                  </td>
                  <td className="px-4 py-3 font-semibold text-amber-300">@{r.actorUsername}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">@{r.targetUsername}</td>
                  <td className="px-4 py-3 font-bold tabular-nums text-emerald-400">
                    +{formatMoney(r.amount)}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                    {formatMoney(r.runningBalance)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
