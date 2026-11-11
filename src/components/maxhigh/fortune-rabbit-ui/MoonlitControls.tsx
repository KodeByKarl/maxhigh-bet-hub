import { useEffect, useRef, useState } from "react";
import { Info, Minus, Moon, MoreHorizontal, Plus, Repeat2, Square, X, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./moonlit.css";

/**
 * Fortune Rabbit "Moonlit Fortune" control deck: status rail (left), lunar-medallion Spin (centre), Bet + Buy Bonus (right) and a
 * utility menu for Turbo / Auto / Info. Same props and handlers as SlotControlDeck; presentation only.
 */
export function MoonlitControls({
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
    <section className="mf-deck" data-mf-deck data-busy={busy} aria-label="Game controls">
      <div className="mf-rail" aria-label="Balance and win">
        <div>
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <div data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>

        <div className="mf-util" ref={wrap}>
          <button
            type="button"
            className="mf-util__toggle"
            aria-label="More controls"
            aria-expanded={menu}
            aria-haspopup="true"
            data-on={turbo || autoSpin}
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <X size={18} /> : <MoreHorizontal size={18} />}
          </button>
          {menu && (
            <div className="mf-util__menu" role="group" aria-label="More controls">
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

      <button
        type="button"
        className="mf-moon"
        onClick={onSpin}
        disabled={spinDisabled}
        data-active={busy || autoSpin}
        aria-label={label === "Skip" ? "Skip spin animation" : label === "Spin" ? "Spin" : label}
      >
        <span className="mf-moon__ring" aria-hidden="true" />
        <span className="mf-moon__face">
          <Moon size={17} aria-hidden="true" className="mf-moon__icon" />
          <span className="mf-moon__label">{label}</span>
          {detail && <small>{detail}</small>}
        </span>
      </button>

      <div className="mf-right">
        <div className="mf-bet" role="group" aria-label="Bet amount">
          {onSelectBet ? (
            <button
              type="button"
              className="mf-bet__amount"
              disabled={busy}
              onClick={onSelectBet}
              aria-label="Select Bet Amount"
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="mf-bet__amount">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
            <Minus size={17} />
          </button>
          <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
            <Plus size={17} />
          </button>
        </div>
        {buyFeature ? (
          <button
            type="button"
            className="mf-buy"
            disabled={buyFeature.disabled}
            onClick={buyFeature.onClick}
          >
            <span>Buy bonus</span>
            <strong>{formatMoney(buyFeature.price)}</strong>
          </button>
        ) : (
          <div className="mf-buy mf-buy--static" data-fs-counter={fs ?? undefined}>
            <span>{inFree ? "Free spins" : "Ready"}</span>
            {inFree && <strong>{fs ?? freeSpins}</strong>}
          </div>
        )}
      </div>
    </section>
  );
}
