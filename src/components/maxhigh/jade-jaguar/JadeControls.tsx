import { useEffect, useRef, useState } from "react";
import { Gem, Info, Menu, Minus, Plus, Repeat2, RotateCw, Square, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";

/**
 * Emerald Temple Command Deck — presentation only.
 * Every price, flag and callback is owned by JadeJaguarSlot; this component only arranges them:
 *   status rail (Balance · Last win · Buy Bonus)
 *   altar row   (Bet tablet · octagonal jade Spin · utility menu)
 */
export function JadeControls({
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
  const [menuOpen, setMenuOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!toolsRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
  const detail = inFree
    ? `Free spins ${progress}${freeSpinsPaused ? " · paused" : ""}`
    : autoSpin && autoCount !== undefined
      ? `Auto spin · ${autoCount} left`
      : busy
        ? "Spin in progress"
        : win > 0
          ? "Win credited"
          : "Set your bet, then spin";
  const modes = [turbo ? "Turbo" : null, autoSpin ? "Auto" : null].filter(Boolean).join(" · ");

  return (
    <section
      className="jade-deck"
      data-slot-deck={gameId}
      data-busy={busy}
      aria-label="Game controls"
    >
      <span className="jade-deck__stone" aria-hidden="true" />

      <div className="jade-rail">
        <dl className="jade-rail__stats">
          <div className="jade-rail__cell">
            <dt>Balance</dt>
            <dd title={formatMoney(balance)}>{formatMoney(balance)}</dd>
          </div>
          <div className="jade-rail__cell" data-winning={win > 0}>
            <dt>{busy ? "Round win" : "Last win"}</dt>
            <dd title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</dd>
          </div>
        </dl>
        {buyFeature && (
          <button
            className="jade-buy"
            type="button"
            disabled={buyFeature.disabled}
            onClick={buyFeature.onClick}
            aria-label={`Buy Bonus ${formatMoney(buyFeature.price)}`}
          >
            <Gem size={16} aria-hidden="true" />
            <span>
              Buy Bonus
              <strong>{formatMoney(buyFeature.price)}</strong>
            </span>
          </button>
        )}
      </div>

      <div className="jade-altar">
        <div className="jade-bet" role="group" aria-label="Bet amount">
          {onSelectBet ? (
            <button
              className="jade-bet__value"
              type="button"
              aria-label="Select Bet Amount"
              disabled={busy}
              onClick={onSelectBet}
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="jade-bet__value">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button
            className="jade-bet__step"
            type="button"
            aria-label="Decrease Bet"
            disabled={busy}
            onClick={onDecreaseBet}
          >
            <Minus size={18} aria-hidden="true" />
          </button>
          <button
            className="jade-bet__step"
            type="button"
            aria-label="Increase Bet"
            disabled={busy}
            onClick={onIncreaseBet}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>

        <button
          className="jade-spin"
          type="button"
          onClick={onSpin}
          disabled={spinDisabled}
          aria-label={ariaLabel}
          aria-busy={busy}
          data-active={busy || autoSpin}
        >
          <span className="jade-spin__stone" aria-hidden="true" />
          <span className="jade-spin__bezel" aria-hidden="true" />
          <span className="jade-spin__face">
            {autoSpin && !busy ? (
              <Square size={24} aria-hidden="true" />
            ) : (
              <RotateCw size={28} aria-hidden="true" />
            )}
            <span>{label}</span>
          </span>
        </button>

        <div className="jade-tools" ref={toolsRef}>
          <button
            className="jade-tools__trigger"
            type="button"
            aria-label="Game options"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            data-on={turbo || autoSpin}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu size={18} aria-hidden="true" />
            <span>Options</span>
          </button>
          <p className="jade-tools__modes" aria-live="polite">
            {modes || "Standard"}
          </p>
          {menuOpen && (
            <div className="jade-menu" role="group" aria-label="Game options">
              <button
                type="button"
                aria-label="Turbo Fast Mode"
                aria-pressed={turbo}
                onClick={() => {
                  onTurbo();
                  setMenuOpen(false);
                }}
              >
                <Zap size={17} aria-hidden="true" />
                <span>Turbo</span>
                <em>{turbo ? "On" : "Off"}</em>
              </button>
              <button
                type="button"
                aria-label={canStop ? "Stop Game" : "Auto Spin Settings"}
                aria-pressed={autoSpin}
                onClick={() => {
                  onAuto();
                  setMenuOpen(false);
                }}
              >
                {canStop ? (
                  <Square size={16} aria-hidden="true" />
                ) : (
                  <Repeat2 size={18} aria-hidden="true" />
                )}
                <span>{canStop ? "Stop" : "Auto spin"}</span>
              </button>
              {onInfo && (
                <button
                  type="button"
                  aria-label="Paytable Info"
                  onClick={() => {
                    onInfo();
                    setMenuOpen(false);
                  }}
                >
                  <Info size={18} aria-hidden="true" />
                  <span>Paytable</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="jade-deck__status" role="status" aria-live="polite">
        {detail}
      </p>
    </section>
  );
}
