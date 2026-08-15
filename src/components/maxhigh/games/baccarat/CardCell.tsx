import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { PlayingCard } from "./deckEngine";
import { getBaccaratAnim, BC_ASSET } from "./animationConfig";

type Props = {
  card?: PlayingCard | null;
  faceDown?: boolean;
  /** Fluid aspect-ratio sizes — no discontinuous 390px jump. */
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  side?: "player" | "banker" | "neutral";
  highlight?: boolean;
};

/**
 * Aspect-ratio cards (2:3). Oversized on mobile for older-player readability;
 * short-h / sm trim when space is tight.
 */
const SIZE = {
  xs: "w-[clamp(1.9rem,8vw,2.4rem)] aspect-[2/3]",
  sm: "w-[clamp(2.4rem,10vw,3.25rem)] aspect-[2/3] short-h:w-[clamp(2rem,8.5vw,2.75rem)] sm:w-[3.1rem]",
  md: "w-[clamp(2.85rem,12vw,3.75rem)] aspect-[2/3] short-h:w-[clamp(2.35rem,10vw,3.15rem)] sm:w-[4rem] lg:w-[4.5rem]",
  lg: "w-[clamp(3.15rem,13.5vw,4.25rem)] aspect-[2/3] short-h:w-[clamp(2.55rem,11vw,3.4rem)] sm:w-[4.6rem] lg:w-[5.25rem] max-h-[min(7rem,28vh)] short-h:max-h-[min(5.5rem,22vh)] sm:max-h-none",
} as const;

const SUIT_GLYPH: Record<string, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

function IvoryFace({ card }: { card: PlayingCard }) {
  const red = card.suit === "H" || card.suit === "D";
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col justify-between rounded-[0.5rem] border border-[#d4c4a8] bg-gradient-to-br from-[#fffaf0] via-[#f7f0e4] to-[#ebe0d0] p-[6%]",
        red ? "text-[#b91c1c]" : "text-[#0f172a]",
      )}
    >
      <div className="flex flex-col leading-none">
        <span
          className="text-[0.95em] font-bold tracking-tight"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {card.rank}
        </span>
        <span className="text-[0.85em]">{SUIT_GLYPH[card.suit]}</span>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[1.55em] opacity-90">
        {SUIT_GLYPH[card.suit]}
      </div>
      <div className="flex rotate-180 flex-col items-end leading-none">
        <span
          className="text-[0.95em] font-bold tracking-tight"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {card.rank}
        </span>
        <span className="text-[0.85em]">{SUIT_GLYPH[card.suit]}</span>
      </div>
    </div>
  );
}

function BurgundyBack() {
  return (
    <img
      src={BC_ASSET.cardBackSvg}
      alt=""
      className="h-full w-full object-cover"
      draggable={false}
      decoding="async"
    />
  );
}

export function CardCell({
  card,
  faceDown = false,
  size = "md",
  className,
  side = "neutral",
  highlight,
}: Props) {
  const [flipMs, setFlipMs] = useState(320);
  const showFace = Boolean(card) && !faceDown;

  useEffect(() => {
    setFlipMs(getBaccaratAnim().flipDuration);
  }, []);

  const rim =
    side === "player"
      ? "ring-sky-400/80"
      : side === "banker"
        ? "ring-rose-400/80"
        : "ring-amber-300/70";

  return (
    <div
      className={cn(
        "relative shrink-0 [perspective:800px] [transform:translateZ(0)]",
        SIZE[size],
        highlight && "z-10",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full w-full ease-out [transform-style:preserve-3d] [backface-visibility:hidden]",
          highlight &&
            cn("rounded-[0.55rem] ring-[3px] ring-offset-2 ring-offset-[#071428] short-h:ring-2 short-h:ring-offset-1", rim),
        )}
        style={{
          transform: showFace ? "rotateY(180deg)" : "rotateY(0deg)",
          transitionProperty: "transform",
          transitionDuration: `${flipMs}ms`,
          willChange: "transform",
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[0.5rem] shadow-[0_6px_16px_rgba(0,0,0,0.55)] [backface-visibility:hidden]"
          style={{ transform: "rotateY(0deg)" }}
        >
          <BurgundyBack />
        </div>
        <div
          className="absolute inset-0 overflow-hidden rounded-[0.5rem] shadow-[0_6px_16px_rgba(0,0,0,0.55)] [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          {card ? <IvoryFace card={card} /> : <BurgundyBack />}
        </div>
      </div>
    </div>
  );
}
