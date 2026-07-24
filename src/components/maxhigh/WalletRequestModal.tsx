import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownToLine, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createWalletRequestFn } from "@/functions/api";
import { formatMoney } from "@/lib/currency";
import { toast } from "sonner";

type Mode = "deposit" | "withdraw";

type Props = {
  open: boolean;
  mode: Mode;
  balance: number;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
};

const QUICK = [100, 500, 1000, 5000];

export function WalletRequestModal({ open, mode, balance, onOpenChange, onSubmitted }: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setNote("");
      setBusy(false);
    }
  }, [open]);

  const isDeposit = mode === "deposit";
  const title = isDeposit ? "Request deposit" : "Request withdrawal";
  const subtitle = isDeposit
    ? "Staff will review and add chips to your wallet."
    : "Staff will review and cash out from your wallet.";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Enter an amount of at least ₱1.00");
      return;
    }
    if (!isDeposit && value > balance) {
      toast.error("Amount exceeds your balance");
      return;
    }

    setBusy(true);
    try {
      await createWalletRequestFn({
        data: {
          type: mode,
          amount: value,
          note: note.trim() || undefined,
        },
      });
      toast.success(isDeposit ? "Deposit request sent" : "Withdrawal request sent", {
        description: "Waiting for Superadmin approval.",
      });
      onOpenChange(false);
      onSubmitted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border bg-panel text-foreground sm:rounded-3xl">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            {isDeposit ? (
              <Plus size={18} className="text-primary" strokeWidth={3} />
            ) : (
              <ArrowDownToLine size={18} className="text-primary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl bg-muted px-4 py-3 text-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Available balance
          </div>
          <div className="mt-0.5 text-lg font-black tabular-nums text-foreground">
            {formatMoney(balance)}
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Amount (₱)
            </span>
            <Input
              type="number"
              min={1}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-12 rounded-xl border-border bg-muted text-lg font-bold tabular-nums"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-bold tabular-nums text-foreground hover:bg-panel-hover"
              >
                ₱{q.toLocaleString("en-PH")}
              </button>
            ))}
            {!isDeposit && balance > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(balance))}
                className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/15"
              >
                Max
              </button>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Note (optional)
            </span>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder={isDeposit ? "e.g. GCash reference" : "e.g. Bank account tip"}
              className="h-11 rounded-xl border-border bg-muted"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Submitting…" : isDeposit ? "Submit deposit" : "Submit withdrawal"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
