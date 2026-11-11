import { Minus, Plus, Repeat2, RotateCw, Square, Volume2, VolumeX, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";

/** Fire Spike's locked-spin and immediate-auto behavior stays owned by FireSpikeSlot. */
export function FireControls({
  gameId,
  balance,
  win,
  bet,
  busy,
  turbo,
  autoSpin,
  muted,
  spinDisabled,
  onSpin,
  onDecreaseBet,
  onIncreaseBet,
  onTurbo,
  onAuto,
  onMute,
}: SlotControlDeckProps) {
  return (
    <section
      className="fire-console"
      data-slot-deck={gameId}
      aria-label="Game controls"
      data-busy={busy}
    >
      <div className="fire-console__status-row">
        <dl>
          <dt>Balance</dt>
          <dd title={formatMoney(balance)}>{formatMoney(balance)}</dd>
        </dl>
        <dl data-winning={win > 0}>
          <dt>Last win</dt>
          <dd title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</dd>
        </dl>
        <span className="fire-console__mode" role="status" aria-live="polite">
          {busy ? "Spinning" : autoSpin ? "Auto active" : "Ready"}
        </span>
      </div>
      <div className="fire-console__command">
        <div className="fire-console__settings">
          <div className="fire-console__bet" role="group" aria-label="Bet amount">
            <button type="button" aria-label="Decrease Bet" onClick={onDecreaseBet} disabled={busy}>
              <Minus size={18} aria-hidden="true" />
            </button>
            <div className="fire-console__stake">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
            <button type="button" aria-label="Increase Bet" onClick={onIncreaseBet} disabled={busy}>
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="fire-console__tools" role="group" aria-label="Game options">
            <button
              type="button"
              aria-label="Turbo Fast Mode"
              aria-pressed={turbo}
              onClick={onTurbo}
            >
              <Zap size={18} aria-hidden="true" />
              <span>Turbo</span>
            </button>
            <button
              type="button"
              aria-label={autoSpin ? "Stop Game" : "Auto Spin Settings"}
              aria-pressed={autoSpin}
              onClick={onAuto}
            >
              {autoSpin ? (
                <Square size={16} aria-hidden="true" />
              ) : (
                <Repeat2 size={18} aria-hidden="true" />
              )}
              <span>{autoSpin ? "Stop" : "Auto"}</span>
            </button>
            {onMute && (
              <button
                type="button"
                aria-label={muted ? "Unmute" : "Mute"}
                aria-pressed={muted}
                onClick={onMute}
              >
                {muted ? (
                  <VolumeX size={18} aria-hidden="true" />
                ) : (
                  <Volume2 size={18} aria-hidden="true" />
                )}
                <span>Sound</span>
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          className="fire-console__spin"
          aria-label={busy ? "Spinning" : autoSpin ? "Stop auto" : "Spin"}
          aria-busy={busy}
          disabled={spinDisabled}
          onClick={onSpin}
        >
          {autoSpin && !busy ? (
            <Square size={26} aria-hidden="true" />
          ) : (
            <RotateCw size={28} aria-hidden="true" />
          )}
          <span>{busy ? "Spinning" : autoSpin ? "Stop auto" : "Spin"}</span>
        </button>
      </div>
    </section>
  );
}
