import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listMyWalletRequestsFn } from "@/functions/api";
import { formatMoney } from "@/lib/currency";

type Row = {
  id: string;
  type: "deposit" | "withdraw";
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WalletHistoryModal({ open, onOpenChange }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    listMyWalletRequestsFn()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-panel text-foreground sm:rounded-3xl">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Wallet size={18} className="text-primary" />
            Cash requests
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Your deposit and withdrawal requests.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No requests yet.</div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/70 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold capitalize text-foreground">{r.type}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black tabular-nums text-foreground">
                    {formatMoney(r.amount)}
                  </div>
                  <div
                    className={[
                      "text-[10px] font-bold uppercase tracking-wider",
                      r.status === "pending"
                        ? "text-primary"
                        : r.status === "approved"
                          ? "text-[#15803D]"
                          : "text-danger",
                    ].join(" ")}
                  >
                    {r.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
