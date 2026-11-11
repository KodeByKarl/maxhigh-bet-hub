import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  buyBonusTotal,
  buyBonusUnitPriceText,
  clampBuyBonusQuantity,
  type BuyBonusQuantitySpec,
} from "@/lib/buy-bonus";
import { formatMoney } from "@/lib/currency";
import "./gold-rush.css";

/** Everything the Gold Rush shows about the purchased feature. It all comes from the game's live config; nothing is invented here. */
export type GoldRushFeature = {
  /** Name of the trigger symbol (e.g. "Scatter"). */
  scatterName: string;
  /** Name of the multiplier symbol (e.g. "Wild"). */
  bombName: string;
  /** Scatters that trigger the feature in the base game. */
  triggerCount: number;
  /** Free Spins a natural trigger awards (a purchase grants only what the player picks). */
  naturalAward: number;
  /** Scatters that retrigger during Free Spins, and the spins each retrigger adds (0 = no retrigger). */
  retriggerCount: number;
  retriggerSpins: number;
  /** Hard stop on Free Spins + retriggers per session (0 = uncapped). */
  maxSessionSpins: number;
  /** Multiplier range of the Wild symbols and the ceiling applied to the collected multiplier (0 = uncapped). */
  bombMin: number;
  bombMax: number;
  maxBombMult: number;
  /** Max win as x bet for the round (0 = uncapped). */
  maxWinMult: number;
  /** Set when the purchase cannot be offered (bad price, no quantity allowed). Shown instead of the form. */
  unavailable?: string;
};

export type GoldRushModalProps = {
  gameId: string;
  gameName: string;
  /** Art: the trigger symbol for the coin, the Buffalo emblem for the embossed watermark. */
  symbolSrc: string;
  emblemSrc: string;
  bet: number;
  betOptions?: readonly number[];
  quantity: BuyBonusQuantitySpec;
  /** Price per free spin as a multiple of the bet at a given quantity (display only: the server prices and charges the purchase). */
  pricePerUnitMult: (quantity: number) => number;
  balance: number;
  feature: GoldRushFeature;
  onConfirm: (bet: number, quantity: number) => void;
  onCancel: () => void;
};

const FOCUSABLE = "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";
const DUST = [
  { x: "10%", y: "18%", s: 3, d: 0 },
  { x: "86%", y: "12%", s: 2, d: -2 },
  { x: "20%", y: "58%", s: 2, d: -4 },
  { x: "92%", y: "46%", s: 3, d: -1 },
  { x: "8%", y: "84%", s: 2, d: -3 },
  { x: "80%", y: "88%", s: 3, d: -5 },
];

function fmtMult(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
}

/**
 * Buffalo Reign's Buy Bonus: the Frontier Gold Rush. A game-specific presentation of the shared purchase contract: the same quantity
 * rules, the same price formula (lib/buy-bonus) and the same onConfirm(bet, quantity) as every other title, so the server still prices,
 * validates and settles the purchase. Nothing here awards or charges anything.
 */
export function GoldRushModal({
  gameId,
  gameName,
  symbolSrc,
  emblemSrc,
  bet: initialBet,
  betOptions,
  quantity: qtySpec,
  pricePerUnitMult,
  balance,
  feature,
  onConfirm,
  onCancel,
}: GoldRushModalProps) {
  const [bet, setBet] = useState(initialBet);
  const [qty, setQty] = useState(() =>
    clampBuyBonusQuantity(qtySpec, qtySpec.mode === "range" ? qtySpec.initial : qtySpec.value),
  );
  const reduce = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const mult = pricePerUnitMult(qty);
  const priceOk = Number.isFinite(mult) && mult > 0;
  const price = priceOk ? buyBonusTotal(bet, mult, qty) : 0;
  const unavailable = feature.unavailable ?? (priceOk ? null : "Price unavailable");
  const canAfford = balance >= price;
  const canBuy = !unavailable && canAfford;
  const betIdx = betOptions ? betOptions.findIndex((b) => b === bet) : -1;
  const setQuantity = (q: number) => setQty(clampBuyBonusQuantity(qtySpec, q));

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    (canBuy ? confirmRef.current : cancelRef.current)?.focus({ preventScroll: true });
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
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.32, ease: "easeOut" as const },
        };

  const spinsWord = qty === 1 ? "Free Spin" : "Free Spins";
  const rules: string[] = [];
  rules.push(
    `You are buying exactly ${qty} ${spinsWord.toLowerCase()}, played at your bet. A natural trigger (${feature.triggerCount}+ ${feature.scatterName}) awards ${feature.naturalAward}.`,
  );
  if (feature.retriggerCount > 0 && feature.retriggerSpins > 0) {
    rules.push(
      `Retrigger: ${feature.retriggerCount}+ ${feature.scatterName} during Free Spins add ${feature.retriggerSpins} more spins${
        feature.maxSessionSpins > 0 ? ` (up to ${feature.maxSessionSpins} spins in total)` : ""
      }.`,
    );
  } else {
    rules.push("No retriggers in this feature.");
  }
  if (feature.bombMax > 0)
    rules.push(
      `${feature.bombName} multipliers (x${feature.bombMin} to x${feature.bombMax}) collected in Free Spins boost the feature total${
        feature.maxBombMult > 0 ? `, up to x${feature.maxBombMult}` : ""
      }.`,
    );
  if (feature.maxWinMult > 0)
    rules.push(`Maximum win ${feature.maxWinMult.toLocaleString("en-US")}x bet.`);

  return (
    <motion.div
      className="gr-overlay"
      data-buy-bonus-modal={gameId}
      data-gold-rush=""
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
        className="gr-glow"
        initial={reduce ? false : { opacity: 0, scale: 0.92, y: 26 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
        transition={reduce ? { duration: 0.01 } : { type: "spring", stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="gr-frame">
          <div className="gr-card">
            <img
              className="gr-emblem"
              src={emblemSrc}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
            <div className="gr-dust" aria-hidden="true">
              {DUST.map((p, i) => (
                <i
                  key={i}
                  style={{
                    left: p.x,
                    top: p.y,
                    width: p.s,
                    height: p.s,
                    animationDelay: `${p.d}s`,
                  }}
                />
              ))}
            </div>

            <div className="gr-body">
              <motion.header {...rise(0.04)} className="gr-head">
                <p className="gr-kicker">{gameName}</p>
                <h2 id={titleId} className="gr-title">
                  Frontier Gold Rush
                </h2>
                <p className="gr-sub">Buy Bonus</p>
              </motion.header>

              <motion.div
                className="gr-hero"
                initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={
                  reduce
                    ? { duration: 0.01 }
                    : { type: "spring", stiffness: 220, damping: 15, delay: 0.1 }
                }
              >
                <div className="gr-coin" aria-hidden="true">
                  <div className="gr-coin__rim" />
                  <div className="gr-coin__face">
                    <img src={symbolSrc} alt="" draggable={false} />
                  </div>
                </div>
                <div className="gr-count" id={descId}>
                  <b data-bb="spins">{qty}</b>
                  <span>{spinsWord}</span>
                </div>
              </motion.div>

              {unavailable ? (
                <div className="gr-alert" role="alert" data-bb="unavailable">
                  Buy Bonus unavailable: {unavailable}
                </div>
              ) : (
                <>
                  <motion.section {...rise(0.16)} className="gr-plank" aria-label="Purchase">
                    <div className="gr-row">
                      <span className="gr-label">Feature</span>
                      <strong className="gr-val">Free Spins round</strong>
                    </div>
                    <div className="gr-row">
                      <span className="gr-label">Current bet</span>
                      {betOptions && betOptions.length > 1 ? (
                        <div className="gr-step" data-bb="bet">
                          <button
                            type="button"
                            aria-label="Lower bet"
                            disabled={betIdx <= 0}
                            onClick={() => setBet(betOptions[Math.max(0, betIdx - 1)]!)}
                          >
                            −
                          </button>
                          <output aria-live="polite">{formatMoney(bet)}</output>
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
                        <strong className="gr-val">{formatMoney(bet)}</strong>
                      )}
                    </div>
                    <div className="gr-row">
                      <span className="gr-label">Free Spins</span>
                      {qtySpec.mode === "range" ? (
                        <div className="gr-step" data-bb="quantity">
                          <button
                            type="button"
                            aria-label="Fewer free spins"
                            disabled={qty <= qtySpec.min}
                            onClick={() => setQuantity(qty - 1)}
                          >
                            −
                          </button>
                          <output aria-live="polite">{qty}</output>
                          <button
                            type="button"
                            aria-label="More free spins"
                            disabled={qty >= qtySpec.max}
                            onClick={() => setQuantity(qty + 1)}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <strong className="gr-val">{qty}</strong>
                      )}
                    </div>
                  </motion.section>

                  <motion.section {...rise(0.2)} className="gr-ledger" aria-label="Price">
                    <div className="gr-row">
                      <span className="gr-label">Buy multiplier</span>
                      <strong className="gr-val" data-bb="multiplier">
                        {fmtMult(mult)}x bet per spin
                      </strong>
                    </div>
                    <div className="gr-row">
                      <span className="gr-label">Price per spin</span>
                      <strong className="gr-val" data-bb="unit-price">
                        ₱ {buyBonusUnitPriceText(bet, mult)}
                      </strong>
                    </div>
                    <div className="gr-row gr-row--total">
                      <span className="gr-label">Total price</span>
                      <strong className="gr-total" data-bb="total-price">
                        {formatMoney(price)}
                      </strong>
                    </div>
                    <div className="gr-row gr-row--bal">
                      <span className="gr-label">Balance after</span>
                      <span className="gr-val gr-val--soft" data-bb="balance-after">
                        {canAfford ? formatMoney(balance - price) : formatMoney(balance)}
                      </span>
                    </div>
                  </motion.section>

                  <motion.ul {...rise(0.24)} className="gr-notice">
                    {rules.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </motion.ul>

                  {!canAfford && (
                    <div className="gr-alert" role="alert" data-bb="insufficient">
                      Insufficient balance. You need {formatMoney(price - balance)} more.
                    </div>
                  )}
                </>
              )}

              <div className="gr-actions">
                <button
                  ref={confirmRef}
                  type="button"
                  className="gr-confirm"
                  disabled={!canBuy}
                  onClick={() => onConfirm(bet, qty)}
                >
                  <span>Buy &amp; Play</span>
                  {canBuy && <small>{formatMoney(price)}</small>}
                </button>
                <button ref={cancelRef} type="button" className="gr-cancel" onClick={onCancel}>
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
