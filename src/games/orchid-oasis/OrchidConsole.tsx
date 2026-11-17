import { realmsAssetBase } from "@/components/maxhigh/realms/theme";
import { Droplets, Flower, Info, Minus, Plus, Repeat2, Square, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "@/components/maxhigh/SlotControlDeck";

/** Orchid Oasis presentation only. Realms owns the state, wager guards and every callback. */
export function OrchidConsole(p: SlotControlDeckProps) {
  const canStop =
    p.autoSpin || (p.supportsSkip !== false && (p.busy || (p.inFree && !p.freeSpinsPaused)));
  const spinLabel = p.busy
    ? p.supportsSkip === false
      ? "Spinning"
      : "Skip"
    : p.autoSpin
      ? "Stop auto"
      : p.inFree
        ? "Free spin"
        : "Spin";
  const state = p.busy ? "busy" : p.autoSpin ? "auto" : p.inFree ? "free" : "idle";
  const progress = p.freeSpinsProgress
    ? `${p.freeSpinsProgress.current}/${p.freeSpinsProgress.total}`
    : `${p.freeSpins ?? 0} left`;

  return (
    <section
      className="oc-console"
      data-slot-deck={p.gameId}
      data-busy={p.busy}
      aria-label="Game controls"
    >
      <div className="oc-ledger">
        <div className="oc-meter" data-meter="balance">
          <span>Balance</span>
          <strong title={formatMoney(p.balance)}>{formatMoney(p.balance)}</strong>
        </div>
        <div className="oc-meter" data-meter="win" data-winning={p.win > 0}>
          <span>{p.busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(p.win)}>{formatMoney(p.win)}</strong>
        </div>
      </div>

      <div className="oc-bet">
        <button
          type="button"
          className="oc-step"
          aria-label="Decrease Bet"
          disabled={p.busy}
          onClick={p.onDecreaseBet}
        >
          <Minus size={20} />
        </button>
        <button
          type="button"
          className="oc-bet__value"
          aria-label="Select Bet Amount"
          disabled={p.busy || !p.onSelectBet}
          onClick={p.onSelectBet}
        >
          <span>Bet</span>
          <strong title={formatMoney(p.bet)}>{formatMoney(p.bet)}</strong>
        </button>
        <button
          type="button"
          className="oc-step"
          aria-label="Increase Bet"
          disabled={p.busy}
          onClick={p.onIncreaseBet}
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="oc-side oc-side--l">
        <button
          type="button"
          className="oc-chip oc-turbo"
          aria-label="Turbo Fast Mode"
          aria-pressed={p.turbo}
          data-turbo={p.turbo ? "on" : "off"}
          onClick={p.onTurbo}
        >
          <Zap size={17} />
          <span>Turbo</span>
          <em>{p.turbo ? "On" : "Off"}</em>
        </button>
        <button
          type="button"
          className="oc-chip oc-auto"
          aria-label={canStop ? "Stop Game" : "Auto Spin Settings"}
          aria-pressed={p.autoSpin}
          onClick={p.onAuto}
        >
          {canStop ? <Square size={15} fill="currentColor" /> : <Repeat2 size={18} />}
          <span>{canStop ? "Stop" : "Auto"}</span>
        </button>
      </div>

      <div className="oc-spin-mount">
        <button
          type="button"
          className="oc-spin"
          aria-label={spinLabel === "Skip" ? "Skip spin animation" : spinLabel}
          disabled={p.spinDisabled}
          onClick={p.onSpin}
          data-state={state}
        >
          <img
            className="oc-spin__art"
            src={`${realmsAssetBase(p.gameId)}/p1.webp?v=1`}
            alt=""
            aria-hidden="true"
          />
          {p.autoSpin && !p.busy ? (
            <Square size={26} fill="currentColor" />
          ) : (
            <Flower size={36} strokeWidth={1.6} />
          )}
          <span>{spinLabel}</span>
        </button>
      </div>

      <div className="oc-side oc-side--r">
        <button
          type="button"
          className="oc-chip oc-bonus"
          aria-label="Buy Bonus"
          disabled={!p.buyFeature || p.buyFeature.disabled}
          onClick={p.buyFeature?.onClick}
        >
          <Droplets size={17} />
          <span>{p.inFree ? "Free" : "Bonus"}</span>
          <em>{p.inFree ? progress : p.buyFeature ? formatMoney(p.buyFeature.price) : "—"}</em>
        </button>
        <button
          type="button"
          className="oc-chip oc-info"
          aria-label="Paytable Info"
          onClick={p.onInfo}
        >
          <Info size={18} />
          <span>Info</span>
        </button>
      </div>
    </section>
  );
}
