import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { PlayingCard } from "./deckEngine";
import { getThreeCardPokerAnim, TCP_ASSET, tcpCardSrc } from "./animationConfig";

type Props = {
  card?: PlayingCard | null;
  faceDown?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  side?: "player" | "dealer" | "neutral";
  highlight?: boolean;
  /** Slight rotation for a hand-dealt look. */
  tiltDeg?: number;
  /** Deal-in slide/scale entrance. */
  dealt?: boolean;
};

/** Oversized on mobile for older-player readability; short-h / sm trim when tight. */
const SIZE = {
  xs: "w-[clamp(2rem,8vw,2.55rem)] aspect-[5/7]",
  sm: "w-[clamp(2.5rem,10vw,3.35rem)] aspect-[5/7] short-h:w-[clamp(2.1rem,8.5vw,2.9rem)]",
  md: "w-[clamp(3.15rem,13vw,4.25rem)] aspect-[5/7] short-h:w-[clamp(2.6rem,11vw,3.6rem)] sm:w-[3.9rem]",
  lg: "w-[clamp(3.55rem,15vw,4.85rem)] aspect-[5/7] short-h:w-[clamp(3rem,13.5vw,4.3rem)] sm:w-[4.9rem]",
} as const;

const SUIT_GLYPH: Record<string, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

/** Fallback face used when the PNG pack is unavailable. */
function CssCardFace({ card }: { card: PlayingCard }) {
  const red = card.suit === "H" || card.suit === "D";
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col justify-between rounded-[0.3rem] border border-[#cbbfa6] bg-[linear-gradient(150deg,#fffdf7_0%,#f6f1e6_55%,#e7dfcd_100%)] p-[7%]",
        red ? "text-[#c01c28]" : "text-[#15181f]",
      )}
    >
      <div className="flex flex-col leading-none">
        <span
          className="text-[0.95em] font-bold tracking-tight"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {card.rank}
        </span>
        <span className="text-[0.8em] leading-none">{SUIT_GLYPH[card.suit]}</span>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[1.7em] opacity-95">
        {SUIT_GLYPH[card.suit]}
      </div>
      <div className="flex rotate-180 flex-col items-end leading-none">
        <span
          className="text-[0.95em] font-bold tracking-tight"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {card.rank}
        </span>
        <span className="text-[0.8em] leading-none">{SUIT_GLYPH[card.suit]}</span>
      </div>
    </div>
  );
}

function CardBack() {
  const [pngFailed, setPngFailed] = useState(false);
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[0.45rem] bg-[#3b0d1f]">
      <img
        src={pngFailed ? TCP_ASSET.cardBackSvg : TCP_ASSET.cardBack}
        alt=""
        className="h-full w-full object-cover"
        draggable={false}
        decoding="async"
        onError={() => setPngFailed(true)}
      />
      <div className="pointer-events-none absolute inset-0 rounded-[0.45rem] shadow-[inset_0_0_0_1px_rgba(245,230,200,0.35)]" />
    </div>
  );
}

/**
 * Real-deck playing card: PNG face from the shared pack with CSS fallback,
 * 3D flip, felt drop shadow, and optional dealt-in entrance.
 */
export function CardCell({
  card,
  faceDown = false,
  size = "md",
  className,
  side = "neutral",
  highlight,
  tiltDeg = 0,
  dealt = true,
}: Props) {
  const [flipMs, setFlipMs] = useState(320);
  const [faceFailed, setFaceFailed] = useState(false);
  const showFace = Boolean(card) && !faceDown;

  useEffect(() => {
    setFlipMs(getThreeCardPokerAnim().flipDuration);
  }, []);

  useEffect(() => {
    setFaceFailed(false);
  }, [card?.id]);

  const rim =
    side === "player"
      ? "ring-amber-300/85"
      : side === "dealer"
        ? "ring-rose-300/85"
        : "ring-amber-200/70";

  return (
    <div
      className={cn(
        "relative shrink-0 [perspective:900px] transition-all duration-300 ease-out",
        SIZE[size],
        highlight && "z-10",
        className,
      )}
      style={{
        transform: `rotate(${tiltDeg}deg) translateY(${dealt ? 0 : -14}px) scale(${dealt ? 1 : 0.9})`,
        opacity: dealt ? 1 : 0,
      }}
    >
      <div
        className={cn(
          "relative h-full w-full ease-out [transform-style:preserve-3d]",
          highlight && cn("rounded-[0.5rem] ring-[3px] ring-offset-2 ring-offset-[#0b3a26] short-h:ring-2 short-h:ring-offset-1", rim),
        )}
        style={{
          transform: showFace ? "rotateY(180deg)" : "rotateY(0deg)",
          transitionProperty: "transform",
          transitionDuration: `${flipMs}ms`,
          willChange: "transform",
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[0.45rem] shadow-[0_8px_18px_rgba(0,0,0,0.55)] [backface-visibility:hidden]"
          style={{ transform: "rotateY(0deg)" }}
        >
          <CardBack />
        </div>
        <div
          className="absolute inset-0 overflow-hidden rounded-[0.45rem] bg-[#fffdf7] shadow-[0_8px_18px_rgba(0,0,0,0.55)] [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          {card ? (
            faceFailed ? (
              <CssCardFace card={card} />
            ) : (
              <img
                src={tcpCardSrc(card.rank, card.suit)}
                alt={`${card.rank}${card.suit}`}
                className="h-full w-full object-cover"
                draggable={false}
                decoding="async"
                onError={() => setFaceFailed(true)}
              />
            )
          ) : (
            <CardBack />
          )}
        </div>
      </div>
    </div>
  );
}
