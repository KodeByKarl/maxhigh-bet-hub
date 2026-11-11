import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  buyBonusTotal,
  buyBonusUnitPrice,
  clampBuyBonusQuantity,
  type BuyBonusQuantitySpec,
} from "@/lib/buy-bonus";
import { BUY_BONUS_MOTIFS, type BuyBonusMotif } from "./motifs";
import { motifPattern, motifTileSize } from "./patterns";
import { luminance, readableOn, type BuyBonusTheme } from "./theme";
import "./buy-bonus.css";

export type BuyBonusModalProps = {
  theme: BuyBonusTheme;
  /** The game's currently selected bet: the starting bet of the dialog. */
  bet: number;
  /** Bets the player may pick inside the dialog (the game's own bet ladder). Omitted: the bet is shown, not changeable. */
  betOptions?: readonly number[];
  /** The game's quantity rule (from lib/buy-bonus). A locked spec shows the fixed amount and no selector. */
  quantity: BuyBonusQuantitySpec;
  /** The game's own price per unit as a multiple of the bet at a given quantity (display only: the server prices the purchase). */
  pricePerUnitMult: (quantity: number) => number;
  balance: number;
  onConfirm: (bet: number, quantity: number) => void;
  onCancel: () => void;
};

function formatPrice(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Lift a too-dark brand colour so glows and text stay visible on the dark panel. */
function brighten(color: string, fallback: string): string {
  return luminance(color) >= 0.12 ? color : luminance(fallback) >= 0.12 ? fallback : "#e8c766";
}

/** Keep the panel itself dark whatever the game's "deep" colour is. */
function darken(color: string): string {
  return luminance(color) <= 0.06 ? color : `color-mix(in srgb, ${color} 38%, #000)`;
}

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  x: `${(i * 37 + 8) % 96}%`,
  y: `${(i * 53 + 11) % 88}%`,
  sz: `${2 + (i % 4)}px`,
  dur: `${4.5 + (i % 5) * 1.1}s`,
  del: `${-(i * 0.7) % 6}s`,
  dx: `${((i % 5) - 2) * 14}px`,
}));

const TONES: Record<BuyBonusMotif["particleTone"], string> = {
  accent: "var(--bb-a)",
  soft: "var(--bb-s)",
  ember: "#ffb347",
  ice: "#dff4ff",
};

const FOCUSABLE = "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

/**
 * One Buy Bonus dialog for every game. A game supplies a BuyBonusTheme (its colours, artwork, featured symbol and world motif) and the
 * price it already computes; nothing here prices, awards or settles anything.
 */
export function BuyBonusModal({
  theme,
  bet: initialBet,
  betOptions,
  quantity: qtySpec,
  pricePerUnitMult,
  balance,
  onConfirm,
  onCancel,
}: BuyBonusModalProps) {
  const [bet, setBet] = useState(initialBet);
  const [qty, setQty] = useState(() =>
    clampBuyBonusQuantity(qtySpec, qtySpec.mode === "range" ? qtySpec.initial : qtySpec.value),
  );
  const [qtyText, setQtyText] = useState(String(qty));
  const mult = pricePerUnitMult(qty);
  const unitPrice = buyBonusUnitPrice(bet, mult);
  const price = buyBonusTotal(bet, mult, qty);
  const betIdx = betOptions ? betOptions.findIndex((b) => b === bet) : -1;
  const setQuantity = (q: number) => {
    const next = clampBuyBonusQuantity(qtySpec, q);
    setQty(next);
    setQtyText(String(next));
  };
  const motif = BUY_BONUS_MOTIFS[theme.motif];
  const reduce = useReducedMotion();
  const canAfford = balance >= price;
  const titleId = useId();
  const descId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const accent = brighten(theme.accent, theme.accentSoft);
  const vars = useMemo(
    () =>
      ({
        "--bb-a": accent,
        "--bb-s": `color-mix(in srgb, ${theme.accentSoft} 55%, color-mix(in srgb, ${accent} 60%, #fff))`,
        "--bb-d": darken(theme.deep),
        "--bb-on-a": readableOn(accent),
        "--bb-text": "#f6f3ec",
        "--bb-pc": TONES[motif.particleTone],
      }) as CSSProperties,
    [accent, motif.particleTone, theme.accentSoft, theme.deep],
  );

  const tile = useMemo(
    () => ({
      backgroundImage: motifPattern(theme.motif, "#ffffff"),
      backgroundSize: `${motifTileSize(theme.motif)}px`,
    }),
    [theme.motif],
  );

  // Focus: take focus on open, keep it inside, give it back on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    (canAfford ? confirmRef.current : cancelRef.current)?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // The game listens for keys on window (Space spins, etc.): nothing typed inside the dialog may reach it.
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = Array.from(cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !cardRef.current?.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !cardRef.current?.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.35, ease: "easeOut" as const },
        };

  return (
    <motion.div
      className="bb-overlay"
      data-buy-bonus-modal={theme.gameId}
      data-motif={theme.motif}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.01 : 0.2 }}
      onClick={onCancel}
    >
      <motion.div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`bb-glow bb-shape-${motif.frame} bb-font-${motif.titleFont}`}
        style={vars}
        initial={reduce ? false : { opacity: 0, scale: 0.86, y: 26 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
        transition={reduce ? { duration: 0.01 } : { type: "spring", stiffness: 300, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="bb-frame">
          <div className="bb-card">
            {theme.backdropSrc && (
              <div
                className="bb-art"
                aria-hidden="true"
                style={{ backgroundImage: `url("${theme.backdropSrc}")` }}
              />
            )}
            <div className="bb-tiles" aria-hidden="true" style={tile} />
            <div className="bb-vignette" aria-hidden="true" />
            <div className={`bb-particles bb-pk-${motif.particle}`} aria-hidden="true">
              {PARTICLES.map((p, i) => (
                <span
                  key={i}
                  className="bb-p"
                  style={
                    {
                      "--x": p.x,
                      "--y": p.y,
                      "--sz": p.sz,
                      "--dur": p.dur,
                      "--del": p.del,
                      "--dx": p.dx,
                    } as CSSProperties
                  }
                />
              ))}
            </div>

            <button type="button" className="bb-close" aria-label="Close" onClick={onCancel}>
              <span aria-hidden="true">×</span>
            </button>

            <div className="bb-body">
              <motion.div {...rise(0.05)} className="bb-game">
                {theme.gameName}
              </motion.div>
              <motion.h2 {...rise(0.1)} id={titleId} className="bb-title">
                Buy Bonus
              </motion.h2>
              <svg className="bb-crest" viewBox="0 0 152 14" aria-hidden="true">
                <path
                  d="M0 7h58M94 7h58"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <path d="M76 1l6 6-6 6-6-6z" fill="currentColor" />
                <circle cx="63" cy="7" r="2" fill="currentColor" opacity="0.8" />
                <circle cx="89" cy="7" r="2" fill="currentColor" opacity="0.8" />
              </svg>

              <motion.div
                className="bb-hero"
                initial={reduce ? false : { opacity: 0, scale: 0.5, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={
                  reduce
                    ? { duration: 0.01 }
                    : { type: "spring", stiffness: 220, damping: 14, delay: 0.12 }
                }
              >
                <div className="bb-rays" aria-hidden="true" />
                <div className="bb-halo" aria-hidden="true" />
                <img className="bb-symbol" src={theme.symbolSrc} alt="" draggable={false} />
              </motion.div>

              <motion.div {...rise(0.22)} className="bb-spins" id={descId}>
                <b>{qty}</b>
                <span>{qty === 1 ? "Free Spin" : "Free Spins"}</span>
              </motion.div>

              <motion.div {...rise(0.26)} className="bb-fields">
                <div className="bb-field">
                  <span className="bb-label">Bet (₱)</span>
                  {betOptions && betOptions.length > 1 ? (
                    <div className="bb-stepper" data-bb="bet">
                      <button
                        type="button"
                        aria-label="Lower bet"
                        disabled={betIdx <= 0}
                        onClick={() => setBet(betOptions[Math.max(0, betIdx - 1)]!)}
                      >
                        −
                      </button>
                      <output aria-live="polite">{formatPrice(bet)}</output>
                      <button
                        type="button"
                        aria-label="Raise bet"
                        disabled={betIdx < 0 || betIdx >= betOptions.length - 1}
                        onClick={() => setBet(betOptions[betIdx + 1]!)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <strong className="bb-static">{formatPrice(bet)}</strong>
                  )}
                </div>
                <div className="bb-field">
                  <span className="bb-label">Quantity</span>
                  {qtySpec.mode === "range" ? (
                    <div className="bb-stepper" data-bb="quantity">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={qty <= qtySpec.min}
                        onClick={() => setQuantity(qty - 1)}
                      >
                        −
                      </button>
                      <input
                        inputMode="numeric"
                        aria-label="Quantity"
                        value={qtyText}
                        onChange={(e) => {
                          const t = e.target.value.replace(/\D/g, "").slice(0, 3);
                          setQtyText(t);
                          if (t) setQty(clampBuyBonusQuantity(qtySpec, Number(t)));
                        }}
                        onBlur={() => setQuantity(Number(qtyText) || qtySpec.min)}
                      />
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={qty >= qtySpec.max}
                        onClick={() => setQuantity(qty + 1)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <strong className="bb-static">{qty}</strong>
                  )}
                </div>
              </motion.div>

              <motion.div {...rise(0.3)} className="bb-price-wrap">
                <div className="bb-rows">
                  <div>
                    <em>Price</em>
                    <strong data-bb="unit-price">₱ {formatPrice(unitPrice)}</strong>
                  </div>
                  <div className="bb-total-row">
                    <em>Total Price</em>
                    <strong className="bb-price" data-bb="total-price">
                      ₱ {formatPrice(price)}
                    </strong>
                  </div>
                </div>
                {!canAfford && (
                  <div className="bb-alert" role="alert">
                    Insufficient balance
                  </div>
                )}
              </motion.div>

              <div className="bb-actions">
                <button
                  ref={confirmRef}
                  type="button"
                  className="bb-confirm"
                  disabled={!canAfford}
                  onClick={() => onConfirm(bet, qty)}
                >
                  Buy &amp; Play
                </button>
                <button ref={cancelRef} type="button" className="bb-cancel" onClick={onCancel}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
