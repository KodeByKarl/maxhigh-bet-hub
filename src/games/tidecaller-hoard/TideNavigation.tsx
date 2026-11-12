import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  Info,
  Minus,
  MoreHorizontal,
  Plus,
  Repeat2,
  RotateCw,
  Anchor,
  Square,
  Zap,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "@/components/maxhigh/SlotControlDeck";
import "./tide-navigation.css";

/** Tidecaller Hoard presentation only. The slot owns every action, amount and gameplay state. */
export function TideNavigation({
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
    ? `${progress}${freeSpinsPaused ? " · paused" : ""}`
    : autoSpin && autoRemaining !== undefined
      ? `${autoRemaining === "infinity" ? "∞" : autoRemaining} left`
      : null;
  return (
    <section
      className="tide-navigation"
      data-slot-deck={gameId}
      aria-label="Game controls"
      data-busy={busy}
    >
      <div className="tide-navigation__port">
        <dl>
          <dt>Balance</dt>
          <dd title={formatMoney(balance)}>{formatMoney(balance)}</dd>
        </dl>
        <button
          type="button"
          className="tide-navigation__tool"
          aria-label="Turbo"
          aria-pressed={turbo}
          title="Turbo"
          onClick={onTurbo}
        >
          <Zap size={17} aria-hidden="true" />
          <span>Turbo</span>
        </button>
      </div>
      <button
        type="button"
        className="tide-navigation__spin"
        aria-label={busy && supportsSkip ? "Skip spin animation" : label}
        aria-busy={busy}
        data-active={autoSpin || inFree}
        disabled={spinDisabled || (busy && !supportsSkip)}
        onClick={onSpin}
      >
        <svg className="tide-navigation__wheel" viewBox="0 0 112 112" aria-hidden="true">
          <defs>
            <linearGradient id="tide-brass" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#f0d19b" />
              <stop offset=".42" stopColor="#a98349" />
              <stop offset=".65" stopColor="#5e533b" />
              <stop offset="1" stopColor="#dcc18b" />
            </linearGradient>
          </defs>
          <g stroke="url(#tide-brass)" strokeWidth="5" strokeLinecap="round">
            <path d="M56 7v98M7 56h98M21 21l70 70M21 91l70-70" />
          </g>
          <g fill="url(#tide-brass)">
            <circle cx="56" cy="7" r="5" />
            <circle cx="56" cy="105" r="5" />
            <circle cx="7" cy="56" r="5" />
            <circle cx="105" cy="56" r="5" />
            <circle cx="21" cy="21" r="5" />
            <circle cx="91" cy="91" r="5" />
            <circle cx="21" cy="91" r="5" />
            <circle cx="91" cy="21" r="5" />
          </g>
          <circle cx="56" cy="56" r="43" fill="#0e2932" stroke="url(#tide-brass)" strokeWidth="7" />
          <circle cx="56" cy="56" r="35" fill="#112c37" stroke="#537f7a" strokeWidth="1" />
          <path d="m56 21 3 8h-6Z" fill="#9bd2c3" />
        </svg>
        <span className="tide-navigation__face">
          {canStop ? (
            <Square size={21} aria-hidden="true" />
          ) : (
            <RotateCw size={24} aria-hidden="true" />
          )}
          <strong>{label}</strong>
          {detail && <small>{detail}</small>}
        </span>
      </button>
      <div className="tide-navigation__starboard">
        <dl data-winning={win > 0}>
          <dt>{busy ? "Round win" : "Last win"}</dt>
          <dd title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</dd>
        </dl>
        <div className="tide-navigation__utilities">
          <button
            type="button"
            className="tide-navigation__tool"
            aria-label={canStop ? "Stop Game" : "Auto Spin Settings"}
            title={canStop ? "Stop Game" : "Auto Spin Settings"}
            aria-pressed={autoSpin}
            onClick={onAuto}
          >
            {canStop ? (
              <Square size={15} aria-hidden="true" />
            ) : (
              <Repeat2 size={17} aria-hidden="true" />
            )}
            <span>{canStop ? "Stop" : "Auto"}</span>
          </button>
          {onInfo && (
            <button
              type="button"
              className="tide-navigation__tool"
              aria-label="Paytable Info"
              title="Paytable Info"
              onClick={onInfo}
            >
              <Info size={17} aria-hidden="true" />
              <span>Info</span>
            </button>
          )}
        </div>
      </div>
      <div className="tide-navigation__course">
        <div className="tide-navigation__bet" aria-label="Bet controls">
          <button type="button" aria-label="Decrease Bet" onClick={onDecreaseBet} disabled={busy}>
            <Minus size={18} aria-hidden="true" />
          </button>
          {onSelectBet ? (
            <button
              className="tide-navigation__stake"
              type="button"
              aria-label="Select Bet Amount"
              onClick={onSelectBet}
              disabled={busy}
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="tide-navigation__stake">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Increase Bet" onClick={onIncreaseBet} disabled={busy}>
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        {buyFeature ? (
          <button
            type="button"
            className="tide-navigation__bonus"
            onClick={buyFeature.onClick}
            disabled={buyFeature.disabled}
          >
            <Anchor size={17} aria-hidden="true" />
            <span>
              Buy Bonus<strong>{formatMoney(buyFeature.price)}</strong>
            </span>
          </button>
        ) : (
          <span className="tide-navigation__round">
            {inFree ? "Free spins " + progress : "Ready"}
          </span>
        )}
      </div>
      <span className="tide-navigation__announcement" role="status" aria-live="polite">
        {busy
          ? "Spin in progress"
          : inFree
            ? "Free spins " + detail
            : autoSpin
              ? "Auto spin active " + (detail ?? "")
              : win > 0
                ? "Win credited"
                : "Ready to spin"}
      </span>
    </section>
  );
}
