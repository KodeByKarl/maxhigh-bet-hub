import { Flame, Info, Minus, Plus, Repeat2, RotateCw, Square, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";

/** Presentation only: all prices, flags and callbacks belong to EmberTigerSlot. */
export function EmberControls({
  gameId,
  balance,
  win,
  bet,
  busy,
  turbo,
  autoSpin,
  inFree = false,
  freeSpins = 0,
  freeSpinsProgress,
  freeSpinsPaused = false,
  autoRemaining,
  spinDisabled = false,
  supportsSkip = true,
  buyFeature,
  onSpin,
  onDecreaseBet,
  onIncreaseBet,
  onSelectBet,
  onTurbo,
  onAuto,
  onInfo,
}: SlotControlDeckProps) {
  const canStop = autoSpin || (supportsSkip && (busy || (inFree && !freeSpinsPaused)));
  const label = busy
    ? supportsSkip
      ? "Skip"
      : "Spinning"
    : autoSpin
      ? "Stop auto"
      : inFree
        ? "Free spin"
        : "Spin";
  const progress = freeSpinsProgress
    ? `${freeSpinsProgress.current}/${freeSpinsProgress.total}`
    : `${freeSpins} left`;
  const detail = inFree
    ? `Free spins ${progress}${freeSpinsPaused ? " · paused" : ""}`
    : autoSpin && autoRemaining !== undefined
      ? `${autoRemaining === "infinity" ? "∞" : autoRemaining} auto spins left`
      : busy
        ? "Spin in progress"
        : win > 0
          ? "Win credited"
          : "Choose your bet, then spin";

  return (
    <section
      className="ember-console"
      data-slot-deck={gameId}
      data-busy={busy}
      aria-label="Game controls"
    >
      <dl className="ember-console__meters">
        <div>
          <dt>Balance</dt>
          <dd title={formatMoney(balance)}>{formatMoney(balance)}</dd>
        </div>
        <div data-winning={win > 0}>
          <dt>{busy ? "Round win" : "Last win"}</dt>
          <dd title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</dd>
        </div>
      </dl>
      <div className="ember-console__wager">
        <div className="ember-console__bet" role="group" aria-label="Bet amount">
          <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
            <Minus size={18} aria-hidden="true" />
          </button>
          {onSelectBet ? (
            <button
              className="ember-console__stake"
              type="button"
              aria-label="Select Bet Amount"
              disabled={busy}
              onClick={onSelectBet}
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="ember-console__stake">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        {buyFeature ? (
          <button
            className="ember-console__bonus"
            type="button"
            disabled={buyFeature.disabled}
            onClick={buyFeature.onClick}
          >
            <Flame size={18} aria-hidden="true" />
            <span>
              Buy Bonus<strong>{formatMoney(buyFeature.price)}</strong>
            </span>
          </button>
        ) : (
          <div className="ember-console__round">
            {inFree ? `Free spins ${progress}` : "Ready to play"}
          </div>
        )}
      </div>
      <button
        className="ember-console__spin"
        type="button"
        onClick={onSpin}
        disabled={spinDisabled}
        aria-label={label === "Skip" ? "Skip spin animation" : label}
        aria-busy={busy}
        data-active={busy || autoSpin}
      >
        <span className="ember-console__spin-face">
          {autoSpin && !busy ? (
            <Square size={26} aria-hidden="true" />
          ) : (
            <RotateCw size={28} aria-hidden="true" />
          )}
          <span>{label}</span>
        </span>
      </button>
      <div className="ember-console__tools" role="group" aria-label="Game options">
        <button type="button" aria-label="Turbo Fast Mode" aria-pressed={turbo} onClick={onTurbo}>
          <Zap size={17} aria-hidden="true" />
          <span>Turbo</span>
        </button>
        <button
          type="button"
          aria-label={canStop ? "Stop Game" : "Auto Spin Settings"}
          aria-pressed={autoSpin}
          data-stopping={canStop}
          onClick={onAuto}
        >
          {canStop ? (
            <Square size={16} aria-hidden="true" />
          ) : (
            <Repeat2 size={18} aria-hidden="true" />
          )}
          <span>{canStop ? "Stop" : "Auto"}</span>
        </button>
        {onInfo && (
          <button type="button" aria-label="Paytable Info" onClick={onInfo}>
            <Info size={18} aria-hidden="true" />
            <span>Info</span>
          </button>
        )}
      </div>
      <div className="ember-console__status" role="status" aria-live="polite">
        {detail}
      </div>
    </section>
  );
}
