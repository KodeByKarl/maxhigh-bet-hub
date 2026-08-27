import { formatMoney } from "@/lib/currency";
import { formatDateTimePH } from "@/lib/datetime";
import type { AdminTransactionRow } from "@/lib/admin-types";

function typeTone(type: AdminTransactionRow["type"]) {
  if (type === "win" || type === "jackpot") return "bg-emerald-500/15 text-emerald-400";
  if (type === "bet") return "bg-rose-500/15 text-rose-400";
  if (type === "adjust") return "bg-amber-500/15 text-amber-300";
  if (type === "deposit") return "bg-cyan-500/15 text-cyan-300";
  if (type === "withdraw") return "bg-sky-500/15 text-sky-300";
  return "bg-muted text-muted-foreground";
}

export function TransactionsTable({ rows }: { rows: AdminTransactionRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-8 text-center text-sm text-muted-foreground shadow-sm">
        No player transactions yet. Bets, wins, and losses appear here as players play.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-panel shadow-sm">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">When</th>
            <th className="px-4 py-3 font-semibold">Player</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Game</th>
            <th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Balance after</th>
            <th className="px-4 py-3 font-semibold">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/70 last:border-0">
              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                {formatDateTimePH(r.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="font-semibold text-foreground">@{r.username}</div>
                <div className="text-[11px] text-muted-foreground">{r.email ?? "—"}</div>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${typeTone(r.type)}`}>
                  {r.label}
                </span>
              </td>
              <td className="px-4 py-3 text-foreground">{r.game ?? "—"}</td>
              <td
                className={`px-4 py-3 font-semibold tabular-nums ${
                  r.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {r.amount >= 0 ? "+" : "−"}
                {formatMoney(r.absAmount)}
              </td>
              <td className="px-4 py-3 tabular-nums text-foreground">{formatMoney(r.balanceAfter)}</td>
              <td className="max-w-[220px] truncate px-4 py-3 text-xs text-muted-foreground" title={r.note ?? ""}>
                {r.note ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
