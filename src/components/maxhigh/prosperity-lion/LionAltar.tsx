import { Gem, Info, Minus, Plus, Repeat2, RotateCw, Square, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";

/** Gold cloud lobes of the seal rim (angles offset so the crest sits in the gap at 12 o'clock). */
const LOBES = Array.from({ length: 12 }, (_, k) => {
  const a = ((k * 30 + 15) * Math.PI) / 180;
  return { x: +(60 + 51 * Math.sin(a)).toFixed(2), y: +(60 - 51 * Math.cos(a)).toFixed(2) };
});

/**
 * Prosperity Lion — "Imperial Guardian Control Altar". Presentation only: the slot owns every action,
 * amount and state; this component maps them onto a treasury plaque rail and a three-part dais
 * (Bet pillar · Guardian Seal · Utility pillar).
 */
export function LionAltar({
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
      ? "Stop auto"
      : inFree
        ? "Free spin"
        : "Spin";
  const progress = freeSpinsProgress
    ? `${freeSpinsProgress.current}/${freeSpinsProgress.total}`
    : `${freeSpins} left`;
  const sub = inFree
    ? progress
    : autoSpin && autoRemaining !== undefined
      ? `${autoRemaining === "infinity" ? "∞" : autoRemaining} left`
      : null;
  const mode = busy ? "busy" : autoSpin ? "auto" : inFree ? "free" : "ready";
  const status = busy
    ? "Spin in progress"
    : inFree
      ? `Free spins ${progress}${freeSpinsPaused ? " · paused" : ""}`
      : autoSpin
        ? `${autoRemaining === "infinity" ? "∞" : (autoRemaining ?? 0)} auto spins left`
        : win > 0
          ? "Win credited"
          : "Choose your bet, then spin";

  return (
    <section
      className="lion-altar"
      data-slot-deck={gameId}
      data-busy={busy}
      data-mode={mode}
      aria-label="Game controls"
    >
      <div className="lion-altar__rail">
        <dl className="lion-altar__plaque">
          <dt>Balance</dt>
          <dd title={formatMoney(balance)}>{formatMoney(balance)}</dd>
        </dl>
        <dl className="lion-altar__plaque" data-winning={win > 0}>
          <dt>{busy ? "Round win" : "Last win"}</dt>
          <dd title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</dd>
        </dl>
        {buyFeature ? (
          <button
            type="button"
            className="lion-altar__bonus"
            disabled={buyFeature.disabled}
            onClick={buyFeature.onClick}
          >
            <Gem size={16} aria-hidden="true" />
            <span>
              Buy Bonus<strong>{formatMoney(buyFeature.price)}</strong>
            </span>
          </button>
        ) : (
          <div className="lion-altar__plaque lion-altar__plaque--round">
            <dt>{inFree ? "Free spins" : "Round"}</dt>
            <dd>{inFree ? progress : "Ready"}</dd>
          </div>
        )}
      </div>

      <div className="lion-altar__dais">
        <div className="lion-altar__pillar lion-altar__bet" role="group" aria-label="Bet amount">
          <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
            <Plus size={18} aria-hidden="true" />
          </button>
          {onSelectBet ? (
            <button
              type="button"
              className="lion-altar__stake"
              aria-label="Select Bet Amount"
              disabled={busy}
              onClick={onSelectBet}
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="lion-altar__stake">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
            <Minus size={18} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className="lion-altar__seal"
          aria-label={ariaLabel}
          aria-busy={busy}
          disabled={spinDisabled}
          data-mode={mode}
          onClick={onSpin}
        >
          <svg className="lion-altar__art" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="lion-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff0b0" />
                <stop offset="0.35" stopColor="#e2b552" />
                <stop offset="0.7" stopColor="#a8741e" />
                <stop offset="1" stopColor="#f0cd78" />
              </linearGradient>
              <radialGradient id="lion-lacquer" cx="0.4" cy="0.3" r="0.9">
                <stop offset="0" stopColor="#e2483a" />
                <stop offset="0.55" stopColor="#a31d17" />
                <stop offset="1" stopColor="#560808" />
              </radialGradient>
            </defs>
            <g className="lion-altar__lobes">
              {LOBES.map((l, i) => (
                <circle key={i} cx={l.x} cy={l.y} r="7.4" fill="url(#lion-gold)" />
              ))}
            </g>
            <circle cx="60" cy="60" r="49" fill="url(#lion-gold)" />
            <circle cx="60" cy="60" r="49" fill="none" stroke="#4a2a08" strokeWidth="1" />
            <circle cx="60" cy="60" r="44" fill="#3b0a09" />
            <circle
              className="lion-altar__jade"
              cx="60"
              cy="60"
              r="41"
              fill="none"
              stroke="#2aa384"
              strokeWidth="3"
            />
            <circle
              cx="60"
              cy="60"
              r="41"
              fill="none"
              stroke="#0a3a30"
              strokeWidth="1"
              strokeDasharray="1.6 5"
            />
            <circle cx="60" cy="60" r="37" fill="url(#lion-lacquer)" />
            <circle cx="60" cy="60" r="37" fill="none" stroke="#f0cd78" strokeWidth="1.2" />
            <path
              d="M60 2c-5 2-9 6-9 10 3-1 6-1 9 1 3-2 6-2 9-1 0-4-4-8-9-10z"
              fill="url(#lion-gold)"
              stroke="#4a2a08"
              strokeWidth="0.8"
            />
            <circle cx="60" cy="9" r="2.4" fill="#d6261c" stroke="#fff0b0" strokeWidth="0.7" />
            <path
              d="M60 118c5-2 9-6 9-10-3 1-6 1-9-1-3 2-6 2-9 1 0 4 4 8 9 10z"
              fill="url(#lion-gold)"
              stroke="#4a2a08"
              strokeWidth="0.8"
            />
          </svg>
          <span className="lion-altar__face">
            {autoSpin && !busy ? (
              <Square size={20} fill="currentColor" aria-hidden="true" />
            ) : (
              <RotateCw size={24} strokeWidth={2.4} aria-hidden="true" />
            )}
            <b>{label}</b>
            {sub && <small>{sub}</small>}
          </span>
        </button>

        <div
          className="lion-altar__pillar lion-altar__tools"
          role="group"
          aria-label="Game options"
        >
          <button type="button" aria-label="Turbo Fast Mode" aria-pressed={turbo} onClick={onTurbo}>
            <Zap size={16} fill={turbo ? "currentColor" : "none"} aria-hidden="true" />
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
              <Square size={14} fill="currentColor" aria-hidden="true" />
            ) : (
              <Repeat2 size={17} aria-hidden="true" />
            )}
            <span>{canStop ? "Stop" : "Auto"}</span>
          </button>
          {onInfo && (
            <button type="button" aria-label="Paytable Info" onClick={onInfo}>
              <Info size={17} aria-hidden="true" />
              <span>Info</span>
            </button>
          )}
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
    </section>
  );
}
