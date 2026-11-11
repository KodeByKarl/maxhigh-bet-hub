import { Cat, FastForward, Info, Minus, Plus, Repeat2, Square, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./neko-theme.css";

/** One sakura petal with the characteristic notched tip, drawn pointing up from the origin. */
const PETAL = "M0 -4 C-17 -14 -23 -40 -9 -54 L0 -47 L9 -54 C23 -40 17 -14 0 -4 Z";
const PETAL_ANGLES = [0, 72, 144, 216, 288];

/**
 * Lucky Neko "Fortune Control Chamber" — presentation only.
 * The slot owns every action and amount; this component only maps game state onto the controls.
 *   Spin seal (centre) -> Spin / Skip (while a round animates) / Stop (auto) / Free spin
 *   Left wing          -> Bet plate + decrease / increase
 *   Right wing         -> Buy bonus plate + Turbo + Auto / Stop
 */
export function NekoControlChamber({
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
  spinDisabled = false,
  supportsSkip = true,
  onSpin,
  onDecreaseBet,
  onIncreaseBet,
  onSelectBet,
  onInfo,
  onTurbo,
  onAuto,
  buyFeature,
}: SlotControlDeckProps) {
  const canStop = autoSpin || (supportsSkip && (busy || (inFree && !freeSpinsPaused)));
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
  const label = { skip: "Skip", "stop-auto": "Stop", free: "Free", spin: "Spin" }[mode];
  const ariaLabel = {
    skip: "Skip spin animation",
    "stop-auto": "Stop auto",
    free: "Free spin",
    spin: "Spin",
  }[mode];
  const sub =
    mode === "skip"
      ? inFree
        ? fs
        : null
      : mode === "stop-auto"
        ? `${autoRemaining === "infinity" ? "∞" : (autoRemaining ?? 0)} left`
        : mode === "free"
          ? fs
          : null;

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
      className="nk-deck"
      aria-label="Game controls"
      data-slot-deck="lucky-neko"
      data-mode={mode}
      data-busy={busy}
    >
      <div className="nk-rail">
        <div className="nk-meter">
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <div className="nk-meter nk-meter--win" data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
        {onInfo && (
          <button type="button" className="nk-info" aria-label="Paytable Info" onClick={onInfo}>
            <Info size={17} aria-hidden />
          </button>
        )}
      </div>

      <div className="nk-chamber">
        <div className="nk-wing">
          <button
            type="button"
            className="nk-plate nk-bet-value"
            aria-label="Select Bet Amount"
            disabled={busy}
            onClick={onSelectBet}
          >
            <span>Bet</span>
            <strong>{formatMoney(bet)}</strong>
          </button>
          <div className="nk-steps" role="group" aria-label="Bet amount">
            <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
              <Minus size={18} aria-hidden />
            </button>
            <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
              <Plus size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="nk-core">
          <button
            type="button"
            className="nk-spin"
            data-mode={mode}
            disabled={spinDisabled}
            onClick={onSpin}
            aria-label={ariaLabel}
          >
            <svg className="nk-spin__art" viewBox="0 0 120 120" aria-hidden focusable="false">
              <defs>
                <linearGradient id="nk-gold" x1="0" y1="0" x2="0.8" y2="1">
                  <stop offset="0" stopColor="#f6dc94" />
                  <stop offset="0.5" stopColor="#c9983f" />
                  <stop offset="1" stopColor="#7a5520" />
                </linearGradient>
                <radialGradient id="nk-lacquer" cx="0.4" cy="0.3" r="0.9">
                  <stop offset="0" stopColor="#d4414a" />
                  <stop offset="0.55" stopColor="#9a1d26" />
                  <stop offset="1" stopColor="#4d0b14" />
                </radialGradient>
              </defs>
              <g className="nk-spin__petals" transform="translate(60 60)">
                {PETAL_ANGLES.map((a) => (
                  <path key={a} d={PETAL} transform={`rotate(${a})`} />
                ))}
                {PETAL_ANGLES.map((a) => (
                  <path
                    key={`v${a}`}
                    className="nk-spin__vein"
                    d="M0 -42 L0 -49"
                    transform={`rotate(${a})`}
                  />
                ))}
              </g>
              <circle className="nk-spin__shade" cx="60" cy="62" r="40" />
              <circle className="nk-spin__rim" cx="60" cy="60" r="39" />
              <circle className="nk-spin__engrave" cx="60" cy="60" r="35.5" />
              <circle className="nk-spin__disc" cx="60" cy="60" r="32" />
              <path className="nk-spin__gloss" d="M38 48 C44 33 62 28 78 36 C64 36 50 40 38 48 Z" />
            </svg>
            <span className="nk-spin__face">
              {mode === "skip" ? (
                <FastForward size={19} fill="currentColor" aria-hidden />
              ) : mode === "stop-auto" ? (
                <Square size={16} fill="currentColor" aria-hidden />
              ) : (
                <Cat size={21} aria-hidden />
              )}
              <b>{label}</b>
              {sub && <small>{sub}</small>}
            </span>
          </button>
        </div>

        <div className="nk-wing">
          {buyFeature ? (
            <button
              type="button"
              className="nk-plate nk-bonus"
              disabled={buyFeature.disabled}
              onClick={buyFeature.onClick}
            >
              <span>Buy bonus</span>
              <strong>{formatMoney(buyFeature.price)}</strong>
            </button>
          ) : (
            <div className="nk-plate nk-bonus nk-bonus--status">
              <span>{inFree ? "Free spins" : "Bonus"}</span>
              <strong>{inFree ? (freeSpinsProgress ? fs : freeSpins) : "—"}</strong>
            </div>
          )}
          <div className="nk-utils">
            <button
              type="button"
              className="nk-key"
              aria-label="Turbo Fast Mode"
              aria-pressed={turbo}
              onClick={onTurbo}
            >
              <Zap size={16} fill={turbo ? "currentColor" : "none"} aria-hidden />
              <span>Turbo</span>
            </button>
            <button
              type="button"
              className="nk-key"
              aria-label={canStop ? "Stop Game" : "Auto Spin Settings"}
              aria-pressed={autoSpin}
              data-stopping={canStop}
              onClick={onAuto}
            >
              {canStop ? (
                <Square size={14} fill="currentColor" aria-hidden />
              ) : (
                <Repeat2 size={16} aria-hidden />
              )}
              <span>{canStop ? "Stop" : "Auto"}</span>
            </button>
          </div>
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </section>
  );
}
