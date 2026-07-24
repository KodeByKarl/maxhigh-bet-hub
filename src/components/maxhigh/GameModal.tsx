import { useState } from "react";
import { Star, Play, Heart, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SlotGame } from "@/lib/games";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { GamePlayModal } from "./GamePlayModal";

type Props = {
  game: SlotGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = rating >= i + 1;
        const half = !filled && rating >= i + 0.5;
        return (
          <Star
            key={i}
            size={16}
            className={filled || half ? "fill-lime text-lime" : "text-muted-foreground"}
          />
        );
      })}
    </div>
  );
}

export function GameModal({ game, open, onOpenChange }: Props) {
  const [playing, setPlaying] = useState(false);
  const { requireAuth } = useAuth();

  if (!game) return null;

  function handlePlay() {
    if (!requireAuth()) {
      toast.message("Log in required", {
        description: "Sign in to play MaxHigh games.",
      });
      return;
    }
    setPlaying(true);
  }

  const stats = [
    { label: "RTP", value: game.rtp },
    { label: "Volatility", value: game.volatility },
    { label: "Max Win", value: game.maxWin },
    { label: "Min Bet", value: game.minBet },
    { label: "Max Bet", value: game.maxBet },
  ];

  return (
    <>
      <Dialog
        open={open && !playing}
        onOpenChange={(next) => {
          if (!playing) onOpenChange(next);
        }}
      >
        <DialogContent className="max-h-[90vh] w-[min(100%-1.5rem,42rem)] overflow-y-auto border-border bg-panel p-0 text-foreground sm:rounded-3xl">
          <div className="relative aspect-[16/10] overflow-hidden rounded-t-3xl sm:aspect-[2/1]">
            <img src={game.thumb} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/40 to-transparent" />
            {game.tag && (
              <span className="absolute left-4 top-4 rounded-full bg-lime px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-on-lime">
                {game.tag}
              </span>
            )}
          </div>

          <div className="space-y-5 px-5 pb-6 pt-2 sm:px-6">
            <DialogHeader className="space-y-2 text-left">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {game.provider} · {game.category}
              </div>
              <DialogTitle className="text-2xl font-black uppercase tracking-wide text-foreground sm:text-3xl">
                {game.name}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Stars rating={game.rating} />
                <span className="text-sm font-bold tabular-nums text-foreground">{game.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">
                  ({game.reviews.toLocaleString()} reviews)
                </span>
              </div>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {game.description}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl bg-muted px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="mt-0.5 text-sm font-black text-foreground">{s.value}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Features
              </div>
              <div className="flex flex-wrap gap-2">
                {game.features.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handlePlay}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none"
              >
                <Play size={16} fill="currentColor" />
                Play Now
              </button>
              <button
                type="button"
                className="grid h-12 w-12 place-items-center rounded-full border border-border bg-muted text-foreground hover:bg-panel-hover"
                aria-label="Add to favourites"
              >
                <Heart size={18} />
              </button>
              <button
                type="button"
                className="grid h-12 w-12 place-items-center rounded-full border border-border bg-muted text-foreground hover:bg-panel-hover"
                aria-label="Share game"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GamePlayModal
        game={game}
        open={playing}
        onOpenChange={(next) => {
          setPlaying(next);
          if (!next) onOpenChange(false);
        }}
      />
    </>
  );
}
