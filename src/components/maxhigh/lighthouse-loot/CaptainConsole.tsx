import { useEffect, useRef, useState } from "react";
import { Anchor, Gem, Info, Minus, Plus, Repeat2, Ship, Square, X, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./captain-console.css";

/**
 * Lighthouse Loot's Captain's Navigation Console: instrument strip on top (Balance / Last Win), a vertical bet throttle on the left,
 * a brass compass Spin in the middle, and Buy Bonus plus a helm menu (Turbo / Auto / Info) on the right.
 * Same props and handlers as SlotControlDeck; presentation only.
 */
export function CaptainConsole({
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
    <section className="cx-deck" data-cx-deck data-busy={busy} aria-label="Game controls">
      <div className="cx-strip" aria-label="Balance and win">
        <div>
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <i aria-hidden="true" className="cx-strip__rose" />
        <div data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
      </div>

      <div className="cx-helm">
        <div className="cx-throttle" role="group" aria-label="Bet amount">
          <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
            <Plus size={17} />
          </button>
          {onSelectBet ? (
            <button
              type="button"
              className="cx-throttle__value"
              disabled={busy}
              onClick={onSelectBet}
              aria-label="Select Bet Amount"
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="cx-throttle__value">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
            <Minus size={17} />
          </button>
        </div>

        <button
          type="button"
          className="cx-compass"
          onClick={onSpin}
          disabled={spinDisabled}
          data-active={busy || autoSpin}
          aria-label={label === "Skip" ? "Skip spin animation" : label === "Spin" ? "Spin" : label}
        >
          <span className="cx-compass__ring" aria-hidden="true" />
          <span className="cx-compass__face">
            <span className="cx-compass__beam" aria-hidden="true" />
            <Anchor size={15} aria-hidden="true" className="cx-compass__icon" />
            <span className="cx-compass__label">{label}</span>
            {detail && <small>{detail}</small>}
          </span>
        </button>

        <div className="cx-side">
          {buyFeature ? (
            <button
              type="button"
              className="cx-buy"
              disabled={buyFeature.disabled}
              onClick={buyFeature.onClick}
            >
              <Gem size={15} aria-hidden="true" />
              <span>Buy bonus</span>
              <strong>{formatMoney(buyFeature.price)}</strong>
            </button>
          ) : (
            <div className="cx-buy cx-buy--static" data-fs-counter={fs ?? undefined}>
              <Gem size={15} aria-hidden="true" />
              <span>{inFree ? "Free spins" : "Ready"}</span>
              {inFree && <strong>{fs ?? freeSpins}</strong>}
            </div>
          )}
          <div className="cx-util" ref={wrap}>
            <button
              type="button"
              className="cx-util__toggle"
              aria-label="More controls"
              aria-expanded={menu}
              aria-haspopup="true"
              data-on={turbo || autoSpin}
              onClick={() => setMenu((v) => !v)}
            >
              {menu ? <X size={18} /> : <Ship size={18} />}
              <span>Helm</span>
            </button>
            {menu && (
              <div className="cx-util__menu" role="group" aria-label="More controls">
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
      </div>
    </section>
  );
}
