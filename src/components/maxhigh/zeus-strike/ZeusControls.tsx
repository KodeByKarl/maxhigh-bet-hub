import { Info, Minus, Plus, Repeat2, Square, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import { BOLT_PATH } from "./TempleFrame";

/**
 * The Olympian Thunder Altar — presentation only. Every price, flag and callback is owned by ZeusStrikeSlot; this component only
 * arranges them around a pediment-shaped thunderbolt altar:
 *   left  : Treasury (Balance) + Bet selector
 *   centre: Spin altar
 *   right : Treasury (Last win) + Buy Bonus seal
 *   base  : Turbo · Auto · Paytable
 */
export function ZeusControls({
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
      : "Wait"
    : autoSpin
      ? "Stop"
      : inFree
        ? "Free"
        : "Spin";
  const ariaLabel = busy
    ? supportsSkip
      ? "Skip spin animation"
      : "Spinning"
    : autoSpin
      ? "Stop auto spin"
      : inFree
        ? "Free spin"
        : "Spin";
  const progress = freeSpinsProgress
    ? `${freeSpinsProgress.current}/${freeSpinsProgress.total}`
    : `${freeSpins} left`;
  const autoCount = autoRemaining === "infinity" ? "∞" : autoRemaining;
  const sub = inFree ? progress : autoSpin && autoCount !== undefined ? `${autoCount} left` : "";
  const detail = inFree
    ? `Free spins ${progress}${freeSpinsPaused ? " · paused" : ""}`
    : autoSpin && autoCount !== undefined
      ? `Auto spin · ${autoCount} left`
      : busy
        ? "Spin in progress"
        : win > 0
          ? "Win credited"
          : "Set your bet, then spin";

  return (
    <section
      className="zs-altar"
      data-slot-deck={gameId}
      data-busy={busy}
      aria-label="Game controls"
    >
      <div className="zs-altar__row">
        <div className="zs-side zs-side--left">
          <dl className="zs-plaque">
            <dt>Balance</dt>
            <dd title={formatMoney(balance)}>{formatMoney(balance)}</dd>
          </dl>
          <div className="zs-bet" role="group" aria-label="Bet amount">
            <button
              className="zs-bet__step"
              type="button"
              aria-label="Decrease Bet"
              disabled={busy}
              onClick={onDecreaseBet}
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            {onSelectBet ? (
              <button
                className="zs-bet__value"
                type="button"
                aria-label="Select Bet Amount"
                disabled={busy}
                onClick={onSelectBet}
              >
                <span>Bet</span>
                <strong>{formatMoney(bet)}</strong>
              </button>
            ) : (
              <div className="zs-bet__value">
                <span>Bet</span>
                <strong>{formatMoney(bet)}</strong>
              </div>
            )}
            <button
              className="zs-bet__step"
              type="button"
              aria-label="Increase Bet"
              disabled={busy}
              onClick={onIncreaseBet}
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <button
          className="zs-spin"
          type="button"
          onClick={onSpin}
          disabled={spinDisabled}
          aria-label={ariaLabel}
          aria-busy={busy}
          data-active={busy || autoSpin}
        >
          <span className="zs-spin__steps" aria-hidden="true" />
          <span className="zs-spin__rim" aria-hidden="true" />
          <span className="zs-spin__face" aria-hidden="true" />
          <span className="zs-spin__arc" aria-hidden="true" />
          <svg className="zs-spin__bolt" viewBox="0 0 48 64" aria-hidden="true">
            <path d={BOLT_PATH} className="zs-bolt-fill" />
          </svg>
          <span className="zs-spin__label">
            {autoSpin && !busy ? <Square size={11} aria-hidden="true" /> : null}
            {label}
            {sub ? <small>{sub}</small> : null}
          </span>
        </button>

        <div className="zs-side zs-side--right">
          <dl className="zs-plaque" data-winning={win > 0}>
            <dt>{busy ? "Round win" : "Last win"}</dt>
            <dd title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</dd>
          </dl>
          {buyFeature ? (
            <button
              className="zs-buy"
              type="button"
              disabled={buyFeature.disabled}
              onClick={buyFeature.onClick}
              aria-label={`Buy Bonus ${formatMoney(buyFeature.price)}`}
            >
              <span>Buy Bonus</span>
              <strong>{formatMoney(buyFeature.price)}</strong>
            </button>
          ) : (
            <div className="zs-buy zs-buy--idle" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="zs-tools" role="group" aria-label="Game options">
        <button
          type="button"
          aria-label="Turbo Fast Mode"
          aria-pressed={turbo}
          data-on={turbo}
          onClick={onTurbo}
        >
          <Zap size={15} aria-hidden="true" />
          <span>Turbo</span>
        </button>
        <button
          type="button"
          aria-label={canStop ? "Stop Game" : "Auto Spin Settings"}
          aria-pressed={autoSpin}
          data-on={autoSpin}
          onClick={onAuto}
        >
          {canStop ? (
            <Square size={14} aria-hidden="true" />
          ) : (
            <Repeat2 size={16} aria-hidden="true" />
          )}
          <span>{canStop ? "Stop" : "Auto"}</span>
        </button>
        {onInfo && (
          <button type="button" aria-label="Paytable Info" onClick={onInfo}>
            <Info size={16} aria-hidden="true" />
            <span>Paytable</span>
          </button>
        )}
      </div>
      <p className="zs-sr" role="status" aria-live="polite">
        {detail}
      </p>
    </section>
  );
}
