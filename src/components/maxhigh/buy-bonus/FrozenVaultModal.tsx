import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  buyBonusTotal,
  buyBonusUnitPriceText,
  clampBuyBonusQuantity,
  type BuyBonusQuantitySpec,
} from "@/lib/buy-bonus";
import { formatMoney } from "@/lib/currency";
import type { BuyBonusTheme } from "./theme";
import "./frozen-vault.css";

/** Everything the vault shows about the purchased feature. All of it comes from the game's live config; nothing is invented here. */
export type FrozenVaultFeature = {
  /** Name of the trigger symbol (e.g. "Twin Lights"). */
  scatterName: string;
  /** Name of the multiplier symbol (e.g. "Spark Prism"). */
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
  /** Max win as × bet for the round (0 = uncapped). */
  maxWinMult: number;
  /** Set when the purchase cannot be offered (bad price, no quantity allowed). Shown instead of the form. */
  unavailable?: string;
};

export type FrozenVaultModalProps = {
  theme: BuyBonusTheme;
  bet: number;
  betOptions?: readonly number[];
  quantity: BuyBonusQuantitySpec;
  /** Price per free spin as a multiple of the bet at a given quantity (display only: the server prices and charges the purchase). */
  pricePerUnitMult: (quantity: number) => number;
  balance: number;
  feature: FrozenVaultFeature;
  /** Optional per-game dressing for the same dialog: a skin key (CSS hook) and the heading. Defaults to Aurora's Frozen Vault. */
  variant?: { skin: string; title: string };
  onConfirm: (bet: number, quantity: number) => void;
  onCancel: () => void;
};

const FOCUSABLE = "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";
const SHARDS = [
  { x: "8%", y: "12%", s: 10, d: 0 },
  { x: "88%", y: "9%", s: 7, d: -2 },
  { x: "14%", y: "44%", s: 6, d: -4 },
  { x: "92%", y: "40%", s: 9, d: -1 },
  { x: "6%", y: "78%", s: 8, d: -3 },
  { x: "90%", y: "82%", s: 6, d: -5 },
];

function fmtMult(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
}

/**
 * Aurora Spire's Buy Bonus: the Frozen Vault. A game-specific presentation of the shared purchase contract: the same quantity rules,
 * the same price formula (lib/buy-bonus) and the same onConfirm(bet, quantity) as every other title, so the server still prices,
 * validates and settles the purchase. Nothing here awards or charges anything.
 */
export function FrozenVaultModal({
  theme,
  bet: initialBet,
  betOptions,
  quantity: qtySpec,
  pricePerUnitMult,
  balance,
  feature,
  variant,
  onConfirm,
  onCancel,
}: FrozenVaultModalProps) {
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
  rules.push(`${feature.bombName} multipliers collected in Free Spins boost the feature total.`);
  if (feature.maxWinMult > 0)
    rules.push(`Maximum win ${feature.maxWinMult.toLocaleString("en-US")}× bet.`);

  return (
    <motion.div
      className="fv-overlay"
      data-buy-bonus-modal={theme.gameId}
      data-frozen-vault=""
      data-fv-skin={variant?.skin}
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
        className="fv-glow"
        initial={reduce ? false : { opacity: 0, scale: 0.9, y: 22 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
        transition={reduce ? { duration: 0.01 } : { type: "spring", stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="fv-frame">
          <div className="fv-card">
            {theme.backdropSrc && (
              <div
                className="fv-art"
                aria-hidden="true"
                style={{ backgroundImage: `url("${theme.backdropSrc}")` }}
              />
            )}
            <div className="fv-frost" aria-hidden="true" />
            <div className="fv-shards" aria-hidden="true">
              {SHARDS.map((s, i) => (
                <i
                  key={i}
                  style={{
                    left: s.x,
                    top: s.y,
                    width: s.s,
                    height: s.s * 1.6,
                    animationDelay: `${s.d}s`,
                  }}
                />
              ))}
            </div>

            <div className="fv-body">
              <motion.header {...rise(0.04)} className="fv-head">
                <p className="fv-kicker">{theme.gameName}</p>
                <h2 id={titleId} className="fv-title">
                  {variant?.title ?? "Frozen Vault"}
                </h2>
                <p className="fv-sub">Buy Bonus</p>
              </motion.header>

              <motion.div
                className="fv-hero"
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reduce
                    ? { duration: 0.01 }
                    : { type: "spring", stiffness: 220, damping: 16, delay: 0.1 }
                }
              >
                <div className="fv-gem" aria-hidden="true">
                  <div className="fv-gem__ring" />
                  <div className="fv-gem__face">
                    <img src={theme.symbolSrc} alt="" draggable={false} />
                  </div>
                </div>
                <div className="fv-count" id={descId}>
                  <b data-bb="spins">{qty}</b>
                  <span>{spinsWord}</span>
                </div>
              </motion.div>

              {unavailable ? (
                <div className="fv-alert" role="alert" data-bb="unavailable">
                  Buy Bonus unavailable: {unavailable}
                </div>
              ) : (
                <>
                  <motion.section {...rise(0.16)} className="fv-panel" aria-label="Purchase">
                    <div className="fv-row">
                      <span className="fv-label">Feature</span>
                      <strong className="fv-val">Free Spins round</strong>
                    </div>
                    <div className="fv-row">
                      <span className="fv-label">Current bet</span>
                      {betOptions && betOptions.length > 1 ? (
                        <div className="fv-step" data-bb="bet">
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
                        <strong className="fv-val">{formatMoney(bet)}</strong>
                      )}
                    </div>
                    <div className="fv-row">
                      <span className="fv-label">Free Spins</span>
                      {qtySpec.mode === "range" ? (
                        <div className="fv-step" data-bb="quantity">
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
                        <strong className="fv-val">{qty}</strong>
                      )}
                    </div>
                  </motion.section>

                  <motion.section
                    {...rise(0.2)}
                    className="fv-panel fv-panel--price"
                    aria-label="Price"
                  >
                    <div className="fv-row">
                      <span className="fv-label">Buy multiplier</span>
                      <strong className="fv-val" data-bb="multiplier">
                        {fmtMult(mult)}× bet per spin
                      </strong>
                    </div>
                    <div className="fv-row">
                      <span className="fv-label">Price per spin</span>
                      <strong className="fv-val" data-bb="unit-price">
                        ₱ {buyBonusUnitPriceText(bet, mult)}
                      </strong>
                    </div>
                    <div className="fv-row fv-row--total">
                      <span className="fv-label">Total price</span>
                      <strong className="fv-total" data-bb="total-price">
                        {formatMoney(price)}
                      </strong>
                    </div>
                    <div className="fv-row fv-row--bal">
                      <span className="fv-label">Balance after</span>
                      <span className="fv-val fv-val--soft" data-bb="balance-after">
                        {canAfford ? formatMoney(balance - price) : formatMoney(balance)}
                      </span>
                    </div>
                  </motion.section>

                  <motion.ul {...rise(0.24)} className="fv-rules">
                    {rules.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </motion.ul>

                  {!canAfford && (
                    <div className="fv-alert" role="alert" data-bb="insufficient">
                      Insufficient balance. You need {formatMoney(price - balance)} more.
                    </div>
                  )}
                </>
              )}

              <div className="fv-actions">
                <button
                  ref={confirmRef}
                  type="button"
                  className="fv-confirm"
                  disabled={!canBuy}
                  onClick={() => onConfirm(bet, qty)}
                >
                  <span>Buy &amp; Play</span>
                  {canBuy && <small>{formatMoney(price)}</small>}
                </button>
                <button ref={cancelRef} type="button" className="fv-cancel" onClick={onCancel}>
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
