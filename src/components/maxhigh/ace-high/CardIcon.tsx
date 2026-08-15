import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { PlayingCard } from "./deckEngine";
import { getAceHighAnim, AH_ASSET, aceHighCardSrc } from "./animationConfig";

type Props = {
  card?: PlayingCard | null;
  /** When true, show the back. Flip animates when this becomes false with a card set. */
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  highlight?: boolean;
};

/** Mobile-first sizes — oversized for older-player readability; short-h/sm trim when space is tight. */
const SIZE = {
  sm: "h-[4.5rem] w-[3rem] short-h:h-[3.6rem] short-h:w-[2.4rem] sm:h-24 sm:w-[4.1rem]",
  md: "h-[6rem] w-[4rem] short-h:h-[4.75rem] short-h:w-[3.2rem] sm:h-36 sm:w-[5.9rem]",
  lg: "h-[8rem] w-[5.35rem] max-[380px]:h-[7.1rem] max-[380px]:w-[4.75rem] short-h:h-[6rem] short-h:w-[4rem] sm:h-44 sm:w-[7.2rem]",
} as const;

const SUIT_GLYPH: Record<string, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

function CssCardFace({ card }: { card: PlayingCard }) {
  const red = card.suit === "H" || card.suit === "D";
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col justify-between rounded-[0.55rem] border border-white/20 bg-gradient-to-br from-stone-50 to-stone-200 p-1",
        red ? "text-red-700" : "text-slate-900",
      )}
    >
      <div className="flex flex-col leading-none font-bold text-[0.8em]">
        <span className="font-serif tracking-tight">{card.rank}</span>
        <span>{SUIT_GLYPH[card.suit]}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-90 pointer-events-none">
        {SUIT_GLYPH[card.suit]}
      </div>
      <div className="flex flex-col items-end leading-none font-bold rotate-180 text-[0.8em]">
        <span className="font-serif tracking-tight">{card.rank}</span>
        <span>{SUIT_GLYPH[card.suit]}</span>
      </div>
    </div>
  );
}

function CardBack({ failed, onFail }: { failed: boolean; onFail: () => void }) {
  return !failed ? (
    <img
      src={AH_ASSET.cardBack}
      alt=""
      className="h-full w-full object-cover"
      draggable={false}
      decoding="async"
      onError={onFail}
    />
  ) : (
    <img
      src={AH_ASSET.cardBackSvg}
      alt=""
      className="h-full w-full object-cover"
      draggable={false}
      decoding="async"
    />
  );
}

/**
 * Playing card with CSS 3D flip: back → face when `faceDown` goes false.
 */
export function CardIcon({
  card,
  faceDown = false,
  size = "md",
  className,
  highlight,
}: Props) {
  const [faceFailed, setFaceFailed] = useState(false);
  const [backFailed, setBackFailed] = useState(false);
  const [flipMs, setFlipMs] = useState(280);
  const showFace = Boolean(card) && !faceDown;

  useEffect(() => {
    setFaceFailed(false);
  }, [card?.rank, card?.suit, card?.id]);

  useEffect(() => {
    setFlipMs(getAceHighAnim().flipDuration);
  }, []);

  // Prefetch face when card is known (even while still face-down)
  useEffect(() => {
    if (!card) return;
    const img = new Image();
    img.decoding = "async";
    img.src = aceHighCardSrc(card.rank, card.suit);
  }, [card?.rank, card?.suit, card?.id]);

  return (
    <div
      className={cn(
        "relative [perspective:700px] [transform:translateZ(0)]",
        SIZE[size],
        highlight && "z-10",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full w-full ease-out [transform-style:preserve-3d] [backface-visibility:hidden]",
          highlight &&
            "rounded-[0.55rem] ring-2 ring-amber-400 ring-offset-1 ring-offset-emerald-950 sm:ring-offset-2",
        )}
        style={{
          transform: showFace ? "rotateY(180deg)" : "rotateY(0deg)",
          transitionProperty: "transform",
          transitionDuration: `${flipMs}ms`,
          willChange: "transform",
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[0.55rem] shadow-md shadow-black/40 [backface-visibility:hidden]"
          style={{ transform: "rotateY(0deg)" }}
        >
          <CardBack failed={backFailed} onFail={() => setBackFailed(true)} />
        </div>

        <div
          className="absolute inset-0 overflow-hidden rounded-[0.55rem] shadow-md shadow-black/40 [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          {card ? (
            !faceFailed ? (
              <img
                key={aceHighCardSrc(card.rank, card.suit)}
                src={aceHighCardSrc(card.rank, card.suit)}
                alt={`${card.rank} of ${card.suit}`}
                className="h-full w-full object-cover"
                draggable={false}
                decoding="async"
                onError={() => setFaceFailed(true)}
              />
            ) : (
              <CssCardFace card={card} />
            )
          ) : (
            <CardBack failed={backFailed} onFail={() => setBackFailed(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
