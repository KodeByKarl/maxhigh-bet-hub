import { useEffect, useState } from "react";
import { Bell, CheckCheck, Gift, Trophy, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Notif = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "win" | "promo" | "system";
  read: boolean;
};

const SEED: Notif[] = [
  {
    id: "1",
    title: "Welcome to MaxHigh",
    body: "Your account is ready. Play responsibly and chase the Mega Jackpot.",
    time: "Just now",
    type: "system",
    read: false,
  },
  {
    id: "2",
    title: "Daily Race is live",
    body: "Compete today — standings reset at midnight UTC.",
    time: "2h ago",
    type: "promo",
    read: false,
  },
  {
    id: "3",
    title: "Big win nearby",
    body: "A player hit a strong win on Candy Peak. Your turn?",
    time: "5h ago",
    type: "win",
    read: true,
  },
];

const iconFor = {
  win: Trophy,
  promo: Gift,
  system: Zap,
} as const;

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function NotificationsModal({ open, onOpenChange }: Props) {
  const [items, setItems] = useState<Notif[]>(SEED);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("maxhigh.notifications");
      if (raw) setItems(JSON.parse(raw) as Notif[]);
    } catch {
      /* keep seed */
    }
  }, [open]);

  function persist(next: Notif[]) {
    setItems(next);
    localStorage.setItem("maxhigh.notifications", JSON.stringify(next));
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(100%-1.5rem,28rem)] flex-col gap-0 overflow-hidden border-border bg-panel p-0 text-foreground sm:rounded-3xl">
        <DialogHeader className="space-y-1 border-b border-border px-5 py-4 text-left">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Bell size={18} className="text-primary" />
              Notifications
              {unread > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {unread} new
                </span>
              )}
            </DialogTitle>
            <button
              type="button"
              onClick={() => persist(items.map((n) => ({ ...n, read: true })))}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-panel-hover hover:text-foreground"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Wins, promos, and account alerts.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            items.map((n) => {
              const Icon = iconFor[n.type];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() =>
                    persist(items.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                  }
                  className={`mb-1 flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-panel-hover ${
                    n.read ? "opacity-70" : "bg-muted/80"
                  }`}
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-foreground">{n.title}</span>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-lime" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {n.body}
                    </span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                      {n.time}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
