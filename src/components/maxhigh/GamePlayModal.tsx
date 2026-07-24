import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { SlotGame } from "@/lib/games";
import { useAuth } from "@/lib/auth";
import { recordGameSessionFn } from "@/functions/api";
import { CandyPeakSlot } from "./CandyPeakSlot";

type Props = {
  game: SlotGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LOAD_LINES = [
  "Unwrapping the secret sweets…",
  "Stacking frosting mountains…",
  "Charging the sugar boosters…",
  "Lighting the candy neon…",
  "Almost ready to crush the Peak!",
];

const CANDIES = ["🍓", "🍭", "🍬", "🍇", "🍋", "🫐", "🍒", "🧁"] as const;

function CandyTrailProgress({ progress }: { progress: number }) {
  const beads = 12;
  const filled = Math.round((progress / 100) * beads);

  return (
    <div className="relative mx-auto w-full max-w-lg px-4">
      {/* Sleek 3D Sugar Progress Bar */}
      <div className="relative h-7 w-full overflow-hidden rounded-full border-2 border-white/60 bg-black/60 p-1 shadow-[0_0_30px_rgba(255,77,139,0.5)] backdrop-blur-md">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FF4D6A] via-[#FACC15] via-[#A3E635] to-[#C084FC] transition-all duration-200 ease-out shadow-[0_0_20px_rgba(250,204,21,0.9)]"
          style={{ width: `${progress}%` }}
        />
        {/* Animated Light Reflection */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[candy-pan_2.5s_linear_infinite]" />
      </div>

      {/* Candy Beads Trail */}
      <div className="mt-3 flex justify-between px-2">
        {Array.from({ length: beads }).map((_, i) => {
          const on = i < filled;
          return (
            <span
              key={i}
              className={[
                "grid h-8 w-8 place-items-center rounded-full text-base shadow-lg transition-all duration-300 sm:h-9 sm:w-9 sm:text-lg",
                on
                  ? "scale-110 bg-white/95 opacity-100 candy-pop shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                  : "scale-85 bg-black/50 opacity-30 grayscale",
              ].join(" ")}
            >
              {CANDIES[i % CANDIES.length]}
            </span>
          );
        })}
      </div>

      {/* Percentage Counter */}
      <div className="mt-4 text-center">
        <span className="candy-pct inline-block text-4xl font-black tabular-nums tracking-tight sm:text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
          {progress}%
        </span>
        <div className="mt-1 text-xs font-black uppercase tracking-[0.25em] text-amber-300 drop-shadow-md">
          Sugar Charge Active
        </div>
      </div>
    </div>
  );
}

function CreativeLoader({
  gameName,
  progress,
  background,
  thumb,
}: {
  gameName: string;
  progress: number;
  background: string;
  thumb: string;
}) {
  const line = LOAD_LINES[Math.min(LOAD_LINES.length - 1, Math.floor(progress / 20))];

  return (
    <div className="relative flex h-full min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8 text-center sm:px-8">
      {/* 3D Candy Kingdom Background */}
      <img
        src="/images/candy-loading/bg.png"
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover animate-[candy-pan_25s_ease-in-out_infinite_alternate]"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#2A0A3D]/45 via-[#0A0912]/35 to-[#0A0912]/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,#0A0912f0_90%)]" />

      {/* Floating 3D Sugar Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CANDIES.map((c, i) => (
          <span
            key={i}
            className="absolute text-4xl opacity-90 drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)] candy-float sm:text-5xl"
            style={{
              left: `${6 + i * 11}%`,
              top: `${8 + (i % 4) * 22}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Hero Badge Icon */}
      <div className="relative z-10 mb-3 overflow-hidden rounded-[2.25rem] border-4 border-amber-300/80 p-1 shadow-[0_0_60px_rgba(255,77,139,0.8)] candy-glow candy-pop">
        <img
          src={thumb || "/games/candy-peak.png"}
          alt=""
          className="h-32 w-32 object-cover rounded-[2rem] sm:h-40 sm:w-40"
        />
      </div>

      <div className="relative z-10 rounded-full border border-white/30 bg-gradient-to-r from-[#FF4D6A] via-[#FACC15] to-[#A78BFA] px-5 py-1 text-xs font-black uppercase tracking-[0.3em] text-black shadow-[0_4px_20px_rgba(250,204,21,0.5)]">
        MaxHigh Arcade
      </div>

      {/* 3D Sugar Title */}
      <h1 className="candy-title relative z-10 mt-4 text-5xl font-black uppercase leading-none tracking-wide sm:text-7xl md:text-8xl drop-shadow-2xl">
        {gameName}
      </h1>

      <p className="relative z-10 mt-4 max-w-md rounded-2xl border border-white/30 bg-black/60 px-6 py-3 text-base font-bold text-white shadow-2xl backdrop-blur-lg sm:text-lg">
        <span className="mr-2 inline-block animate-bounce text-amber-300">✨</span>
        {line}
        <span className="ml-2 inline-block animate-bounce [animation-delay:200ms] text-amber-300">✨</span>
      </p>

      <div className="relative z-10 mt-8 w-full">
        <CandyTrailProgress progress={progress} />
      </div>
    </div>
  );
}

function ComingSoonPlay({ game }: { game: SlotGame }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <img src={game.thumb} alt="" className="h-40 w-40 rounded-3xl object-cover shadow-xl" />
      <h2 className="text-2xl font-black uppercase text-white">{game.name}</h2>
      <p className="max-w-md text-sm text-white/80">
        Full arcade mode for this title is cooking. Candy Peak is playable now — more games soon.
      </p>
    </div>
  );
}

export function GamePlayModal({ game, open, onOpenChange }: Props) {
  const [phase, setPhase] = useState<"loading" | "play">("loading");
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { isLoggedIn, openLogin } = useAuth();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    if (!isLoggedIn) {
      onOpenChange(false);
      openLogin();
    }
  }, [open, isLoggedIn, onOpenChange, openLogin]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !game || !isLoggedIn) return;
    setPhase("loading");
    setProgress(0);
    const start = Date.now();
    const duration = 4200;
    const tick = window.setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      setProgress(p);
      if (p >= 100) {
        window.clearInterval(tick);
        setPhase("play");
        // Precise audit: Play Now → session open (Candy Peak / any game)
        void recordGameSessionFn({
          data: { gameId: game.id, gameName: game.name },
        }).catch(() => undefined);
      }
    }, 40);
    return () => window.clearInterval(tick);
  }, [open, game?.id, game?.name, isLoggedIn]);

  const isCandyPeak = game?.id === "candy-peak";
  const background = useMemo(
    () => (isCandyPeak ? "/images/candy-loading/bg.png" : game?.thumb ?? ""),
    [game?.thumb, isCandyPeak],
  );

  if (!mounted || !open || !game || !isLoggedIn) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex h-dvh w-screen flex-col bg-[#0A0912]">
      <div className="absolute right-3 top-3 z-[110] sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md hover:bg-black/70"
          aria-label="Close game"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {phase === "loading" ? (
          <CreativeLoader
            gameName={game.name}
            progress={progress}
            background={background}
            thumb={game.thumb}
          />
        ) : isCandyPeak ? (
          <div className="relative h-dvh w-screen overflow-hidden">
            <CandyPeakSlot gameId={game.id} gameName={game.name} />
          </div>
        ) : (
          <ComingSoonPlay game={game} />
        )}
      </div>
    </div>,
    document.body,
  );
}
