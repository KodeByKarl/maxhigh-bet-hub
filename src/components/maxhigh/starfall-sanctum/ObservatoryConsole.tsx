import { useEffect, useRef, useState } from "react";
import { Gem, Info, Minus, Plus, Repeat2, Sparkles, Square, Telescope, X, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./observatory.css";

/**
 * Starfall Sanctum's Observatory Console: a chamfered telescope readout (Balance / Last Win), a "magnitude" bet plate on the left,
 * an armillary-sphere Spin core in the middle (precessing rings around a lens), and Buy Bonus plus an Instruments menu on the right.
 * Same props and handlers as SlotControlDeck; presentation only.
 */
export function ObservatoryConsole({
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
    <section className="sf-deck" data-sf-deck data-busy={busy} aria-label="Game controls">
      <div className="sf-readout" aria-label="Balance and win">
        <div>
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <i aria-hidden="true" className="sf-readout__star" />
        <div data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
      </div>

      <div className="sf-row">
        <div className="sf-magnitude" role="group" aria-label="Bet amount">
          {onSelectBet ? (
            <button
              type="button"
              className="sf-magnitude__value"
              disabled={busy}
              onClick={onSelectBet}
              aria-label="Select Bet Amount"
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="sf-magnitude__value">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <div className="sf-magnitude__steps">
            <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
              <Minus size={17} />
            </button>
            <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
              <Plus size={17} />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="sf-sphere"
          onClick={onSpin}
          disabled={spinDisabled}
          data-active={busy || autoSpin}
          aria-label={label === "Skip" ? "Skip spin animation" : label === "Spin" ? "Spin" : label}
        >
          <span className="sf-sphere__rings" aria-hidden="true">
            <i className="sf-sphere__ring sf-sphere__ring--a" />
            <i className="sf-sphere__ring sf-sphere__ring--b" />
            <i className="sf-sphere__ring sf-sphere__ring--c" />
            <i className="sf-sphere__comet" />
          </span>
          <span className="sf-sphere__lens">
            <span className="sf-sphere__glare" aria-hidden="true" />
            <Sparkles size={14} aria-hidden="true" className="sf-sphere__icon" />
            <span className="sf-sphere__label">{label}</span>
            {detail && <small>{detail}</small>}
          </span>
        </button>

        <div className="sf-side">
          {buyFeature ? (
            <button
              type="button"
              className="sf-buy"
              disabled={buyFeature.disabled}
              onClick={buyFeature.onClick}
            >
              <Gem size={15} aria-hidden="true" />
              <span>Buy bonus</span>
              <strong>{formatMoney(buyFeature.price)}</strong>
            </button>
          ) : (
            <div className="sf-buy sf-buy--static" data-fs-counter={fs ?? undefined}>
              <Gem size={15} aria-hidden="true" />
              <span>{inFree ? "Free spins" : "Ready"}</span>
              {inFree && <strong>{fs ?? freeSpins}</strong>}
            </div>
          )}
          <div className="sf-util" ref={wrap}>
            <button
              type="button"
              className="sf-util__toggle"
              aria-label="More controls"
              aria-expanded={menu}
              aria-haspopup="true"
              data-on={turbo || autoSpin}
              onClick={() => setMenu((v) => !v)}
            >
              {menu ? <X size={18} /> : <Telescope size={18} />}
              <span>Scope</span>
            </button>
            {menu && (
              <div className="sf-util__menu" role="group" aria-label="More controls">
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
