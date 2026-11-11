import { useEffect, useRef, useState } from "react";
import { Info, Minus, MoreHorizontal, Plus, Repeat2, Square, X, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./ra-deck.css";

/**
 * Gate of Ra "Temple of the Sun" control deck: status rail on top, engraved Bet plate (left) and a sun-disc Spin (right).
 * Same props and handlers as SlotControlDeck; presentation only.
 */
export function RaControls({
  bet,
  win,
  balance,
  busy,
  turbo,
  autoSpin,
  inFree = false,
  freeSpins = 0,
  freeSpinsProgress = null,
  freeSpinsPaused = false,
  autoRemaining,
  spinDisabled = false,
  onSpin,
  onDecreaseBet,
  onIncreaseBet,
  onSelectBet,
  onInfo,
  onTurbo,
  onAuto,
  supportsSkip = true,
  buyFeature,
}: SlotControlDeckProps) {
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const canStop = autoSpin || (supportsSkip && (busy || (inFree && !freeSpinsPaused)));
  const label = busy
    ? supportsSkip
      ? "Skip"
      : "Wait"
    : autoSpin
      ? "Stop"
      : inFree
        ? "Free"
        : "Spin";
  const fs = freeSpinsProgress ? `${freeSpinsProgress.current}/${freeSpinsProgress.total}` : null;
  const detail = inFree
    ? (fs ?? `${freeSpins} left`)
    : autoSpin && autoRemaining !== undefined
      ? `${autoRemaining === "infinity" ? "∞" : autoRemaining} left`
      : null;

  return (
    <section className="ra-deck" data-ra-deck data-busy={busy} aria-label="Game controls">
      <div className="ra-rail" aria-label="Balance and win">
        <div className="ra-rail__cell">
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <div className="ra-rail__cell" data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
        {buyFeature ? (
          <button
            type="button"
            className="ra-buy"
            disabled={buyFeature.disabled}
            onClick={buyFeature.onClick}
          >
            <span>Buy bonus</span>
            <strong>{formatMoney(buyFeature.price)}</strong>
          </button>
        ) : inFree ? (
          <div className="ra-buy ra-buy--static" data-fs-counter={fs ?? undefined}>
            <span>Free spins</span>
            <strong>{fs ?? freeSpins}</strong>
          </div>
        ) : null}

        <div className="ra-util" ref={wrap}>
          <button
            type="button"
            className="ra-util__toggle"
            aria-label="More controls"
            aria-expanded={menu}
            aria-haspopup="true"
            data-on={turbo || autoSpin}
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <X size={18} /> : <MoreHorizontal size={18} />}
          </button>
          {menu && (
            <div className="ra-util__menu" role="group" aria-label="More controls">
              <button
                type="button"
                aria-label="Turbo Fast Mode"
                aria-pressed={turbo}
                onClick={onTurbo}
              >
                <Zap size={16} fill={turbo ? "currentColor" : "none"} />
                Turbo
              </button>
              <button
                type="button"
                aria-label={canStop ? "Stop Game" : "Auto Spin Settings"}
                aria-pressed={autoSpin}
                onClick={() => {
                  setMenu(false);
                  onAuto();
                }}
              >
                {canStop ? <Square size={15} fill="currentColor" /> : <Repeat2 size={16} />}
                {canStop ? "Stop" : "Auto"}
              </button>
              {onInfo && (
                <button
                  type="button"
                  aria-label="Paytable Info"
                  onClick={() => {
                    setMenu(false);
                    onInfo();
                  }}
                >
                  <Info size={16} />
                  Info
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="ra-main">
        <div className="ra-bet" role="group" aria-label="Bet amount">
          <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
            <Minus size={18} />
          </button>
          {onSelectBet ? (
            <button
              type="button"
              className="ra-bet__amount"
              disabled={busy}
              onClick={onSelectBet}
              aria-label="Select Bet Amount"
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="ra-bet__amount">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
            <Plus size={18} />
          </button>
        </div>

        <button
          type="button"
          className="ra-sun"
          onClick={onSpin}
          disabled={spinDisabled}
          data-active={busy || autoSpin}
          aria-label={label === "Skip" ? "Skip spin animation" : label}
        >
          <span className="ra-sun__ring" aria-hidden="true" />
          <span className="ra-sun__face">
            <span className="ra-sun__rays" aria-hidden="true" />
            <span className="ra-sun__core">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                className="ra-sun__icon"
              >
                <circle cx="12" cy="12" r="4.2" fill="currentColor" />
                <path
                  d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span className="ra-sun__label">{label}</span>
              {detail && <small>{detail}</small>}
            </span>
          </span>
        </button>
      </div>
    </section>
  );
}
