import { useEffect, useRef, useState } from "react";
import { Info, Minus, Plus, Repeat2, Square, X, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./owl-console.css";

/**
 * Midnight Owl "Astral Navigation Console": a status strip over a three-part row — orbit Bet selector, eclipse Spin and a satellite
 * column for Buy Bonus plus a compact utility menu (Turbo / Auto / Info). Same props and handlers as SlotControlDeck; presentation only.
 */
export function OwlControls({
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
    <section className="owl-console" data-owl-console data-busy={busy} aria-label="Game controls">
      <div className="owl-status" aria-label="Balance and win">
        <div className="owl-status__cell">
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <i className="owl-status__moon" aria-hidden="true" />
        <div className="owl-status__cell owl-status__cell--win" data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
      </div>

      <div className="owl-row">
        <div className="owl-bet" role="group" aria-label="Bet amount">
          <span className="owl-bet__label">Bet</span>
          <div className="owl-bet__orbit">
            <button
              type="button"
              className="owl-bet__step"
              aria-label="Decrease Bet"
              disabled={busy}
              onClick={onDecreaseBet}
            >
              <Minus size={16} />
            </button>
            {onSelectBet ? (
              <button
                type="button"
                className="owl-bet__amount"
                disabled={busy}
                onClick={onSelectBet}
                aria-label="Select Bet Amount"
              >
                {formatMoney(bet)}
              </button>
            ) : (
              <div className="owl-bet__amount">{formatMoney(bet)}</div>
            )}
            <button
              type="button"
              className="owl-bet__step"
              aria-label="Increase Bet"
              disabled={busy}
              onClick={onIncreaseBet}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="owl-eclipse"
          onClick={onSpin}
          disabled={spinDisabled}
          data-active={busy || autoSpin}
          aria-label={label === "Skip" ? "Skip spin animation" : label}
        >
          <span className="owl-eclipse__halo" aria-hidden="true" />
          <span className="owl-eclipse__ring" aria-hidden="true" />
          <span className="owl-eclipse__disc">
            <span className="owl-eclipse__corona" aria-hidden="true" />
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              aria-hidden="true"
              className="owl-eclipse__icon"
            >
              <path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" fill="currentColor" />
              <path
                d="M17.5 3.2v3M16 4.7h3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="owl-eclipse__label">{label}</span>
            {detail && <small>{detail}</small>}
          </span>
        </button>

        <div className="owl-side" ref={wrap}>
          {buyFeature ? (
            <button
              type="button"
              className="owl-buy"
              disabled={buyFeature.disabled}
              onClick={buyFeature.onClick}
            >
              <span>Buy bonus</span>
              <strong>{formatMoney(buyFeature.price)}</strong>
            </button>
          ) : inFree ? (
            <div className="owl-buy owl-buy--static" data-fs-counter={fs ?? undefined}>
              <span>Free spins</span>
              <strong>{fs ?? freeSpins}</strong>
            </div>
          ) : null}
          <button
            type="button"
            className="owl-util__toggle"
            aria-label="More controls"
            aria-expanded={menu}
            aria-haspopup="true"
            data-on={turbo || autoSpin}
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <X size={16} /> : <span className="owl-util__dots" aria-hidden="true" />}
            <span>{turbo ? "Turbo" : autoSpin ? "Auto" : "More"}</span>
          </button>
          {menu && (
            <div className="owl-util__menu" role="group" aria-label="More controls">
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
    </section>
  );
}
