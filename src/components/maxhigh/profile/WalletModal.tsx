import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, History, Loader2, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMyWalletSummaryFn, listMyTransactionsFn } from "@/functions/api";
import { formatDateTimePH } from "@/lib/datetime";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

type Tab = "funds" | "play" | "summary";

type TxRow = Awaited<ReturnType<typeof listMyTransactionsFn>>[number];
type Summary = Awaited<ReturnType<typeof getMyWalletSummaryFn>>;

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function WalletModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("summary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async (next: Tab) => {
    setLoading(true);
    setError(null);
    try {
      if (next === "summary") {
        const s = await getMyWalletSummaryFn();
        setSummary(s);
      } else {
        const list = await listMyTransactionsFn({
          data: { tab: next === "funds" ? "funds" : "play", limit: 80 },
        });
        setRows(list);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load(tab);
  }, [open, tab, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,40rem)] w-[min(100%-1rem,28rem)] flex-col gap-0 overflow-hidden border-border bg-panel p-0 sm:rounded-3xl">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Wallet size={18} className="text-primary" />
            My Wallet
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Fund in / out history and your play summary in one place.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 gap-1 border-b border-border bg-muted/40 p-2">
          {(
            [
              { id: "summary", label: "Summary" },
              { id: "funds", label: "Fund In/Out" },
              { id: "play", label: "Bets & Wins" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded-xl px-2 py-2 text-[11px] font-bold uppercase tracking-wide transition",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-panel-hover hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {!loading && !error && tab === "summary" && summary && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Current Balance
                </div>
                <div className="mt-1 text-2xl font-black tabular-nums text-foreground">
                  {formatMoney(summary.balance)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label="Fund In"
                  value={formatMoney(summary.fundIn)}
                  icon={<ArrowDownLeft size={14} className="text-emerald-400" />}
                />
                <StatCard
                  label="Fund Out"
                  value={formatMoney(summary.fundOut)}
                  icon={<ArrowUpRight size={14} className="text-amber-400" />}
                />
                <StatCard label="Total Bets" value={String(summary.betCount)} />
                <StatCard label="Bet Volume" value={formatMoney(summary.betVolume)} />
                <StatCard label="Wins" value={formatMoney(summary.winVolume)} />
                <StatCard
                  label="Net"
                  value={formatMoney(summary.net)}
                  emphasize={summary.net >= 0 ? "good" : "bad"}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <History size={12} />
                  By Game
                </div>
                {summary.byGame.length === 0 ? (
                  <EmptyHint text="No bets yet — play a game to see your summary." />
                ) : (
                  <ul className="space-y-1.5">
                    {summary.byGame.map((g) => (
                      <li
                        key={g.game}
                        className="rounded-xl border border-border/80 bg-panel px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-foreground">
                            {g.game}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-black tabular-nums",
                              g.net >= 0 ? "text-emerald-400" : "text-rose-400",
                            )}
                          >
                            {formatMoney(g.net)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                          <span>{g.betCount} bets</span>
                          <span>Wagered {formatMoney(g.betVolume)}</span>
                          <span>Won {formatMoney(g.winVolume)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {!loading && !error && tab !== "summary" && (
            <div className="space-y-1.5">
              {rows.length === 0 ? (
                <EmptyHint
                  text={
                    tab === "funds"
                      ? "No fund in / out yet. Chip transfers from your agent will show here."
                      : "No bets or wins yet."
                  }
                />
              ) : (
                rows.map((r) => {
                  const positive = r.amount >= 0;
                  return (
                    <div
                      key={r.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-panel px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-foreground">{r.label}</span>
                          {r.game ? (
                            <span className="truncate text-[10px] text-muted-foreground">
                              · {r.game}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {formatDateTimePH(r.createdAt)}
                          {r.note ? ` · ${r.note}` : ""}
                        </div>
                        <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                          Bal {formatMoney(r.balanceAfter)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 text-sm font-black tabular-nums",
                          positive ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {positive ? "+" : "−"}
                        {formatMoney(r.absAmount)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  icon,
  emphasize,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  emphasize?: "good" | "bad";
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel px-3 py-2.5">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-sm font-black tabular-nums text-foreground",
          emphasize === "good" && "text-emerald-400",
          emphasize === "bad" && "text-rose-400",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
