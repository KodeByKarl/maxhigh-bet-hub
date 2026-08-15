import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { SlotGame } from "@/lib/games";
import { useAuth } from "@/lib/auth";
import { recordGameSessionFn } from "@/functions/api";
import { resolveLazyGame } from "./gamePlayRegistry";

type Props = {
  game: SlotGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getGameThemeConfig(gameId: string, category: string, thumb: string) {
  if (gameId === "mahjong-ways") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#0B3D2E]/55 via-[#061210]/75 to-[#020806]/95",
      titleClass: "mahjong-title",
      barGradient: "from-[#F5D76E] via-[#C9A227] to-[#8B1A1A]",
      borderGlow: "border-[#C9A227]/70",
      badgeGradient: "from-[#C9A227] via-[#8B1A1A] to-[#0B3D2E]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/mahjong/bamboo.png?v=2",
        "/images/symbols/mahjong/red_dragon.png?v=2",
        "/images/symbols/mahjong/dot.webp?v=2",
      ],
      badgeText: "WAYS TO WIN",
      chargeText: "TILES READY",
      accent: "#C9A227",
      lines: [
        "Laying the jade felt…",
        "Arranging bamboo & dragon tiles…",
        "Goldifying wilds across the grid…",
        "Charging cascade multipliers…",
        "Mahjong Ways is ready!",
      ],
    };
  }
  if (gameId === "mahjong-ways-2") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#0B3D2E]/55 via-[#061210]/75 to-[#020806]/95",
      titleClass: "mahjong-title",
      barGradient: "from-[#F5D76E] via-[#C9A227] to-[#8B1A1A]",
      borderGlow: "border-[#C9A227]/70",
      badgeGradient: "from-[#C9A227] via-[#8B1A1A] to-[#0B3D2E]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/mahjong-ways-2/bamboo.png",
        "/images/symbols/mahjong-ways-2/red_dragon.png",
        "/images/symbols/mahjong-ways-2/dot.webp",
      ],
      badgeText: "WAYS TO WIN",
      chargeText: "TILES READY",
      accent: "#C9A227",
      lines: [
        "Laying the jade felt…",
        "Arranging bamboo & dragon tiles…",
        "Goldifying wilds across the grid…",
        "Charging cascade multipliers…",
        "Mahjong Ways 2 is ready!",
      ],
    };
  }
  if (gameId === "dragon-phoenix") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#0B3D2E]/55 via-[#061210]/75 to-[#020806]/95",
      titleClass: "mahjong-title",
      barGradient: "from-[#F5D76E] via-[#C9A227] to-[#8B1A1A]",
      borderGlow: "border-[#C9A227]/70",
      badgeGradient: "from-[#C9A227] via-[#8B1A1A] to-[#0B3D2E]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/dragon-phoenix/bamboo.png",
        "/images/symbols/dragon-phoenix/red_dragon.png",
        "/images/symbols/dragon-phoenix/dot.webp",
      ],
      badgeText: "MYTHIC WAYS",
      chargeText: "TILES READY",
      accent: "#C9A227",
      lines: [
        "Summoning dragon & phoenix…",
        "Arranging bamboo & dragon tiles…",
        "Goldifying wilds across the grid…",
        "Charging cascade multipliers…",
        "Dragon & Phoenix is ready!",
      ],
    };
  }
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
      accent: "#FACC15",
      lines: [
        "Preparing traditional Chinese pagoda temple…",
        "Awakening the Golden Tiger & Dragon blessings…",
        "Gathering red envelope scatter bonuses…",
        "Igniting festive firecracker multipliers…",
        "Chinese New Year is ready!",
      ],
    };
  }
  if (gameId === "fiesta-fireworks") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7F1D1D]/80 via-[#450A0A]/80 to-[#0A0912]/95",
      titleClass: "godly-title",
      barGradient: "from-[#FACC15] via-[#EF4444] to-[#B91C1C]",
      borderGlow: "shadow-[0_0_60px_rgba(239,68,68,0.8)] border-yellow-400",
      badgeGradient: "from-[#EF4444] via-[#F59E0B] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "FIESTA FIREWORKS",
      chargeText: "FIESTA CHARGE ACTIVE",
      accent: "#FACC15",
      lines: [
        "Lighting the barrio fireworks…",
        "Awakening dragon & monkey bonuses…",
        "Gathering fiesta scatter prizes…",
        "Igniting festive multipliers…",
        "Fiesta Fireworks is ready!",
      ],
    };
  }
  if (gameId === "golden-panther") {
    return {
      bgImage: "/images/symbols/panther/loading-bg.webp",
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
  if (gameId === "aztec-treasure") {
    return {
      bgImage: "/images/symbols/panther/loading-bg.webp",
      bgGradient: "from-[#3F2A08]/80 via-[#0A0912]/80 to-[#120800]/95",
      titleClass: "panther-title",
      barGradient: "from-[#F59E0B] via-[#FACC15] to-[#D97706]",
      borderGlow: "shadow-[0_0_60px_rgba(245,158,11,0.8)] border-amber-400",
      badgeGradient: "from-[#F59E0B] via-[#FACC15] to-[#78350F]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/panther/wild.png", "/images/symbols/panther/scatter.png"],
      badgeText: "AZTEC TREASURE ARCADE",
      chargeText: "TEMPLE POWER ACTIVE",
      lines: [
        "Entering the ancient Aztec temple…",
        "Awakening temple guardians…",
        "Forging bomb multiplier crystals…",
        "Charging cascading treasure clusters…",
        "Aztec Treasure awaits!",
      ],
    };
  }
  if (gameId === "pirate-plunder") {
    return {
      bgImage: "/images/symbols/panther/loading-bg.webp",
      bgGradient: "from-[#3F2A08]/80 via-[#0A0912]/80 to-[#120800]/95",
      titleClass: "panther-title",
      barGradient: "from-[#F59E0B] via-[#FACC15] to-[#D97706]",
      borderGlow: "shadow-[0_0_60px_rgba(245,158,11,0.8)] border-amber-400",
      badgeGradient: "from-[#F59E0B] via-[#FACC15] to-[#78350F]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/panther/wild.png", "/images/symbols/panther/scatter.png"],
      badgeText: "PIRATE PLUNDER ARCADE",
      chargeText: "TREASURE POWER ACTIVE",
      lines: [
        "Hoisting the pirate sails…",
        "Charting the plunder map…",
        "Forging bomb multiplier crystals…",
        "Charging cascading treasure clusters…",
        "Pirate Plunder awaits!",
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
  if (gameId === "olympus-wrath") {
    return {
      bgImage: "/images/olympus-wrath-loading/bg.png",
      bgGradient: "from-[#1E1B4B]/80 via-[#0A0912]/80 to-[#0F172A]/95",
      titleClass: "godly-title",
      barGradient: "from-[#FACC15] via-[#F97316] to-[#EF4444]",
      borderGlow: "shadow-[0_0_60px_rgba(250,204,21,0.8)] border-amber-300",
      badgeGradient: "from-[#FACC15] via-[#F97316] to-[#991B1B]",
      renderType: "godly-3d" as const,
      imageParticles: [
        "/images/olympus-wrath-loading/lightning_orb.png",
        "/images/olympus-wrath-loading/gem.png",
        "/images/olympus-wrath-loading/lightning_orb.png",
        "/images/olympus-wrath-loading/gem.png",
      ],
      badgeText: "OLYMPIAN WRATH",
      chargeText: "THUNDER MULT ACTIVE",
      lines: [
        "Calling down Zeus wrath…",
        "Opening the thunder gates…",
        "Charging cascade multipliers…",
        "Awakening divine free spins…",
        "Olympus Wrath is ready!",
      ],
    };
  }
  if (gameId === "enchanted-grove") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532D]/80 via-[#0A0912]/80 to-[#052e16]/95",
      titleClass: "godly-title",
      barGradient: "from-[#86EFAC] via-[#34D399] to-[#059669]",
      borderGlow: "shadow-[0_0_60px_rgba(52,211,153,0.8)] border-emerald-300",
      badgeGradient: "from-[#86EFAC] via-[#34D399] to-[#065F46]",
      renderType: "godly-3d" as const,
      imageParticles: [
        "/images/godly-loading/lightning_orb.png",
        "/images/godly-loading/gem.png",
        "/images/godly-loading/lightning_orb.png",
        "/images/godly-loading/gem.png",
      ],
      badgeText: "ENCHANTED GROVE",
      chargeText: "GROVE MULT ACTIVE",
      lines: [
        "Awakening the enchanted grove…",
        "Opening mystical cascade gates…",
        "Charging nature multipliers…",
        "Summoning free-spin spirits…",
        "Enchanted Grove is ready!",
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
  if (gameId === "manila-nights") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#31103F]/80 via-[#0A0912]/80 to-[#1E1B4B]/95",
      titleClass: "celestial-title",
      barGradient: "from-[#F472B6] via-[#C084FC] to-[#38BDF8]",
      borderGlow: "shadow-[0_0_60px_rgba(244,114,182,0.8)] border-pink-400",
      badgeGradient: "from-[#F472B6] via-[#A855F7] to-[#38BDF8]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "MANILA NIGHTS",
      chargeText: "NEON CHARGE ACTIVE",
      lines: [
        "Lighting up the Manila skyline…",
        "Gathering neon scatter dust…",
        "Unlocking golden wild transforms…",
        "Aligning cascade multipliers…",
        "Manila Nights is ready!",
      ],
    };
  }
  if (gameId === "super-ace") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7F1D1D]/80 via-[#1C1917]/85 to-[#450A0A]/95",
      titleClass: "celestial-title",
      barGradient: "from-[#F59E0B] via-[#EF4444] to-[#B91C1C]",
      borderGlow: "shadow-[0_0_60px_rgba(239,68,68,0.75)] border-amber-400",
      badgeGradient: "from-[#F59E0B] via-[#EF4444] to-[#991B1B]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/fire-spike/diamond.webp"],
      badgeText: "LUCKY POKER",
      chargeText: "GOLDEN CARD CHARGE",
      lines: [
        "Shuffling the Lucky Poker deck…",
        "Charging Golden Card transformations…",
        "Calling Little & Big Jokers…",
        "Stacking combo multipliers…",
        "Super Ace is ready!",
      ],
    };
  }
  if (gameId === "mega-ace") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7F1D1D]/80 via-[#1C1917]/85 to-[#450A0A]/95",
      titleClass: "celestial-title",
      barGradient: "from-[#F59E0B] via-[#EF4444] to-[#B91C1C]",
      borderGlow: "shadow-[0_0_60px_rgba(239,68,68,0.75)] border-amber-400",
      badgeGradient: "from-[#F59E0B] via-[#EF4444] to-[#991B1B]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/mega-ace/diamond.png"],
      badgeText: "MEGA POKER",
      chargeText: "GOLDEN CARD CHARGE",
      lines: [
        "Shuffling the Mega Ace deck…",
        "Charging Golden Card transformations…",
        "Calling Little & Big Jokers…",
        "Stacking combo multipliers…",
        "Mega Ace is ready!",
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
  if (
    gameId === "frontier-gold" ||
    gameId === "buffalo-reign" ||
    gameId === "dust-dollars" ||
    gameId === "gold-mine" ||
    gameId === "jeepney-jackpot" ||
    gameId === "desert-riches" ||
    gameId === "outlaw-coins" ||
    gameId === "crystal-cave" ||
    gameId === "diamond-dig" ||
    gameId === "palengke-pays" ||
    gameId === "tricycle-treasure"
  ) {
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
  if (gameId === "cleopatra-gold") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#78350F]/70 via-[#0A0912]/80 to-[#422006]/95",
      titleClass: "western-title",
      barGradient: "from-[#FBBF24] via-[#F59E0B] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#D97706] to-[#78350F]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "NILE TREASURE",
      chargeText: "CAMPFIRE ACTIVE",
      lines: [
        "Awakening Cleopatra’s vault…",
        "Aligning 1,024 ways across the Nile…",
        "Lighting the Golden Campfire…",
        "Opening Treasure Chest Hold & Collect…",
        "Cleopatra Gold is ready!",
      ],
    };
  }
  if (gameId === "carabao-charge") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532D]/70 via-[#0A0912]/80 to-[#422006]/95",
      titleClass: "western-title",
      barGradient: "from-[#FBBF24] via-[#84CC16] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(132,204,22,0.55)] border-lime-400",
      badgeGradient: "from-[#FBBF24] via-[#65A30D] to-[#14532D]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "CARABAO CHARGE",
      chargeText: "CAMPFIRE ACTIVE",
      lines: [
        "Waking the carabao stampede…",
        "Aligning 1,024 ways across the fields…",
        "Lighting the Golden Campfire…",
        "Opening Treasure Chest Hold & Collect…",
        "Carabao Charge is ready!",
      ],
    };
  }
  if (gameId === "ace-high") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532D]/70 via-[#2E1065]/75 to-[#0A0912]/95",
      titleClass: "western-title",
      barGradient: "from-[#FBBF24] via-[#A78BFA] to-[#7C3AED]",
      borderGlow: "shadow-[0_0_60px_rgba(167,139,250,0.75)] border-violet-400",
      badgeGradient: "from-[#FBBF24] via-[#7C3AED] to-[#4C1D95]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "HIGH CARD TABLE",
      chargeText: "WAR TABLE READY",
      lines: [
        "Shuffling the multi-deck shoe…",
        "Marking Tie / War side bets…",
        "Arming Ace Bonus pays…",
        "Felt lights glowing gold…",
        "Ace High — beat the dealer!",
      ],
    };
  }
  if (gameId === "baccarat") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#064E3B]/75 via-[#0A0912]/80 to-[#022C22]/95",
      titleClass: "western-title",
      barGradient: "from-[#FBBF24] via-[#34D399] to-[#059669]",
      borderGlow: "shadow-[0_0_60px_rgba(52,211,153,0.55)] border-emerald-400",
      badgeGradient: "from-[#FBBF24] via-[#10B981] to-[#065F46]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "PUNTO BANCO",
      chargeText: "SHOE READY",
      lines: [
        "Shuffling the 8-deck shoe…",
        "Laying Player · Banker · Tie…",
        "Arming Pair side bets…",
        "Felt lights glowing emerald…",
        "Baccarat — place your bets!",
      ],
    };
  }
  if (gameId === "lucky9") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532D]/75 via-[#0A0912]/80 to-[#052e16]/95",
      titleClass: "western-title",
      barGradient: "from-[#FBBF24] via-[#A3E635] to-[#65A30D]",
      borderGlow: "shadow-[0_0_60px_rgba(163,230,53,0.55)] border-lime-400",
      badgeGradient: "from-[#FBBF24] via-[#84CC16] to-[#365314]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "LUCKY 9 TABLE",
      chargeText: "NATURAL 9 READY",
      lines: [
        "Shuffling the multi-deck shoe…",
        "Closer to 9 — no commission…",
        "Arming Natural 9 checks…",
        "Symmetric third-card rule…",
        "Lucky 9 — place your bets!",
      ],
    };
  }
  if (gameId === "threecardpoker") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#0E5236]/75 via-[#05100B]/85 to-[#052718]/95",
      titleClass: "western-title",
      barGradient: "from-[#F8E7B0] via-[#E8C96A] to-[#0F8A3C]",
      borderGlow: "shadow-[0_0_60px_rgba(232,201,106,0.45)] border-[#E8C96A]",
      badgeGradient: "from-[#F8E7B0] via-[#C9A227] to-[#0E5236]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "THREE CARD POKER",
      chargeText: "ANTE / PLAY READY",
      lines: [
        "Shuffling the three-card deck…",
        "Marking Ante & Pair Plus…",
        "Dealer qualify: Queen-high…",
        "Straight beats Flush…",
        "Three Card Poker — place your Ante!",
      ],
    };
  }
  if (gameId === "color-game") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#1e3a8a]/70 via-[#0b1220]/85 to-[#831843]/90",
      titleClass: "western-title",
      barGradient: "from-[#F472B6] via-[#FBBF24] to-[#38BDF8]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.45)] border-amber-300",
      badgeGradient: "from-[#F472B6] via-[#FBBF24] to-[#3B82F6]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "COLOR GAME",
      chargeText: "WHEEL READY",
      lines: [
        "Painting the color pads…",
        "Balancing the six-face die…",
        "Warming the perya wheel…",
        "Chip trays locked…",
        "Color Game — pick your colors!",
      ],
    };
  }
  if (gameId === "tongits-arena") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532D]/75 via-[#0A0912]/85 to-[#052e16]/95",
      titleClass: "western-title",
      barGradient: "from-[#F8E7B0] via-[#E8C96A] to-[#0F8A3C]",
      borderGlow: "shadow-[0_0_60px_rgba(232,201,106,0.45)] border-[#E8C96A]",
      badgeGradient: "from-[#F8E7B0] via-[#C9A227] to-[#14532D]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "TONGITS ARENA",
      chargeText: "FIGHT POT READY",
      lines: [
        "Clearing the arena felt…",
        "Stacking the fight pot…",
        "Arming side-pot pays…",
        "Dealer qualify armed…",
        "Tongits Arena — buy into the fight!",
      ],
    };
  }
  if (gameId === "lucky-drop") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#083344]/75 via-[#071018]/85 to-[#0c4a6e]/95",
      titleClass: "western-title",
      barGradient: "from-[#67E8F9] via-[#22D3EE] to-[#0284C7]",
      borderGlow: "shadow-[0_0_60px_rgba(34,211,238,0.45)] border-cyan-300",
      badgeGradient: "from-[#A5F3FC] via-[#22D3EE] to-[#0E7490]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "LUCKY DROP",
      chargeText: "LANES READY",
      lines: [
        "Numbering lanes 1–10…",
        "Loading the drop ball…",
        "Calibrating 9× pays…",
        "Chip rails locked…",
        "Lucky Drop — pick your lanes!",
      ],
    };
  }
  if (gameId === "fire-spike") {
    return {
      bgImage: "/images/fire-spike-bg.webp",
      bgGradient: "from-[#450A0A]/55 via-[#0A0912]/70 to-[#7F1D1D]/85",
      titleClass: "fire-title",
      barGradient: "from-[#F97316] via-[#EF4444] to-[#FACC15]",
      borderGlow: "shadow-[0_0_60px_rgba(249,115,22,0.8)] border-orange-500",
      badgeGradient: "from-[#F97316] via-[#DC2626] to-[#991B1B]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/fire-spike/scatter.webp", "/images/symbols/fire-spike/wild.webp"],
      badgeText: "MOLTEN ARCADE",
      chargeText: "HEAT SURGE ACTIVE",
      lines: [
        "Igniting molten lava reels…",
        "Heating Wild + Scatter mix prizes…",
        "Charging the 25,000× Grand Jackpot…",
        "Blazing 10-line fire strike…",
        "Fire Spike is roaring!",
      ],
    };
  }
  if (gameId === "boxing-king") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#1e3a5f]/55 via-[#0A0912]/70 to-[#7c2d12]/85",
      titleClass: "fire-title",
      barGradient: "from-[#F97316] via-[#EF4444] to-[#FACC15]",
      borderGlow: "shadow-[0_0_60px_rgba(249,115,22,0.8)] border-orange-500",
      badgeGradient: "from-[#F97316] via-[#DC2626] to-[#991B1B]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/boxing-king/scatter.webp",
        "/images/symbols/boxing-king/wild.webp",
      ],
      badgeText: "RING READY",
      chargeText: "CHAMPION CHARGE",
      lines: [
        "Stepping into the Boxing King arena…",
        "Warming Wild + Scatter mix prizes…",
        "Charging the Grand Jackpot…",
        "Locking 10-line paylines…",
        "Boxing King is ready!",
      ],
    };
  }
  if (gameId === "goal-rush") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532d]/55 via-[#0A0912]/70 to-[#1e3a5f]/85",
      titleClass: "fire-title",
      barGradient: "from-[#22C55E] via-[#FACC15] to-[#F97316]",
      borderGlow: "shadow-[0_0_60px_rgba(34,197,94,0.8)] border-green-500",
      badgeGradient: "from-[#22C55E] via-[#15803D] to-[#14532d]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/goal-rush/scatter.webp",
        "/images/symbols/goal-rush/wild.webp",
      ],
      badgeText: "KICKOFF READY",
      chargeText: "GOAL SURGE",
      lines: [
        "Stepping onto the Goal Rush pitch…",
        "Warming Wild + Scatter mix prizes…",
        "Charging the Grand Jackpot…",
        "Locking 10-line paylines…",
        "Goal Rush is ready!",
      ],
    };
  }
  if (gameId === "money-coming") {
    return {
      bgImage: "/images/money-coming-bg.webp",
      bgGradient: "from-[#14532D]/60 via-[#052e16]/80 to-[#422006]/90",
      titleClass: "fortune-title",
      barGradient: "from-[#FDE047] via-[#22C55E] to-[#A16207]",
      borderGlow: "shadow-[0_0_60px_rgba(253,224,71,0.7)] border-yellow-400",
      badgeGradient: "from-[#FDE047] via-[#22C55E] to-[#854D0E]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/money-coming/scatter.webp",
        "/images/symbols/money-coming/wild.webp",
      ],
      badgeText: "MONEY RAIN",
      chargeText: "CASH FLOW ACTIVE",
      lines: [
        "Stacking the gold bars…",
        "Spinning the cash reels…",
        "Charging Money Coming symbols…",
        "Priming the jackpot grid…",
        "Money Coming is ready!",
      ],
    };
  }
  if (gameId === "fortune-gems") {
    return {
      bgImage: "/images/fortune-gems-bg.webp",
      bgGradient: "from-[#4A1D0A]/55 via-[#0C0814]/70 to-[#7C2D12]/85",
      titleClass: "fortune-title",
      barGradient: "from-[#FBBF24] via-[#F43F5E] to-[#A16207]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-500",
      badgeGradient: "from-[#FBBF24] via-[#F43F5E] to-[#7C2D12]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "TEMPLE GEMS",
      chargeText: "MULTIPLIER REEL ACTIVE",
      lines: [
        "Opening the temple vault…",
        "Spinning the gemstone grid…",
        "Charging the multiplier reel…",
        "Aligning five fortune lines…",
        "Fortune Gems is ready!",
      ],
    };
  }
  if (gameId === "fortune-ox") {
    return {
      bgImage: "/images/fortune-ox-bg.webp",
      bgGradient: "from-[#7F1D1D]/55 via-[#0C0814]/70 to-[#B45309]/85",
      titleClass: "fortune-title",
      barGradient: "from-[#FBBF24] via-[#EF4444] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#EF4444] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "YEAR OF THE OX",
      chargeText: "MULTIPLIER REEL ACTIVE",
      lines: [
        "Awakening the golden ox…",
        "Spinning the fortune grid…",
        "Charging the multiplier reel…",
        "Aligning five lucky lines…",
        "Fortune Ox is ready!",
      ],
    };
  }
  if (gameId === "sari-sari-spin") {
    return {
      bgImage: "/images/sari-sari-spin-bg.webp",
      bgGradient: "from-[#7F1D1D]/55 via-[#0C0814]/70 to-[#B45309]/85",
      titleClass: "fortune-title",
      barGradient: "from-[#FBBF24] via-[#EF4444] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#EF4444] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "SARI-SARI LUCK",
      chargeText: "MULTIPLIER REEL ACTIVE",
      lines: [
        "Opening the sari-sari store…",
        "Spinning the fortune grid…",
        "Charging the multiplier reel…",
        "Aligning five lucky lines…",
        "Sari-Sari Spin is ready!",
      ],
    };
  }
  if (gameId === "fortune-tiger") {
    return {
      bgImage: "/images/fortune-tiger-bg.webp",
      bgGradient: "from-[#7F1D1D]/55 via-[#0C0814]/70 to-[#B45309]/85",
      titleClass: "fortune-title",
      barGradient: "from-[#FBBF24] via-[#EF4444] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#EF4444] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "YEAR OF THE TIGER",
      chargeText: "MULTIPLIER REEL ACTIVE",
      lines: [
        "Awakening the golden tiger…",
        "Spinning the fortune grid…",
        "Charging the multiplier reel…",
        "Aligning five lucky lines…",
        "Fortune Tiger is ready!",
      ],
    };
  }
  if (gameId === "fortune-rabbit") {
    return {
      bgImage: "/images/fortune-rabbit-bg.webp",
      bgGradient: "from-[#7F1D1D]/55 via-[#0C0814]/70 to-[#B45309]/85",
      titleClass: "fortune-title",
      barGradient: "from-[#FBBF24] via-[#EF4444] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#EF4444] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "YEAR OF THE RABBIT",
      chargeText: "MULTIPLIER REEL ACTIVE",
      lines: [
        "Awakening the golden rabbit…",
        "Spinning the fortune grid…",
        "Charging the multiplier reel…",
        "Aligning five lucky lines…",
        "Fortune Rabbit is ready!",
      ],
    };
  }
  if (gameId === "pug-den" || gameId === "pup-den") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#431407]/60 via-[#1c1917]/75 to-[#78350f]/85",
      titleClass: "godly-title",
      barGradient: "from-[#F59E0B] via-[#F97316] to-[#FB7185]",
      borderGlow: "shadow-[0_0_60px_rgba(245,158,11,0.7)] border-amber-500",
      badgeGradient: "from-[#D97706] via-[#EA580C] to-[#BE123C]",
      renderType: "standard" as const,
      imageParticles: [] as string[],
      badgeText: "THE PUG DEN",
      chargeText: "TREAT ENERGY HIGH",
      lines: [
        "Walking the pug reels…",
        "Stacking Treat Wild multipliers…",
        "Warming the Dawg's Den toaster…",
        "Sticky Treats locking in…",
        "Welcome to the Pug Den!",
      ],
    };
  }
  if (gameId === "fruit-riot") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7c3aed]/70 via-[#db2777]/65 to-[#ea580c]/75",
      titleClass: "godly-title",
      barGradient: "from-[#ffe566] via-[#ff4d9e] to-[#a78bfa]",
      borderGlow: "shadow-[0_0_50px_rgba(244,114,182,0.55)] border-pink-300",
      badgeGradient: "from-[#ff4d9e] via-[#c026d3] to-[#f59e0b]",
      renderType: "standard" as const,
      imageParticles: [] as string[],
      badgeText: "FRUIT RIOT",
      chargeText: "PARTY MODE",
      lines: [
        "Cranking up the fruit party…",
        "Loading glossy icons…",
        "Igniting the jackpot glow…",
        "Warming Hold switches…",
        "Fruit Riot is ready!",
      ],
    };
  }

  if (gameId === "lucky-neko") {
    return {
      bgImage: "/images/lucky-neko-bg.webp",
      bgGradient: "from-[#7F1D1D]/55 via-[#0C0814]/70 to-[#B45309]/85",
      titleClass: "fortune-title",
      barGradient: "from-[#FBBF24] via-[#EF4444] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#EF4444] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "LUCKY NEKO",
      chargeText: "MULTIPLIER REEL ACTIVE",
      lines: [
        "Awakening the lucky neko…",
        "Spinning the fortune grid…",
        "Charging the multiplier reel…",
        "Aligning five lucky lines…",
        "Lucky Neko is ready!",
      ],
    };
  }
  if (gameId === "fortune-mouse") {
    return {
      bgImage: "/images/fortune-mouse-bg.webp",
      bgGradient: "from-[#7F1D1D]/55 via-[#0C0814]/70 to-[#B45309]/85",
      titleClass: "fortune-title",
      barGradient: "from-[#FBBF24] via-[#EF4444] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#EF4444] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "YEAR OF THE MOUSE",
      chargeText: "MULTIPLIER REEL ACTIVE",
      lines: [
        "Awakening the fortune mouse…",
        "Spinning the fortune grid…",
        "Charging the multiplier reel…",
        "Aligning five lucky lines…",
        "Fortune Mouse is ready!",
      ],
    };
  }
  if (gameId === "prosperity-lion") {
    return {
      bgImage: "/images/prosperity-lion-bg.webp",
      bgGradient: "from-[#7F1D1D]/55 via-[#0C0814]/70 to-[#B45309]/85",
      titleClass: "fortune-title",
      barGradient: "from-[#FBBF24] via-[#EF4444] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#EF4444] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "PROSPERITY LION",
      chargeText: "MULTIPLIER REEL ACTIVE",
      lines: [
        "Awakening the guardian lion…",
        "Spinning the fortune grid…",
        "Charging the multiplier reel…",
        "Aligning five lucky lines…",
        "Prosperity Lion is ready!",
      ],
    };
  }
  if (gameId === "coin-volcano") {
    return {
      bgImage: "/images/coin-volcano-bg.webp",
      bgGradient: "from-[#14532D]/60 via-[#052e16]/80 to-[#422006]/90",
      titleClass: "fortune-title",
      barGradient: "from-[#FDE047] via-[#22C55E] to-[#A16207]",
      borderGlow: "shadow-[0_0_60px_rgba(253,224,71,0.7)] border-yellow-400",
      badgeGradient: "from-[#FDE047] via-[#22C55E] to-[#854D0E]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/coin-volcano/scatter.webp",
        "/images/symbols/coin-volcano/wild.webp",
      ],
      badgeText: "COIN ERUPTION",
      chargeText: "LAVA CASH ACTIVE",
      lines: [
        "Heating the magma vault…",
        "Spinning the coin reels…",
        "Charging Coin Volcano symbols…",
        "Priming the jackpot grid…",
        "Coin Volcano is ready!",
      ],
    };
  }
  if (gameId === "cash-mania") {
    return {
      bgImage: "/images/cash-mania-bg.webp",
      bgGradient: "from-[#14532D]/60 via-[#052e16]/80 to-[#422006]/90",
      titleClass: "fortune-title",
      barGradient: "from-[#FDE047] via-[#22C55E] to-[#A16207]",
      borderGlow: "shadow-[0_0_60px_rgba(253,224,71,0.7)] border-yellow-400",
      badgeGradient: "from-[#FDE047] via-[#22C55E] to-[#854D0E]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/cash-mania/scatter.webp",
        "/images/symbols/cash-mania/wild.webp",
      ],
      badgeText: "CASH MANIA",
      chargeText: "CASH FLOW ACTIVE",
      lines: [
        "Stacking the mania bills…",
        "Spinning the cash reels…",
        "Charging Cash Mania symbols…",
        "Priming the jackpot grid…",
        "Cash Mania is ready!",
      ],
    };
  }
  if (gameId === "zeus-strike") {
    return {
      bgImage: "/images/zeus-strike-loading/bg.png",
      bgGradient: "from-[#1E1B4B]/80 via-[#0A0912]/80 to-[#0F172A]/95",
      titleClass: "godly-title",
      barGradient: "from-[#FACC15] via-[#F97316] to-[#EF4444]",
      borderGlow: "shadow-[0_0_60px_rgba(250,204,21,0.8)] border-amber-300",
      badgeGradient: "from-[#FACC15] via-[#F97316] to-[#991B1B]",
      renderType: "godly-3d" as const,
      imageParticles: [
        "/images/zeus-strike-loading/lightning_orb.png",
        "/images/zeus-strike-loading/gem.png",
        "/images/zeus-strike-loading/lightning_orb.png",
        "/images/zeus-strike-loading/gem.png",
      ],
      badgeText: "ZEUS STRIKE",
      chargeText: "THUNDER MULT ACTIVE",
      lines: [
        "Calling down Zeus strike…",
        "Opening the thunder gates…",
        "Charging cascade multipliers…",
        "Awakening divine free spins…",
        "Zeus Strike is ready!",
      ],
    };
  }
  if (gameId === "thor-thunder") {
    return {
      bgImage: "/images/thor-thunder-loading/bg.png",
      bgGradient: "from-[#1E1B4B]/80 via-[#0A0912]/80 to-[#0F172A]/95",
      titleClass: "godly-title",
      barGradient: "from-[#FACC15] via-[#F97316] to-[#EF4444]",
      borderGlow: "shadow-[0_0_60px_rgba(250,204,21,0.8)] border-amber-300",
      badgeGradient: "from-[#FACC15] via-[#F97316] to-[#991B1B]",
      renderType: "godly-3d" as const,
      imageParticles: [
        "/images/thor-thunder-loading/lightning_orb.png",
        "/images/thor-thunder-loading/gem.png",
        "/images/thor-thunder-loading/lightning_orb.png",
        "/images/thor-thunder-loading/gem.png",
      ],
      badgeText: "THOR THUNDER",
      chargeText: "HAMMER MULT ACTIVE",
      lines: [
        "Calling down Thor's hammer…",
        "Opening the thunder gates…",
        "Charging cascade multipliers…",
        "Awakening divine free spins…",
        "Thor Thunder is ready!",
      ],
    };
  }
  if (gameId === "maya-gold") {
    return {
      bgImage: "/images/symbols/panther/loading-bg.webp",
      bgGradient: "from-[#3F2A08]/80 via-[#0A0912]/80 to-[#120800]/95",
      titleClass: "panther-title",
      barGradient: "from-[#F59E0B] via-[#FACC15] to-[#D97706]",
      borderGlow: "shadow-[0_0_60px_rgba(245,158,11,0.8)] border-amber-400",
      badgeGradient: "from-[#F59E0B] via-[#FACC15] to-[#78350F]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/panther/wild.png", "/images/symbols/panther/scatter.png"],
      badgeText: "MAYA GOLD ARCADE",
      chargeText: "TEMPLE POWER ACTIVE",
      lines: [
        "Entering the Maya temple…",
        "Awakening temple guardians…",
        "Forging bomb multiplier crystals…",
        "Charging cascading treasure clusters…",
        "Maya Gold awaits!",
      ],
    };
  }
  if (gameId === "temple-rush") {
    return {
      bgImage: "/images/symbols/panther/loading-bg.webp",
      bgGradient: "from-[#3F2A08]/80 via-[#0A0912]/80 to-[#120800]/95",
      titleClass: "panther-title",
      barGradient: "from-[#F59E0B] via-[#FACC15] to-[#D97706]",
      borderGlow: "shadow-[0_0_60px_rgba(245,158,11,0.8)] border-amber-400",
      badgeGradient: "from-[#F59E0B] via-[#FACC15] to-[#78350F]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/panther/wild.png", "/images/symbols/panther/scatter.png"],
      badgeText: "TEMPLE RUSH ARCADE",
      chargeText: "TREASURE POWER ACTIVE",
      lines: [
        "Racing into the temple…",
        "Charting the relic map…",
        "Forging bomb multiplier crystals…",
        "Charging cascading treasure clusters…",
        "Temple Rush awaits!",
      ],
    };
  }
  if (gameId === "mahjong-ways-3") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#0B3D2E]/55 via-[#061210]/75 to-[#020806]/95",
      titleClass: "mahjong-title",
      barGradient: "from-[#F5D76E] via-[#C9A227] to-[#8B1A1A]",
      borderGlow: "border-[#C9A227]/70",
      badgeGradient: "from-[#C9A227] via-[#8B1A1A] to-[#0B3D2E]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/mahjong-ways-3/bamboo.png",
        "/images/symbols/mahjong-ways-3/red_dragon.png",
        "/images/symbols/mahjong-ways-3/dot.webp",
      ],
      badgeText: "WAYS TO WIN",
      chargeText: "TILES READY",
      accent: "#C9A227",
      lines: [
        "Laying the jade felt…",
        "Arranging bamboo & dragon tiles…",
        "Goldifying wilds across the grid…",
        "Charging cascade multipliers…",
        "Mahjong Ways 3 is ready!",
      ],
    };
  }
  if (gameId === "wild-ace") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7F1D1D]/80 via-[#1C1917]/85 to-[#450A0A]/95",
      titleClass: "celestial-title",
      barGradient: "from-[#F59E0B] via-[#EF4444] to-[#B91C1C]",
      borderGlow: "shadow-[0_0_60px_rgba(239,68,68,0.75)] border-amber-400",
      badgeGradient: "from-[#F59E0B] via-[#EF4444] to-[#991B1B]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/wild-ace/diamond.png"],
      badgeText: "WILD POKER",
      chargeText: "GOLDEN CARD CHARGE",
      lines: [
        "Shuffling the Wild Ace deck…",
        "Charging Golden Card transformations…",
        "Calling Little & Big Jokers…",
        "Stacking combo multipliers…",
        "Wild Ace is ready!",
      ],
    };
  }
  if (gameId === "royal-ace") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7F1D1D]/80 via-[#1C1917]/85 to-[#450A0A]/95",
      titleClass: "celestial-title",
      barGradient: "from-[#F59E0B] via-[#EF4444] to-[#B91C1C]",
      borderGlow: "shadow-[0_0_60px_rgba(239,68,68,0.75)] border-amber-400",
      badgeGradient: "from-[#F59E0B] via-[#EF4444] to-[#991B1B]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/fire-spike/diamond.webp"],
      badgeText: "ROYAL POKER",
      chargeText: "GOLDEN CARD CHARGE",
      lines: [
        "Shuffling the Royal Ace deck…",
        "Charging Golden Card transformations…",
        "Calling Little & Big Jokers…",
        "Stacking combo multipliers…",
        "Royal Ace is ready!",
      ],
    };
  }
  if (gameId === "neon-fruits") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7f1d1d]/70 via-[#831843]/65 to-[#a16207]/75",
      titleClass: "godly-title",
      barGradient: "from-[#fde047] via-[#f97316] to-[#ef4444]",
      borderGlow: "shadow-[0_0_50px_rgba(253,224,71,0.55)] border-yellow-300",
      badgeGradient: "from-[#facc15] via-[#f97316] to-[#b91c1c]",
      renderType: "standard" as const,
      imageParticles: [] as string[],
      badgeText: "NEON FRUITS",
      chargeText: "NEON HOLD MODE",
      lines: [
        "Lighting up the neon fruits…",
        "Loading classic reels…",
        "Charging Double Wild jackpots…",
        "Warming Hold switches…",
        "Neon Fruits is ready!",
      ],
    };
  }
  if (gameId === "lucky-bars") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7f1d1d]/70 via-[#831843]/65 to-[#a16207]/75",
      titleClass: "godly-title",
      barGradient: "from-[#fde047] via-[#f97316] to-[#ef4444]",
      borderGlow: "shadow-[0_0_50px_rgba(253,224,71,0.55)] border-yellow-300",
      badgeGradient: "from-[#facc15] via-[#f97316] to-[#b91c1c]",
      renderType: "standard" as const,
      imageParticles: [] as string[],
      badgeText: "LUCKY BARS",
      chargeText: "NEON HOLD MODE",
      lines: [
        "Lighting up the lucky bars…",
        "Loading classic reels…",
        "Charging Double Wild jackpots…",
        "Warming Hold switches…",
        "Lucky Bars is ready!",
      ],
    };
  }

  if (gameId === "crazy-sevens") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7f1d1d]/70 via-[#831843]/65 to-[#a16207]/75",
      titleClass: "godly-title",
      barGradient: "from-[#fde047] via-[#f97316] to-[#ef4444]",
      borderGlow: "shadow-[0_0_50px_rgba(253,224,71,0.55)] border-yellow-300",
      badgeGradient: "from-[#facc15] via-[#f97316] to-[#b91c1c]",
      renderType: "standard" as const,
      imageParticles: [] as string[],
      badgeText: "CRAZY 7s",
      chargeText: "NEON HOLD MODE",
      lines: [
        "Lighting up the neon 7s…",
        "Loading classic reels…",
        "Charging Double Wild jackpots…",
        "Warming Hold switches…",
        "Crazy Sevens is ready!",
      ],
    };
  }
  if (
    category === "cards" ||
    gameId.includes("ace") ||
    gameId.includes("baccarat") ||
    gameId.includes("lucky") ||
    gameId.includes("poker")
  ) {
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


  if (gameId === "knockout-king") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#1e3a5f]/55 via-[#0A0912]/70 to-[#7c2d12]/85",
      titleClass: "fire-title",
      barGradient: "from-[#F97316] via-[#EF4444] to-[#FACC15]",
      borderGlow: "shadow-[0_0_60px_rgba(249,115,22,0.8)] border-orange-500",
      badgeGradient: "from-[#F97316] via-[#DC2626] to-[#991B1B]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/knockout-king/scatter.webp",
        "/images/symbols/knockout-king/wild.webp",
      ],
      badgeText: "RING READY",
      chargeText: "CHAMPION CHARGE",
      lines: [
        "Stepping into the Knockout King arena…",
        "Warming Wild + Scatter mix prizes…",
        "Charging the Grand Jackpot…",
        "Locking 10-line paylines…",
        "Knockout King is ready!",
      ],
    };
  }

  if (gameId === "arena-champ") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532d]/55 via-[#0A0912]/70 to-[#1e3a5f]/85",
      titleClass: "fire-title",
      barGradient: "from-[#22C55E] via-[#FACC15] to-[#F97316]",
      borderGlow: "shadow-[0_0_60px_rgba(34,197,94,0.8)] border-green-500",
      badgeGradient: "from-[#22C55E] via-[#15803D] to-[#14532d]",
      renderType: "standard" as const,
      imageParticles: [
        "/images/symbols/arena-champ/scatter.webp",
        "/images/symbols/arena-champ/wild.webp",
      ],
      badgeText: "KICKOFF READY",
      chargeText: "GOAL SURGE",
      lines: [
        "Stepping onto the Arena Champ pitch…",
        "Warming Wild + Scatter mix prizes…",
        "Charging the Grand Jackpot…",
        "Locking 10-line paylines…",
        "Arena Champ is ready!",
      ],
    };
  }

  if (gameId === "safari-gold") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532D]/70 via-[#0A0912]/80 to-[#422006]/95",
      titleClass: "western-title",
      barGradient: "from-[#FBBF24] via-[#84CC16] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(132,204,22,0.55)] border-lime-400",
      badgeGradient: "from-[#FBBF24] via-[#65A30D] to-[#14532D]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "SAFARI GOLD",
      chargeText: "CAMPFIRE ACTIVE",
      lines: [
        "Waking the safari stampede…",
        "Aligning 1,024 ways across the savanna…",
        "Lighting the Golden Campfire…",
        "Opening Treasure Chest Hold & Collect…",
        "Safari Gold is ready!",
      ],
    };
  }

  if (gameId === "pharaoh-fire") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#78350F]/70 via-[#0A0912]/80 to-[#422006]/95",
      titleClass: "western-title",
      barGradient: "from-[#FBBF24] via-[#F59E0B] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#D97706] to-[#78350F]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "PHARAOH FIRE",
      chargeText: "CAMPFIRE ACTIVE",
      lines: [
        "Awakening Pharaoh’s vault…",
        "Aligning 1,024 ways across the Nile…",
        "Lighting the Golden Campfire…",
        "Opening Treasure Chest Hold & Collect…",
        "Pharaoh Fire is ready!",
      ],
    };
  }

  if (gameId === "starlight-ways") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#31103F]/80 via-[#0A0912]/80 to-[#1E1B4B]/95",
      titleClass: "celestial-title",
      barGradient: "from-[#F472B6] via-[#C084FC] to-[#38BDF8]",
      borderGlow: "shadow-[0_0_60px_rgba(244,114,182,0.8)] border-pink-400",
      badgeGradient: "from-[#F472B6] via-[#A855F7] to-[#38BDF8]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "STARLIGHT WAYS",
      chargeText: "STARLIGHT CHARGE ACTIVE",
      lines: [
        "Consulting the Star Princess…",
        "Gathering starlight scatter dust…",
        "Unlocking winged multiplier wilds…",
        "Aligning celestial constellations…",
        "Starlight Ways is ready!",
      ],
    };
  }

  if (gameId === "galaxy-ace") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#31103F]/80 via-[#0A0912]/80 to-[#1E1B4B]/95",
      titleClass: "celestial-title",
      barGradient: "from-[#F472B6] via-[#C084FC] to-[#38BDF8]",
      borderGlow: "shadow-[0_0_60px_rgba(244,114,182,0.8)] border-pink-400",
      badgeGradient: "from-[#F472B6] via-[#A855F7] to-[#38BDF8]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "GALAXY ACE",
      chargeText: "STARLIGHT CHARGE ACTIVE",
      lines: [
        "Consulting the Star Princess…",
        "Gathering starlight scatter dust…",
        "Unlocking winged multiplier wilds…",
        "Aligning celestial constellations…",
        "Galaxy Ace is ready!",
      ],
    };
  }

  if (gameId === "gate-of-ra") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532D]/80 via-[#0A0912]/80 to-[#052e16]/95",
      titleClass: "godly-title",
      barGradient: "from-[#86EFAC] via-[#34D399] to-[#059669]",
      borderGlow: "shadow-[0_0_60px_rgba(52,211,153,0.8)] border-emerald-300",
      badgeGradient: "from-[#86EFAC] via-[#34D399] to-[#065F46]",
      renderType: "godly-3d" as const,
      imageParticles: [
        "/images/godly-loading/lightning_orb.png",
        "/images/godly-loading/gem.png",
        "/images/godly-loading/lightning_orb.png",
        "/images/godly-loading/gem.png",
      ],
      badgeText: "GATE OF RA",
      chargeText: "GROVE MULT ACTIVE",
      lines: [
        "Awakening the mystic gates…",
        "Opening cascade ways…",
        "Charging nature multipliers…",
        "Summoning free-spin spirits…",
        "Gate of Ra is ready!",
      ],
    };
  }


  if (gameId === "halo-halo-hits") {
    return {
      bgImage: "/images/halo-halo-hits-bg.webp",
      bgGradient: "from-[#7F1D1D]/55 via-[#0C0814]/70 to-[#B45309]/85",
      titleClass: "fortune-title",
      barGradient: "from-[#FBBF24] via-[#EF4444] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#EF4444] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "HALO-HALO HITS",
      chargeText: "MULTIPLIER REEL ACTIVE",
      lines: [
        "Scooping the halo-halo…",
        "Spinning the fortune grid…",
        "Charging the multiplier reel…",
        "Aligning five lucky lines…",
        "Halo-Halo Hits is ready!",
      ],
    };
  }


  if (gameId === "balut-bonus") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7F1D1D]/55 via-[#0C0814]/70 to-[#B45309]/85",
      titleClass: "fortune-title",
      barGradient: "from-[#FBBF24] via-[#EF4444] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(251,191,36,0.75)] border-amber-400",
      badgeGradient: "from-[#FBBF24] via-[#EF4444] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "BALUT BONUS",
      chargeText: "MULTIPLIER REEL ACTIVE",
      lines: [
        "Cracking the balut bonus…",
        "Spinning the fortune grid…",
        "Charging the multiplier reel…",
        "Aligning five lucky lines…",
        "Balut Bonus is ready!",
      ],
    };
  }


  if (gameId === "sinigang-spin") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7F1D1D]/80 via-[#450A0A]/80 to-[#0A0912]/95",
      titleClass: "godly-title",
      barGradient: "from-[#FACC15] via-[#EF4444] to-[#B91C1C]",
      borderGlow: "shadow-[0_0_60px_rgba(239,68,68,0.8)] border-yellow-400",
      badgeGradient: "from-[#EF4444] via-[#F59E0B] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "SINIGANG SPIN",
      chargeText: "FIESTA CHARGE ACTIVE",
      accent: "#FACC15",
      lines: [
        "Simmering the sinigang pot…",
        "Awakening dragon & monkey bonuses…",
        "Gathering fiesta scatter prizes…",
        "Igniting festive multipliers…",
        "Sinigang Spin is ready!",
      ],
    };
  }


  if (gameId === "lechon-luck") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7F1D1D]/80 via-[#450A0A]/80 to-[#0A0912]/95",
      titleClass: "godly-title",
      barGradient: "from-[#FACC15] via-[#EF4444] to-[#B91C1C]",
      borderGlow: "shadow-[0_0_60px_rgba(239,68,68,0.8)] border-yellow-400",
      badgeGradient: "from-[#EF4444] via-[#F59E0B] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "LECHON LUCK",
      chargeText: "FIESTA CHARGE ACTIVE",
      accent: "#FACC15",
      lines: [
        "Carving the lechon feast…",
        "Awakening dragon & monkey bonuses…",
        "Gathering fiesta scatter prizes…",
        "Igniting festive multipliers…",
        "Lechon Luck is ready!",
      ],
    };
  }


  if (gameId === "lantern-luck") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#7F1D1D]/80 via-[#450A0A]/80 to-[#0A0912]/95",
      titleClass: "godly-title",
      barGradient: "from-[#FACC15] via-[#EF4444] to-[#B91C1C]",
      borderGlow: "shadow-[0_0_60px_rgba(239,68,68,0.8)] border-yellow-400",
      badgeGradient: "from-[#EF4444] via-[#F59E0B] to-[#7F1D1D]",
      renderType: "standard" as const,
      imageParticles: [],
      badgeText: "LANTERN LUCK",
      chargeText: "FIESTA CHARGE ACTIVE",
      accent: "#FACC15",
      lines: [
        "Lighting the lantern parade…",
        "Awakening dragon & monkey bonuses…",
        "Gathering fiesta scatter prizes…",
        "Igniting festive multipliers…",
        "Lantern Luck is ready!",
      ],
    };
  }


  if (gameId === "neon-makati") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#31103F]/80 via-[#0A0912]/80 to-[#1E1B4B]/95",
      titleClass: "celestial-title",
      barGradient: "from-[#F472B6] via-[#C084FC] to-[#38BDF8]",
      borderGlow: "shadow-[0_0_60px_rgba(244,114,182,0.8)] border-pink-400",
      badgeGradient: "from-[#F472B6] via-[#A855F7] to-[#38BDF8]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "NEON MAKATI",
      chargeText: "NEON CHARGE ACTIVE",
      lines: [
        "Lighting up the Makati skyline…",
        "Gathering neon scatter dust…",
        "Unlocking golden wild transforms…",
        "Aligning cascade multipliers…",
        "Neon Makati is ready!",
      ],
    };
  }


  if (gameId === "quezon-quest") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#31103F]/80 via-[#0A0912]/80 to-[#1E1B4B]/95",
      titleClass: "celestial-title",
      barGradient: "from-[#F472B6] via-[#C084FC] to-[#38BDF8]",
      borderGlow: "shadow-[0_0_60px_rgba(244,114,182,0.8)] border-pink-400",
      badgeGradient: "from-[#F472B6] via-[#A855F7] to-[#38BDF8]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "QUEZON QUEST",
      chargeText: "NEON CHARGE ACTIVE",
      lines: [
        "Lighting up Quezon City…",
        "Gathering neon scatter dust…",
        "Unlocking golden wild transforms…",
        "Aligning cascade multipliers…",
        "Quezon Quest is ready!",
      ],
    };
  }


  if (gameId === "carabao-cash") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532D]/70 via-[#0A0912]/80 to-[#422006]/95",
      titleClass: "western-title",
      barGradient: "from-[#FBBF24] via-[#84CC16] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(132,204,22,0.55)] border-lime-400",
      badgeGradient: "from-[#FBBF24] via-[#65A30D] to-[#14532D]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "CARABAO CASH",
      chargeText: "CAMPFIRE ACTIVE",
      lines: [
        "Waking the carabao stampede…",
        "Aligning 1,024 ways across the fields…",
        "Lighting the Golden Campfire…",
        "Opening Treasure Chest Hold & Collect…",
        "Carabao Cash is ready!",
      ],
    };
  }


  if (gameId === "rice-field-riches") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532D]/70 via-[#0A0912]/80 to-[#422006]/95",
      titleClass: "western-title",
      barGradient: "from-[#FBBF24] via-[#84CC16] to-[#B45309]",
      borderGlow: "shadow-[0_0_60px_rgba(132,204,22,0.55)] border-lime-400",
      badgeGradient: "from-[#FBBF24] via-[#65A30D] to-[#14532D]",
      renderType: "standard" as const,
      imageParticles: ["/images/godly-loading/gem.png"],
      badgeText: "RICE FIELD RICHES",
      chargeText: "CAMPFIRE ACTIVE",
      lines: [
        "Wading into the rice paddies…",
        "Aligning 1,024 ways across the fields…",
        "Lighting the Golden Campfire…",
        "Opening Treasure Chest Hold & Collect…",
        "Rice Field Riches is ready!",
      ],
    };
  }


  if (gameId === "wild-panther") {
    return {
      bgImage: "/images/symbols/panther/loading-bg.webp",
      bgGradient: "from-[#3F2A08]/80 via-[#0A0912]/80 to-[#120800]/95",
      titleClass: "panther-title",
      barGradient: "from-[#F59E0B] via-[#FACC15] to-[#D97706]",
      borderGlow: "shadow-[0_0_60px_rgba(245,158,11,0.8)] border-amber-400",
      badgeGradient: "from-[#F59E0B] via-[#FACC15] to-[#78350F]",
      renderType: "standard" as const,
      imageParticles: ["/images/symbols/panther/wild.png", "/images/symbols/panther/scatter.png"],
      badgeText: "WILD PANTHER ARCADE",
      chargeText: "PANTHER POWER ACTIVE",
      lines: [
        "Entering the wild jungle temple…",
        "Awakening the Wild Panther…",
        "Forging bomb multiplier crystals…",
        "Charging cascading treasure clusters…",
        "Wild Panther awaits!",
      ],
    };
  }

  if (gameId === "mystic-runes") {
    return {
      bgImage: thumb,
      bgGradient: "from-[#14532D]/80 via-[#0A0912]/80 to-[#052e16]/95",
      titleClass: "godly-title",
      barGradient: "from-[#86EFAC] via-[#34D399] to-[#059669]",
      borderGlow: "shadow-[0_0_60px_rgba(52,211,153,0.8)] border-emerald-300",
      badgeGradient: "from-[#86EFAC] via-[#34D399] to-[#065F46]",
      renderType: "godly-3d" as const,
      imageParticles: [
        "/images/godly-loading/lightning_orb.png",
        "/images/godly-loading/gem.png",
        "/images/godly-loading/lightning_orb.png",
        "/images/godly-loading/gem.png",
      ],
      badgeText: "MYSTIC RUNES",
      chargeText: "GROVE MULT ACTIVE",
      lines: [
        "Awakening the mystic gates…",
        "Opening cascade ways…",
        "Charging nature multipliers…",
        "Summoning free-spin spirits…",
        "Mystic Runes is ready!",
      ],
    };
  }

  // Candy Peak / Sugar Surge / Boracay Bounce / Mermaid Riches — never use as a generic fallback
  if (
    gameId === "candy-peak" ||
    gameId === "sugar-surge" ||
    gameId === "boracay-bounce" ||
    gameId === "mermaid-riches" ||
    gameId === "candy-blast" ||
    gameId === "sweet-rush" ||
    gameId === "beach-bonanza" ||
    gameId === "island-fever"
  ) {
    return {
      bgImage: "/images/candy-loading/bg.png",
      bgGradient: "from-[#2A0A3D]/80 via-[#0A0912]/80 to-[#0A0912]/95",
      titleClass: "candy-title",
      barGradient: "from-[#FF4D6A] via-[#FACC15] via-[#A3E635] to-[#C084FC]",
      borderGlow: "border-amber-300/80",
      badgeGradient: "from-[#FF4D6A] via-[#FACC15] to-[#A78BFA]",
      renderType: "candy-3d" as const,
      imageParticles: [
        "/images/candy-loading/badge.png",
        "/images/godly-loading/gem.png",
      ],
      badgeText: "SWEET ARCADE",
      chargeText: "SUGAR CHARGE",
      accent: "#FF4D6A",
      lines: [
        "Unwrapping the secret sweets…",
        "Stacking frosting mountains…",
        "Charging the sugar boosters…",
        "Lighting the candy neon…",
        "Almost ready to crush the Peak!",
      ],
    };
  }

  // Neutral arcade fallback for any unmapped title
  return {
    bgImage: thumb,
    bgGradient: "from-[#1a1025]/70 via-[#0A0912]/85 to-[#05040a]/95",
    titleClass: "arcade-title",
    barGradient: "from-[#F5D76E] via-[#E8A838] to-[#C45C26]",
    borderGlow: "border-white/25",
    badgeGradient: "from-[#C45C26] via-[#E8A838] to-[#1a1025]",
    renderType: "standard" as const,
    imageParticles: [] as string[],
    badgeText: "MAXHIGH",
    chargeText: "LOADING",
    accent: "#E8A838",
    lines: [
      "Warming up the reels…",
      "Loading symbols…",
      "Calibrating paylines…",
      "Almost there…",
      "Ready to play!",
    ],
  };
}

function LoadProgress({
  progress,
  config,
}: {
  progress: number;
  config: ReturnType<typeof getGameThemeConfig>;
}) {
  const accent = "accent" in config && config.accent ? config.accent : "#E8A838";
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="flex items-end justify-between gap-3 mb-2.5">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55"
          style={{ color: `${accent}cc` }}
        >
          {config.chargeText}
        </span>
        <span className="text-2xl font-black tabular-nums tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          {progress}
          <span className="ml-0.5 text-sm font-bold text-white/50">%</span>
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${config.barGradient} transition-[width] duration-200 ease-out`}
          style={{
            width: `${progress}%`,
            boxShadow: `0 0 18px ${accent}88`,
          }}
        />
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
  const showTiles =
    game.id === "mahjong-ways" ||
    game.id === "candy-peak" ||
    game.id === "sugar-surge" ||
    game.id === "boracay-bounce" ||
    game.id === "candy-blast" ||
    game.id === "sweet-rush";
  const tiles = showTiles ? config.imageParticles.slice(0, 3) : [];

  return (
    <div className="absolute inset-0 flex h-full w-full flex-col overflow-hidden bg-[#05080a]">
      {/* Full-bleed art */}
      <img
        src={config.bgImage}
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover animate-[loader-drift_28s_ease-in-out_infinite_alternate]"
        aria-hidden
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${config.bgGradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_0%,rgba(0,0,0,0.55)_55%,rgba(0,0,0,0.92)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/80 to-transparent" />

      {/* Optional floating symbol accents (no pill containers) */}
      {tiles.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
          {tiles.map((src, i) => (
            <img
              key={`${src}-${i}`}
              src={src}
              alt=""
              className="absolute size-14 opacity-[0.18] sm:size-16"
              style={{
                left: `${12 + i * 34}%`,
                top: `${18 + (i % 2) * 12}%`,
                animation: `loader-float ${4.5 + i * 0.6}s ease-in-out ${i * 0.4}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Bottom-weighted content — title + status + progress, no nested cards */}
      <div className="relative z-10 mt-auto flex w-full flex-col items-center px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-24 text-center sm:px-10">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/40">
          {config.badgeText}
        </p>

        <h1
          className={`${config.titleClass} max-w-[16ch] text-[clamp(2.35rem,11vw,4.25rem)] font-black uppercase leading-[0.92] tracking-wide`}
        >
          {game.name}
        </h1>

        <div
          className="mt-4 h-px w-16 opacity-70"
          style={{
            background: `linear-gradient(90deg, transparent, ${"accent" in config && config.accent ? config.accent : "#E8A838"}, transparent)`,
          }}
        />

        <p
          key={line}
          className="mt-5 min-h-[1.5rem] text-sm font-medium tracking-wide text-white/70 animate-[loader-fade_0.45s_ease-out] sm:text-base"
        >
          {line}
        </p>

        <div className="mt-8 w-full">
          <LoadProgress progress={progress} config={config} />
        </div>
      </div>
    </div>
  );
}

function ComingSoonPlay({ game }: { game: SlotGame }) {
  return (
    <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0A0912] px-6 text-center">
      <img src={game.thumb} alt="" className="h-40 w-40 rounded-3xl object-cover shadow-xl" />
      <h2 className="text-2xl font-black uppercase text-white">{game.name}</h2>
      <p className="max-w-md text-sm text-white/80">
        Full arcade mode for this title is cooking. Candy Peak and Godly Gates are playable now — more games soon.
      </p>
    </div>
  );
}

/** Full-bleed play surface — fill the shell, never nest another 100dvh. */
function PlaySurface({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 h-full w-full overflow-hidden bg-[#0A0912]">{children}</div>;
}

export function GamePlayModal({ game, open, onOpenChange }: Props) {
  const [phase, setPhase] = useState<"loading" | "play">("loading");
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
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
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
    };
    const scrollbarGap = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.paddingRight = prev.bodyPaddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Keep the shell pinned to the visual viewport (mobile URL bar / soft keyboard).
  useEffect(() => {
    if (!open) return;
    const shell = shellRef.current;
    if (!shell) return;

    const sync = () => {
      const vv = window.visualViewport;
      if (!vv) {
        shell.style.top = "0px";
        shell.style.left = "0px";
        shell.style.width = "100%";
        shell.style.height = "100%";
        return;
      }
      shell.style.top = `${vv.offsetTop}px`;
      shell.style.left = `${vv.offsetLeft}px`;
      shell.style.width = `${vv.width}px`;
      shell.style.height = `${vv.height}px`;
    };

    sync();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !game || !isLoggedIn) return;
    setPhase("loading");
    setProgress(0);
    const start = Date.now();
    // Ace High is a card table — shorter load so phones get to play faster
    const duration =
      game.id === "ace-high" ||
      game.id === "baccarat" ||
      game.id === "lucky9" ||
      game.id === "threecardpoker" ||
      game.id === "color-game" ||
      game.id === "tongits-arena" ||
      game.id === "lucky-drop" ||
      game.id === "color-game-pro" ||
      game.id === "lucky-nine-plus" ||
      game.id === "drop-deluxe" ||
      game.id === "poker-showdown"
        ? 1600
        : 4200;
    const tick = window.setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      setProgress(p);
      if (p >= 100) {
        window.clearInterval(tick);
        setPhase("play");
        void recordGameSessionFn({
          data: { gameId: game.id, gameName: game.name },
        }).catch(() => undefined);
      }
    }, 40);
    return () => window.clearInterval(tick);
  }, [open, game?.id, game?.name, isLoggedIn]);

  const LazyGame = game ? resolveLazyGame(game.id) : null;

  if (!mounted || !open || !game || !isLoggedIn) return null;

  return createPortal(
    <div
      ref={shellRef}
      className="fixed inset-0 z-[9999] flex w-full flex-col overflow-hidden overscroll-none bg-[#0A0912]"
      role="dialog"
      aria-modal="true"
      aria-label={`${game.name} game`}
    >
      {/* Extra opaque plate in case of any subpixel gap */}
      <div className="pointer-events-none absolute inset-0 bg-[#0A0912]" aria-hidden />

      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[10001] sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md hover:bg-black/70"
          aria-label="Close game"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative z-[10000] min-h-0 flex-1 overflow-hidden bg-[#0A0912]">
        {phase === "loading" ? (
          <CreativeLoader game={game} progress={progress} />
        ) : LazyGame ? (
          <PlaySurface>
            <Suspense
              fallback={
                <div className="absolute inset-0 grid place-items-center bg-[#0A0912] text-sm text-white/70">
                  Loading {game.name}…
                </div>
              }
            >
              <LazyGame gameId={game.id} gameName={game.name} />
            </Suspense>
          </PlaySurface>
        ) : (
          <ComingSoonPlay game={game} />
        )}
      </div>
    </div>,
    document.body,
  );
}
