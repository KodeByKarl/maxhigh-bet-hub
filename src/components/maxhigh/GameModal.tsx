import { lazy, Suspense, useState } from "react";
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
import { cn } from "@/lib/utils";

const GamePlayModal = lazy(() =>
  import("./GamePlayModal").then((m) => ({ default: m.GamePlayModal })),
);

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
            size={14}
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
        <DialogContent
          className={cn(
            "flex max-h-[min(92dvh,920px)] w-[min(100%-0.75rem,28rem)] flex-col gap-0 overflow-hidden border-border bg-panel p-0 text-foreground",
            "top-[50%] translate-y-[-50%] rounded-2xl sm:w-[min(100%-1.5rem,42rem)] sm:rounded-3xl",
            "max-[380px]:max-h-[min(96dvh,920px)] max-[380px]:w-[min(100%-0.5rem,28rem)] max-[380px]:rounded-xl",
            "[&>button]:right-2.5 [&>button]:top-2.5 [&>button]:z-20 [&>button]:rounded-full [&>button]:border [&>button]:border-white/25 [&>button]:bg-black/55 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100 [&>button]:backdrop-blur-md [&>button]:hover:bg-black/75 [&>button]:hover:opacity-100 [&>button]:focus:ring-offset-0",
          )}
        >
          {/* Hero — scales down on short phones */}
          <div className="relative aspect-[16/10] max-h-[38dvh] shrink-0 overflow-hidden sm:aspect-[2/1] sm:max-h-none max-[380px]:aspect-[16/9] max-[380px]:max-h-[32dvh]">
            <img
              src={game.thumb}
              alt=""
              className="h-full w-full object-cover object-center"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/35 to-transparent" />
            {game.tag && (
              <span className="absolute left-3 top-3 rounded-full bg-lime px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-on-lime sm:left-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-[10px]">
                {game.tag}
              </span>
            )}
          </div>

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-3 pt-1.5 sm:px-6 sm:pb-4 sm:pt-2 max-[380px]:px-3">
            <DialogHeader className="space-y-1.5 text-left sm:space-y-2">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px] sm:tracking-[0.18em]">
                {game.provider} · {game.category}
              </div>
              <DialogTitle className="text-xl font-black uppercase tracking-wide text-foreground max-[380px]:text-lg sm:text-3xl">
                {game.name}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Stars rating={game.rating} />
                <span className="text-xs font-bold tabular-nums text-foreground sm:text-sm">
                  {game.rating.toFixed(1)}
                </span>
                <span className="text-[11px] text-muted-foreground sm:text-xs">
                  ({game.reviews.toLocaleString()} reviews)
                </span>
              </div>
              <DialogDescription className="line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:line-clamp-none sm:text-sm">
                {game.description}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-5 sm:grid-cols-5 sm:gap-2">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={cn(
                    "rounded-xl bg-muted px-2.5 py-2 sm:rounded-2xl sm:px-3 sm:py-2.5",
                    i === stats.length - 1 && "col-span-2 sm:col-span-1",
                  )}
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                    {s.label}
                  </div>
                  <div className="mt-0.5 truncate text-sm font-black text-foreground sm:text-sm">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 sm:mt-5">
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:mb-2 sm:text-[10px] sm:tracking-[0.16em]">
                Features
              </div>
              <div className="-mx-0.5 flex gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                {game.features.map((f) => (
                  <span
                    key={f}
                    className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground sm:px-3 sm:text-xs"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky actions — always reachable on short phones */}
          <div className="shrink-0 border-t border-border/60 bg-panel/95 px-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md sm:px-6 sm:pb-5 sm:pt-3 max-[380px]:px-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePlay}
                className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98] sm:h-12 sm:flex-none sm:px-6 sm:text-sm"
              >
                <Play size={15} fill="currentColor" />
                Play Now
              </button>
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-muted text-foreground hover:bg-panel-hover sm:size-12"
                aria-label="Add to favourites"
              >
                <Heart size={17} />
              </button>
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-muted text-foreground hover:bg-panel-hover sm:size-12"
                aria-label="Share game"
              >
                <Share2 size={17} />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {playing ? (
        <Suspense fallback={null}>
          <GamePlayModal
            game={game}
            open={playing}
            onOpenChange={(next) => {
              setPlaying(next);
              if (!next) onOpenChange(false);
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
