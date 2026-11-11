import { useEffect, useRef, useState } from "react";
import { Info, Minus, Orbit, Plus, Repeat2, Square, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./comet-carnival.css";

/**
 * Comet Carnival's control layer: a floating "Cosmic Core" Spin with Bet, Buy Bonus and the secondary actions orbiting it.
 * Presentation only. It receives exactly the props SlotControlDeck does (same handlers, same server-derived numbers) and
 * keeps the same accessible names, so no gameplay, pricing or session logic lives here.
 */
export function CosmicControls({
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
  const canStop = autoSpin || (supportsSkip && (busy || (inFree && !freeSpinsPaused)));
  const spinLabel = busy
    ? supportsSkip
      ? "Skip"
      : "Spinning"
    : autoSpin
      ? "Stop"
      : inFree
        ? "Free"
        : "Spin";
  const fsCounter = freeSpinsProgress
    ? `${freeSpinsProgress.current}/${freeSpinsProgress.total}`
    : null;
  const detail = inFree
    ? (fsCounter ?? `${freeSpins} left`)
    : autoSpin && autoRemaining !== undefined
      ? `${autoRemaining === "infinity" ? "∞" : autoRemaining} left`
      : null;
  const status = busy
    ? "Spin in progress"
    : inFree
      ? `Free spins ${fsCounter ?? `${freeSpins} left`}${freeSpinsPaused ? " · paused" : ""}`
      : autoSpin
        ? "Auto spin active"
        : win > 0
          ? "Win credited"
          : "Set your bet, then spin";

  // Starlight burst: fires once per settled win, so it follows the real result and never plays on a loss.
  const [burst, setBurst] = useState(0);
  const settledWin = useRef(0);
  useEffect(() => {
    if (!busy && win > 0 && win !== settledWin.current) setBurst((n) => n + 1);
    settledWin.current = busy ? 0 : win;
  }, [busy, win]);

  return (
    <section
      className="cc-deck"
      data-cc-deck="comet-carnival"
      data-busy={busy}
      aria-label="Game controls"
    >
      <div className="cc-meters">
        <div className="cc-meter">
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <div className="cc-meter cc-meter--win" data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
        {onInfo && (
          <button
            type="button"
            className="cc-chip cc-chip--icon"
            aria-label="Paytable Info"
            onClick={onInfo}
          >
            <Info size={18} />
          </button>
        )}
      </div>

      <div className="cc-play">
        <div className="cc-side cc-side--bet" role="group" aria-label="Bet amount">
          {onSelectBet ? (
            <button
              type="button"
              className="cc-chip cc-bet"
              disabled={busy}
              onClick={onSelectBet}
              aria-label="Select Bet Amount"
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="cc-chip cc-bet">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <div className="cc-pair">
            <button
              type="button"
              className="cc-chip cc-chip--icon"
              aria-label="Decrease Bet"
              disabled={busy}
              onClick={onDecreaseBet}
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              className="cc-chip cc-chip--icon"
              aria-label="Increase Bet"
              disabled={busy}
              onClick={onIncreaseBet}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="cc-core"
          onClick={onSpin}
          disabled={spinDisabled}
          data-active={busy || autoSpin}
          data-busy={busy}
          aria-label={
            spinLabel === "Skip" ? "Skip spin animation" : spinLabel === "Spin" ? "Spin" : spinLabel
          }
        >
          <span className="cc-core__halo" aria-hidden="true" />
          <span className="cc-core__orbit" aria-hidden="true" />
          <span className="cc-core__glass">
            <span className="cc-core__label">{spinLabel}</span>
            {detail && <small>{detail}</small>}
          </span>
          {burst > 0 && <i key={burst} className="cc-burst" aria-hidden="true" />}
        </button>

        <div className="cc-side cc-side--aux">
          {buyFeature ? (
            <button
              type="button"
              className="cc-chip cc-buy"
              disabled={buyFeature.disabled}
              onClick={buyFeature.onClick}
            >
              <Orbit size={15} aria-hidden="true" />
              <span>
                Buy bonus<strong>{formatMoney(buyFeature.price)}</strong>
              </span>
            </button>
          ) : (
            <div className="cc-chip cc-buy cc-buy--static" data-fs-counter={fsCounter ?? undefined}>
              <Orbit size={15} aria-hidden="true" />
              <span>
                {inFree ? "Free spins" : "Ready"}
                <strong>{inFree ? (fsCounter ?? freeSpins) : "To play"}</strong>
              </span>
            </div>
          )}
          <div className="cc-pair">
            <button
              type="button"
              className="cc-chip cc-chip--icon"
              aria-label="Turbo Fast Mode"
              aria-pressed={turbo}
              onClick={onTurbo}
            >
              <Zap size={18} fill={turbo ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              className="cc-chip cc-chip--icon"
              aria-label={canStop ? "Stop Game" : "Auto Spin Settings"}
              aria-pressed={autoSpin}
              data-stopping={canStop}
              onClick={onAuto}
            >
              {canStop ? <Square size={16} fill="currentColor" /> : <Repeat2 size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="cc-status" role="status" aria-live="polite">
        {status}
      </div>
    </section>
  );
}
