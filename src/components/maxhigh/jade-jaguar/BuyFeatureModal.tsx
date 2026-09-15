import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { jadeJaguarAudio } from "./audio";
import { BUY_FS_BET_MAX, BUY_FS_BET_MIN, BUY_FS_START_BET, ICON_SRC, getBuyUnitPrice } from "./paytable";

export const BUY_FS_QTY_MIN = 1;
export const BUY_FS_QTY_MAX = 50;

export type BuyFeatureModalProps = {
  balance: number;
  mode: "normal" | "super";
  onConfirm: (bet: number, quantity: number) => void;
  onCancel: () => void;
};

/** Buy Bonus: starts at bet ₱1 / qty 1. Bet goes 1,2,3…10… Price = bet × 42.5. */
export function BuyFeatureModal({
  balance,
  mode,
  onConfirm,
  onCancel,
}: BuyFeatureModalProps) {
  const [buyBet, setBuyBet] = useState(BUY_FS_START_BET);
  const [quantity, setQuantity] = useState(BUY_FS_QTY_MIN);
  const canBetMinus = buyBet > BUY_FS_BET_MIN;
  const canBetPlus = buyBet < BUY_FS_BET_MAX;
  const canQtyMinus = quantity > BUY_FS_QTY_MIN;
  const canQtyPlus = quantity < BUY_FS_QTY_MAX;
  const unitPrice = getBuyUnitPrice(buyBet, mode);
  const totalPrice = +(unitPrice * quantity).toFixed(2);
  const canAfford = balance >= totalPrice;

  const nudgeBet = (dir: -1 | 1) => {
    setBuyBet((b) => Math.min(BUY_FS_BET_MAX, Math.max(BUY_FS_BET_MIN, b + dir)));
  };

  const nudgeQty = (dir: -1 | 1) => {
    setQuantity((q) => Math.min(BUY_FS_QTY_MAX, Math.max(BUY_FS_QTY_MIN, q + dir)));
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Buy Bonus"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-[3px]"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.88, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 22 }}
        className="relative w-full max-w-[340px] overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--p-modal-border)",
          background: "linear-gradient(180deg, color-mix(in srgb, var(--p-accent-deep) 55%, #1a1208) 0%, #0c0a06 100%)",
          boxShadow: "0 22px 50px rgba(0,0,0,0.85), inset 0 1px 0 color-mix(in srgb, var(--p-accent-soft) 12%, transparent)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
          className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full border bg-black/70 text-lg font-black hover:brightness-125"
          style={{
            borderColor: "color-mix(in srgb, var(--p-accent) 50%, transparent)",
            color: "var(--p-accent-soft)",
          }}
        >
          ×
        </button>

        <div className="px-4 pb-4 pt-4">
          <div
            className="text-center font-black tracking-wide"
            style={{
              fontSize: "clamp(1.2rem, 5vw, 1.45rem)",
              color: "var(--p-modal-title)",
              textShadow: "0 2px 6px rgba(0,0,0,0.85)",
            }}
          >
            Buy Bonus
          </div>
          <p className="mx-auto mt-2 max-w-[280px] text-center text-[11px] font-semibold leading-snug text-yellow-200/90">
            Click &apos;Buy &amp; Play&apos; to purchase and activate the featured game automatically.
          </p>

          <div
            className="relative mt-4 overflow-hidden rounded-xl border border-amber-600/50 px-3 py-3"
            style={{
              background: "linear-gradient(180deg, #2a1808 0%, #140c04 100%)",
            }}
          >
            <div className="mb-3 flex justify-center">
              <img
                src={ICON_SRC.lollipop}
                alt=""
                className="size-14 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]"
                draggable={false}
              />
            </div>
            {mode === "super" && (
              <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-amber-300/90">
                Super Feature
              </div>
            )}

            <Row label="Bet(₱)">
              <Stepper
                value={buyBet % 1 === 0 ? String(buyBet) : buyBet.toFixed(2)}
                canMinus={canBetMinus}
                canPlus={canBetPlus}
                onMinus={() => nudgeBet(-1)}
                onPlus={() => nudgeBet(1)}
              />
            </Row>

            <Row label="Quantity">
              <Stepper
                value={String(quantity)}
                canMinus={canQtyMinus}
                canPlus={canQtyPlus}
                onMinus={() => nudgeQty(-1)}
                onPlus={() => nudgeQty(1)}
              />
            </Row>

            <Row label="Price">
              <ValueBox>₱ {formatPrice(unitPrice)}</ValueBox>
            </Row>

            <Row label="Total Price" last>
              <ValueBox emphasize>₱ {formatPrice(totalPrice)}</ValueBox>
            </Row>

            {!canAfford && (
              <div className="mt-2 text-center text-[11px] font-bold text-yellow-200">
                Insufficient balance
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!canAfford}
            onClick={() => {
              jadeJaguarAudio.playUiClick();
              onConfirm(buyBet, quantity);
            }}
            className="mt-4 w-full rounded-xl border-2 border-yellow-300/80 py-3.5 text-lg font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-45 hover:brightness-110"
            style={{
              background: "linear-gradient(180deg, #86efac 0%, #22c55e 40%, #15803d 100%)",
              textShadow: "0 2px 0 rgba(0,0,0,0.35)",
              boxShadow: "0 0 18px rgba(74,222,128,0.35), 0 8px 18px rgba(0,0,0,0.45)",
            }}
          >
            Buy &amp; Play
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatPrice(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function Row({
  label,
  children,
  last,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2 ${last ? "" : "border-b border-amber-700/35"}`}
    >
      <div className="shrink-0 text-[13px] font-bold text-amber-50/95">{label}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Stepper({
  value,
  canMinus,
  canPlus,
  onMinus,
  onPlus,
}: {
  value: string;
  canMinus: boolean;
  canPlus: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <StepBtn ariaLabel="Decrease" disabled={!canMinus} onClick={onMinus}>
        −
      </StepBtn>
      <ValueBox>{value}</ValueBox>
      <StepBtn ariaLabel="Increase" disabled={!canPlus} onClick={onPlus}>
        +
      </StepBtn>
    </div>
  );
}

function StepBtn({
  children,
  disabled,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 shrink-0 place-items-center rounded-md border border-amber-500/50 bg-gradient-to-b from-amber-900/80 to-black text-base font-black text-amber-100 disabled:opacity-35 hover:brightness-110"
    >
      {children}
    </button>
  );
}

function ValueBox({
  children,
  emphasize,
}: {
  children: ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`min-w-[88px] rounded-md border px-2 py-1.5 text-center text-sm font-black tabular-nums ${
        emphasize
          ? "border-yellow-400/70 text-yellow-300"
          : "border-amber-600/45 text-amber-50"
      }`}
      style={{
        background: emphasize
          ? "linear-gradient(180deg, #3f2a0a, #1a1005)"
          : "linear-gradient(180deg, #24180c, #100a04)",
      }}
    >
      {children}
    </div>
  );
}
