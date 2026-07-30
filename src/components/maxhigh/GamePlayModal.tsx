import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { SlotGame } from "@/lib/games";
import { useAuth } from "@/lib/auth";
import { recordGameSessionFn } from "@/functions/api";
import { CandyPeakSlot } from "./CandyPeakSlot";
import { GodlyGatesSlot } from "./GodlyGatesSlot";
import { SugarSurgeSlot } from "./SugarSurgeSlot";
import { GoldenPantherSlot } from "./GoldenPantherSlot";
import { ChineseNewYearSlot } from "./ChineseNewYearSlot";
import { MahjongWaysSlot } from "./MahjongWaysSlot";

type Props = {
  game: SlotGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getGameThemeConfig(gameId: string, category: string, thumb: string) {
  if (gameId === "chinese-new-year") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7F1D1D]/80 via-[#450A0A]/80 to-[#0A0912]/95",
      titleClass: "godly-title",
      barGradient: "from-[#FACC15] via-[#EF4444] to-[#B91C1C]",
      borderGlow: "shadow-[0_0_60px_rgba(239,68,68,0.8)] border-yellow-400",
      badgeGradient: "from-[#EF4444] via-[#F59E0B] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "FESTIVE DRAGON ARCADE",
      chargeText: "GONG XI FA CAI ACTIVE",
      lines: [
        "Preparing traditional Chinese pagoda temple…",
        "Awakening the Golden Tiger & Dragon blessings…",
        "Gathering red envelope scatter bonuses…",
        "Igniting festive firecracker multipliers…",
        "Chinese New Year is ready!",
      ],
    };
  }
  if (gameId === "golden-panther") {
    return {
      bgImage: "/images/symbols/panther/loading-bg.png",
      bgGradient: "from-[#3F2A08]/80 via-[#0A0912]/80 to-[#120800]/95",
      titleClass: "panther-title",
      barGradient: "from-[#F59E0B] via-[#FACC15] to-[#D97706]",
      borderGlow: "shadow-[0_0_60px_rgba(245,158,11,0.8)] border-amber-400",
      badgeGradient: "from-[#F59E0B] via-[#FACC15] to-[#78350F]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/panther/wild.png", "/images/symbols/panther/scatter.png"],
      badgeText: "GOLDEN PANTHER ARCADE",
      chargeText: "PANTHER POWER ACTIVE",
      lines: [
        "Entering the ancient golden jungle temple…",
        "Awakening the majestic Golden Panther…",
        "Forging 100x multiplier orb crystals…",
        "Charging Aztec golden treasures…",
        "The Golden Panther awaits!",
      ],
    };
  }
  if (gameId === "godly-gates") {
    return {
      bgImage: "/images/godly-loading/bg.png",
      bgGradient: "from-[#1E1B4B]/80 via-[#0A0912]/80 to-[#0F172A]/95",
      titleClass: "godly-title",
      barGradient: "from-[#FACC15] via-[#38BDF8] to-[#6366F1]",
      borderGlow: "shadow-[0_0_60px_rgba(250,204,21,0.8)] border-amber-300",
      badgeGradient: "from-[#FACC15] via-[#38BDF8] to-[#1E40AF]",
      renderType: "godly-3d" as const,
      imageParticles: [
        "/images/godly-loading/lightning_orb.png",
        "/images/godly-loading/gem.png",
        "/images/godly-loading/lightning_orb.png",
        "/images/godly-loading/gem.png",
      ],
      badgeText: "DIVINE ARCADE",
      chargeText: "DIVINE LIGHTNING ACTIVE",
      lines: [
        "Summoning Zeus thunderbolts…",
        "Opening the sacred Olympian gates…",
        "Forging 15,000x multiplier orbs…",
        "Awakening divine storm power…",
        "Ready to unleash Olympus!",
      ],
    };
  }
  if (gameId === "starlight-ace") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#31103F]/80 via-[#0A0912]/80 to-[#1E1B4B]/95",
      titleClass: "celestial-title",
      barGradient: "from-[#F472B6] via-[#C084FC] to-[#38BDF8]",
      borderGlow: "shadow-[0_0_60px_rgba(244,114,182,0.8)] border-pink-400",
      badgeGradient: "from-[#F472B6] via-[#A855F7] to-[#38BDF8]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "STARLIGHT ARCADE",
      chargeText: "STARLIGHT CHARGE ACTIVE",
      lines: [
        "Consulting the Star Princess…",
        "Gathering starlight scatter dust…",
        "Unlocking winged multiplier wilds…",
        "Aligning celestial constellations…",
        "Starlight Ace is ready!",
      ],
    };
  }
  if (category === "fishing" || gameId === "deep-bass") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#042F2E]/80 via-[#0A0912]/80 to-[#0369A1]/95",
      titleClass: "ocean-title",
      barGradient: "from-[#38BDF8] via-[#2DD4BF] to-[#FACC15]",
      borderGlow: "shadow-[0_0_60px_rgba(56,189,248,0.8)] border-cyan-400",
      badgeGradient: "from-[#38BDF8] via-[#0D9488] to-[#15803D]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/lightning_orb.png"],
      badgeText: "DEEP SEA ARCADE",
      chargeText: "SONAR PULSE ACTIVE",
      lines: [
        "Casting titanium fishing reel…",
        "Sonar scanning deep ocean waters…",
        "Baiting the golden boss marlin…",
        "Charging underwater coin cannons…",
        "Prepare for the big catch!",
      ],
    };
  }
  if (gameId === "frontier-gold" || gameId === "buffalo-reign") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#451A03]/80 via-[#0A0912]/80 to-[#78350F]/95",
      titleClass: "western-title",
      barGradient: "from-[#FBBF24] via-[#F97316] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.8)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#D97706] to-[#78350F]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "WILD WEST ARCADE",
      chargeText: "GOLD BOUNTY ACTIVE",
      lines: [
        "Saddling up for the gold rush…",
        "Loading saloon cowboy wilds…",
        "Triggering the buffalo stampede…",
        "Unlocking 10,000x gold vault…",
        "Ready to strike gold!",
      ],
    };
  }
  if (gameId === "fire-spike") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#450A0A]/80 via-[#0A0912]/80 to-[#7F1D1D]/95",
      titleClass: "fire-title",
      barGradient: "from-[#F97316] via-[#EF4444] to-[#FACC15]",
      borderGlow: "shadow-[0_0_60px_rgba(249,115,22,0.8)] border-orange-500",
      badgeGradient: "from-[#F97316] via-[#DC2626] to-[#991B1B]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "MOLTEN ARCADE",
      chargeText: "HEAT SURGE ACTIVE",
      lines: [
        "Igniting molten lava reels…",
        "Heating up fire spike respins…",
        "Charging diamond jackpot heat…",
        "Blazing maximum heat multipliers…",
        "Fire Spike is roaring!",
      ],
    };
  }
  if (category === "cards" || gameId.includes("ace") || gameId.includes("poker") || gameId.includes("blackjack") || gameId.includes("deal")) {
    return {
      bgImage: thumb,
      bgGradient: "from-[#450A0A]/80 via-[#0A0912]/80 to-[#18181B]/95",
      titleClass: "card-title",
      barGradient: "from-[#FACC15] via-[#DC2626] to-[#B91C1C]",
      borderGlow: "shadow-[0_0_60px_rgba(250,204,21,0.8)] border-yellow-400",
      badgeGradient: "from-[#FACC15] via-[#DC2626] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "ROYAL VIP ARCADE",
      chargeText: "VIP HAND ACTIVE",
      lines: [
        "Shuffling royal velvet decks…",
        "Dealing high-stakes cards…",
        "Unlocking royal flush multipliers…",
        "Preparing the VIP high table…",
        "Place your bets!",
      ],
    };
  }

  // Fallback: Candy Peak / Sugar Surge / Fruit Riot
  return {
    bgImage:
      gameId === "candy-peak" || gameId === "sugar-surge"
        ? "/images/candy-loading/bg.png"
        : thumb,
    bgGradient: "from-[#2A0A3D]/80 via-[#0A0912]/80 to-[#0A0912]/95",
    titleClass: "candy-title",
    barGradient: "from-[#FF4D6A] via-[#FACC15] via-[#A3E635] to-[#C084FC]",
    borderGlow: "shadow-[0_0_60px_rgba(255,77,139,0.8)] border-amber-300",
    badgeGradient: "from-[#FF4D6A] via-[#FACC15] to-[#A78BFA]",
    renderType: "candy-3d" as const,
    imageParticles: [
      "/images/candy-loading/badge.png",
      "/images/godly-loading/gem.png",
    ],
    badgeText: "MAXHIGH ARCADE",
    chargeText: "SUGAR CHARGE ACTIVE",
    lines: [
      "Unwrapping the secret sweets…",
      "Stacking frosting mountains…",
      "Charging the sugar boosters…",
      "Lighting the candy neon…",
      "Almost ready to crush the Peak!",
    ],
  };
}

function CandyTrailProgress({
  progress,
  config,
}: {
  progress: number;
  config: ReturnType<typeof getGameThemeConfig>;
}) {
  return (
    <div className="relative mx-auto w-full max-w-lg px-4">
      {/* Sleek 3D Sugar Progress Bar */}
      <div className="relative h-7 w-full overflow-hidden rounded-full border-2 border-white/60 bg-black/60 p-1 shadow-[0_0_35px_rgba(255,255,255,0.35)] backdrop-blur-md">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${config.barGradient} transition-all duration-200 ease-out shadow-[0_0_25px_rgba(250,204,21,0.9)]`}
          style={{ width: `${progress}%` }}
        />
        {/* Animated Light Reflection */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[candy-pan_2.5s_linear_infinite]" />
      </div>

      {/* Percentage Counter */}
      <div className="mt-4 text-center">
        <span className="candy-pct inline-block text-4xl font-black tabular-nums tracking-tight sm:text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
          {progress}%
        </span>
        <div className="mt-1 text-xs font-black uppercase tracking-[0.25em] text-amber-300 drop-shadow-md">
          {config.chargeText}
        </div>
      </div>
    </div>
  );
}

function CreativeLoader({
  game,
  progress,
}: {
  game: SlotGame;
  progress: number;
}) {
  const config = useMemo(
    () => getGameThemeConfig(game.id, game.category, game.thumb),
    [game.id, game.category, game.thumb],
  );
  const line = config.lines[Math.min(config.lines.length - 1, Math.floor(progress / 20))];

  return (
    <div className="relative flex h-full min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8 text-center sm:px-8">
      {/* 3D Generated High-End Background */}
      <img
        src={config.bgImage}
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-[2px] animate-[candy-pan_25s_ease-in-out_infinite_alternate]"
        aria-hidden
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${config.bgGradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,#0A0912f5_90%)]" />

      {/* Hero 3D Badge Icon */}
      <div className={`relative z-10 mb-3 overflow-hidden rounded-[2.25rem] border-4 p-1 candy-glow candy-pop ${config.borderGlow}`}>
        <img
          src={game.thumb}
          alt=""
          className="h-32 w-32 object-cover rounded-[2rem] sm:h-40 sm:w-40"
        />
      </div>

      <div className={`relative z-10 rounded-full border border-white/30 bg-gradient-to-r ${config.badgeGradient} px-6 py-1.5 text-xs font-black uppercase tracking-[0.3em] text-white shadow-2xl backdrop-blur-md`}>
        {config.badgeText}
      </div>

      {/* Dynamic 3D Title */}
      <h1 className={`${config.titleClass} relative z-10 mt-4 text-5xl font-black uppercase leading-none tracking-wide sm:text-7xl md:text-8xl drop-shadow-2xl`}>
        {game.name}
      </h1>

      <p className="relative z-10 mt-4 max-w-md rounded-2xl border border-white/30 bg-black/70 px-6 py-3 text-base font-bold text-white shadow-2xl backdrop-blur-xl sm:text-lg">
        <span className="mr-2 inline-block animate-bounce text-amber-300">⚡</span>
        {line}
        <span className="ml-2 inline-block animate-bounce [animation-delay:200ms] text-amber-300">⚡</span>
      </p>

      <div className="relative z-10 mt-8 w-full">
        <CandyTrailProgress progress={progress} config={config} />
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
        Full arcade mode for this title is cooking. Candy Peak and Godly Gates are playable now — more games soon.
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
  const isGodlyGates = game?.id === "godly-gates";
  const isSugarSurge = game?.id === "sugar-surge";
  const background = useMemo(
    () =>
      isCandyPeak || isSugarSurge
        ? "/images/candy-loading/bg.png"
        : game?.thumb ?? "",
    [game?.thumb, isCandyPeak, isSugarSurge],
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
            game={game}
            progress={progress}
          />
        ) : isCandyPeak ? (
          <div className="relative h-dvh w-screen overflow-hidden">
            <CandyPeakSlot gameId={game.id} gameName={game.name} />
          </div>
        ) : isSugarSurge ? (
          <div className="relative h-dvh w-screen overflow-hidden">
            <SugarSurgeSlot gameId={game.id} gameName={game.name} />
          </div>
        ) : isGodlyGates ? (
          <div className="relative h-dvh w-screen overflow-hidden">
            <GodlyGatesSlot gameId={game.id} gameName={game.name} />
          </div>
        ) : game.id === "golden-panther" ? (
          <div className="relative h-dvh w-screen overflow-hidden">
            <GoldenPantherSlot gameId={game.id} gameName={game.name} />
          </div>
        ) : game.id === "chinese-new-year" ? (
          <div className="relative h-dvh w-screen overflow-hidden">
            <ChineseNewYearSlot gameId={game.id} gameName={game.name} />
          </div>
        ) : game.id === "mahjong-ways" ? (
          <div className="relative h-dvh w-screen overflow-hidden flex items-center justify-center p-1 sm:p-3">
            <MahjongWaysSlot />
          </div>
        ) : (
          <ComingSoonPlay game={game} />
        )}
      </div>
    </div>,
    document.body,
  );
}
