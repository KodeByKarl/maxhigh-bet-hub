import { claimRewardFn, listMyRewardsFn } from "@/functions/rewards";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/currency";
import { useState, useEffect } from "react";
import { Gift, Sparkles, Ticket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };
type Reward = Awaited<ReturnType<typeof listMyRewardsFn>>[number];
export function GiftsModal({ open, onOpenChange }: Props) {
  const [gifts, setGifts] = useState<Reward[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { refreshSession } = useAuth();
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    listMyRewardsFn()
      .then((rows) => {
        if (!cancelled) setGifts(rows);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load rewards");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);
  async function claim(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      await claimRewardFn({ data: { id } });
      setGifts(await listMyRewardsFn());
      await refreshSession();
      toast.success("Reward credited to your wallet");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reward claim failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[min(100%-1.5rem,28rem)] overflow-y-auto border-border bg-panel p-0 text-foreground sm:rounded-3xl">
        <DialogHeader className="space-y-1 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Gift size={18} className="text-lime" />
            Gifts & Rewards
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Claim rewards issued to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 p-4">
          {error && <p role="alert">{error}</p>}
          {!error && gifts.length === 0 && <p>No rewards have been issued to your account.</p>}
          {gifts.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-muted/60 p-3"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime/15 text-lime">
                <Sparkles size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-foreground">{g.title}</div>
                <div className="text-xs text-muted-foreground">Wallet credit</div>
                <div className="mt-1 text-[11px] font-black uppercase tracking-wider text-lime">
                  {formatMoney(g.amount)}
                </div>
              </div>
              <button
                type="button"
                disabled={g.claimed || busy !== null}
                onClick={() => claim(g.id)}
                className="h-9 shrink-0 rounded-full bg-primary px-3 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {g.claimed ? "Claimed" : "Claim"}
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
