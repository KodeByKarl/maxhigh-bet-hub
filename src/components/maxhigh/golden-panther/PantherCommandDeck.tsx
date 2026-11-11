import { useRef } from "react";
import { FastForward, Info, Minus, PawPrint, Plus, Repeat2, Square, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./panther-command-deck.css";

/** Ignore a press this soon after a SKIP so a late tap can never become a new wager. */
const POST_SKIP_GUARD_MS = 500;

/**
 * Golden Panther "Royal Predator Command Deck" — presentation only.
 * Every action is owned by the slot; this component only maps game state to controls.
 *   • SKIP  = medallion while a round animates (calls onSpin, which flags skipRef)
 *   • STOP  = utility key while auto / free-spin chain is live (calls onAuto)
 */
export function PantherCommandDeck({
  bet,
  win,
  balance,
  busy,
  turbo,
  autoSpin,
  inFree = false,
  freeSpins = 0,
  freeSpinsProgress,
  freeSpinsPaused = false,
  autoRemaining,
  spinDisabled,
  onSpin,
  onDecreaseBet,
  onIncreaseBet,
  onSelectBet,
  onInfo,
  onTurbo,
  onAuto,
  buyFeature,
}: SlotControlDeckProps) {
  const lastSkipAt = useRef(0);
  const canStop = autoSpin || busy || (inFree && !freeSpinsPaused);
  const fs = freeSpinsProgress
    ? `${freeSpinsProgress.current}/${freeSpinsProgress.total}`
    : `${freeSpins} left`;

  const mode: "skip" | "stop-auto" | "free" | "spin" = busy
    ? "skip"
    : autoSpin
      ? "stop-auto"
      : inFree
        ? "free"
        : "spin";
  const label = { skip: "Skip", "stop-auto": "Stop", free: "Free spin", spin: "Spin" }[mode];
  const sub =
    mode === "skip"
      ? inFree
        ? fs
        : "animation"
      : mode === "stop-auto"
        ? `${autoRemaining === "infinity" ? "∞" : (autoRemaining ?? 0)} left`
        : mode === "free"
          ? fs
          : null;

  const press = () => {
    const now = Date.now();
    if (busy) {
      lastSkipAt.current = now;
    } else if (now - lastSkipAt.current < POST_SKIP_GUARD_MS) {
      return;
    }
    onSpin();
  };

  const stopLabel = autoSpin ? "Stop auto spin" : inFree ? "Pause free spins" : "Stop";
  const status = busy
    ? "Spin in progress"
    : inFree
      ? `Free spins ${fs}${freeSpinsPaused ? ", paused" : ""}`
      : autoSpin
        ? "Auto spin active"
        : win > 0
          ? "Win credited"
          : "Ready";

  return (
    <section
      className="pcd"
      aria-label="Game controls"
      data-slot-deck="golden-panther"
      data-mode={mode}
      data-busy={busy}
    >
      <div className="pcd__strip">
        <div className="pcd__meter">
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <div className="pcd__meter pcd__meter--win" data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
      </div>

      <div className="pcd__deck">
        <div className="pcd__wing pcd__wing--left">
          <div className="pcd__bet" role="group" aria-label="Bet amount">
            <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
              <Minus size={15} />
            </button>
            <button
              type="button"
              className="pcd__bet-value"
              aria-label="Select Bet Amount"
              disabled={busy}
              onClick={onSelectBet}
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
            <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
              <Plus size={15} />
            </button>
          </div>
          <button
            type="button"
            className="pcd__key pcd__key--turbo"
            aria-label="Turbo Fast Mode"
            aria-pressed={turbo}
            onClick={onTurbo}
          >
            <Zap size={14} fill={turbo ? "currentColor" : "none"} aria-hidden />
            <span>Turbo</span>
            <i aria-hidden />
          </button>
        </div>

        <div className="pcd__core">
          <button
            type="button"
            className="pcd__medallion"
            data-mode={mode}
            disabled={spinDisabled}
            onClick={press}
            aria-label={mode === "skip" ? "Skip spin animation" : label}
          >
            <svg className="pcd__ring" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="47" className="pcd__ring-outer" />
              <circle cx="50" cy="50" r="42" className="pcd__ring-ticks" />
              <circle cx="50" cy="50" r="35" className="pcd__ring-inner" />
              <g className="pcd__claws">
                <path d="M14 30 L30 14" />
                <path d="M10 42 L42 10" />
                <path d="M70 90 L90 70" />
                <path d="M58 90 L90 58" />
              </g>
            </svg>
            <span className="pcd__face">
              {mode === "skip" ? (
                <FastForward size={22} fill="currentColor" aria-hidden />
              ) : mode === "stop-auto" ? (
                <Square size={18} fill="currentColor" aria-hidden />
              ) : (
                <PawPrint size={24} aria-hidden />
              )}
              <b>{label}</b>
              {sub && <small>{sub}</small>}
            </span>
          </button>
        </div>

        <div className="pcd__wing pcd__wing--right">
          {buyFeature ? (
            <button
              type="button"
              className="pcd__bonus"
              disabled={buyFeature.disabled}
              onClick={buyFeature.onClick}
            >
              <span>Buy bonus</span>
              <strong>{formatMoney(buyFeature.price)}</strong>
            </button>
          ) : (
            <div className="pcd__bonus pcd__bonus--status" aria-hidden={!inFree}>
              <span>{inFree ? "Free spins" : "Bonus"}</span>
              <strong>{inFree ? fs : "—"}</strong>
            </div>
          )}
          <div className="pcd__utils">
            {canStop ? (
              <button
                type="button"
                className="pcd__key pcd__key--stop"
                aria-label={stopLabel}
                onClick={onAuto}
              >
                <Square size={13} fill="currentColor" aria-hidden />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                className="pcd__key"
                aria-label="Auto Spin Settings"
                onClick={onAuto}
              >
                <Repeat2 size={15} aria-hidden />
                <span>Auto</span>
              </button>
            )}
            {onInfo && (
              <button
                type="button"
                className="pcd__key pcd__key--info"
                aria-label="Paytable Info"
                onClick={onInfo}
              >
                <Info size={16} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </section>
  );
}
