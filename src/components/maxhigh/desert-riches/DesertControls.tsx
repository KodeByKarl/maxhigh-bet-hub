import { Gem, Info, Minus, Plus, Repeat2, RotateCw, Square, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";

/** Desert Riches presentation. The slot retains ownership of every action and amount. */
export function DesertControls({
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
      : null;

  return (
    <section
      className="desert-controls"
      data-slot-deck={gameId}
      data-busy={busy}
      aria-label="Game controls"
    >
      <div className="desert-controls__summary">
        <dl className="desert-controls__meters">
          <div>
            <dt>Balance</dt>
            <dd title={formatMoney(balance)}>{formatMoney(balance)}</dd>
          </div>
          <div data-winning={win > 0}>
            <dt>{busy ? "Round win" : "Last win"}</dt>
            <dd title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</dd>
          </div>
        </dl>
        {buyFeature ? (
          <button
            className="desert-controls__bonus"
            type="button"
            onClick={buyFeature.onClick}
            disabled={buyFeature.disabled}
          >
            <Gem size={17} aria-hidden="true" />
            <span>
              Buy Bonus<strong>{formatMoney(buyFeature.price)}</strong>
            </span>
          </button>
        ) : (
          <div className="desert-controls__round">
            {inFree ? `Free spins ${progress}` : "Ready to play"}
          </div>
        )}
      </div>
      <div className="desert-controls__actions">
        <div className="desert-controls__bet" role="group" aria-label="Bet amount">
          <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
            <Minus size={18} aria-hidden="true" />
          </button>
          {onSelectBet ? (
            <button
              className="desert-controls__stake"
              type="button"
              aria-label="Select Bet Amount"
              disabled={busy}
              onClick={onSelectBet}
            >
              <span>Bet amount</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="desert-controls__stake">
              <span>Bet amount</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="desert-controls__tools" role="group" aria-label="Game options">
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
        <button
          className="desert-controls__spin"
          type="button"
          aria-label={label === "Skip" ? "Skip spin animation" : label}
          disabled={spinDisabled}
          onClick={onSpin}
          data-active={busy || autoSpin}
        >
          {autoSpin && !busy ? (
            <Square size={28} aria-hidden="true" />
          ) : (
            <RotateCw size={32} aria-hidden="true" />
          )}
          <span>{label}</span>
        </button>
      </div>
      <div className="desert-controls__status" role="status" aria-live="polite">
        {detail ??
          (busy ? "Spin in progress" : win > 0 ? "Win credited" : "Choose your bet, then spin")}
      </div>
    </section>
  );
}
