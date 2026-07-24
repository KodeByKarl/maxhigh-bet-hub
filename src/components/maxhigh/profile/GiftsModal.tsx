import { useState } from "react";
import { Gift, Sparkles, Ticket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type GiftItem = {
  id: string;
  title: string;
  detail: string;
  value: string;
  claimed: boolean;
  kind: "bonus" | "spins" | "cash";
};

const INITIAL: GiftItem[] = [
  {
    id: "welcome",
    title: "Welcome Pack",
    detail: "One-time bonus for new MaxHigh players.",
    value: "₱10 credit",
    claimed: false,
    kind: "bonus",
  },
  {
    id: "daily",
    title: "Daily Free Spins",
    detail: "Claim once per day · Candy Peak only.",
    value: "10 spins",
    claimed: false,
    kind: "spins",
  },
  {
    id: "race",
    title: "Race booster",
    detail: "Extra race points for the next 24 hours.",
    value: "2x points",
    claimed: false,
    kind: "cash",
  },
];

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function GiftsModal({ open, onOpenChange }: Props) {
  const [gifts, setGifts] = useState<GiftItem[]>(() => {
    if (typeof window === "undefined") return INITIAL;
    try {
      const raw = localStorage.getItem("maxhigh.gifts");
      return raw ? (JSON.parse(raw) as GiftItem[]) : INITIAL;
    } catch {
      return INITIAL;
    }
  });

  function claim(id: string) {
    const next = gifts.map((g) => (g.id === id ? { ...g, claimed: true } : g));
    setGifts(next);
    localStorage.setItem("maxhigh.gifts", JSON.stringify(next));
    const item = next.find((g) => g.id === id);
    toast.success(`Claimed: ${item?.title ?? "Gift"}`, {
      description: item?.value,
    });
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
            Claim bonuses, free spins, and race boosters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 p-4">
          {gifts.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-muted/60 p-3"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime/15 text-lime">
                {g.kind === "spins" ? <Ticket size={18} /> : <Sparkles size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-foreground">{g.title}</div>
                <div className="text-xs text-muted-foreground">{g.detail}</div>
                <div className="mt-1 text-[11px] font-black uppercase tracking-wider text-lime">
                  {g.value}
                </div>
              </div>
              <button
                type="button"
                disabled={g.claimed}
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
