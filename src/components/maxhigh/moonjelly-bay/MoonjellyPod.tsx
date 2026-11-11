import { useEffect, useRef, useState } from "react";
import {
  Gem,
  Info,
  Minus,
  Plus,
  Repeat2,
  Settings2,
  Square,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./moonjelly-pod.css";

/**
 * Moonjelly Bay's bioluminescent control pod: a slim status capsule on top, a compact bet gauge on the left,
 * a floating jellyfish-bell Spin in the middle, and Buy Bonus plus a single utility orb (Turbo / Auto / Info / Sound) on the right.
 * Same props and handlers as SlotControlDeck; presentation only.
 */
export function MoonjellyPod({
  bet,
  win,
  balance,
  busy,
  turbo,
  autoSpin,
  inFree = false,
  freeSpins = 0,
  freeSpinsProgress = null,
  freeSpinsPaused = false,
  autoRemaining,
  spinDisabled = false,
  onSpin,
  onDecreaseBet,
  onIncreaseBet,
  onSelectBet,
  onInfo,
  onTurbo,
  onAuto,
  muted,
  onMute,
  supportsSkip = true,
  buyFeature,
}: SlotControlDeckProps) {
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

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
  const fs = freeSpinsProgress ? `${freeSpinsProgress.current}/${freeSpinsProgress.total}` : null;
  const detail = inFree
    ? (fs ?? `${freeSpins} left`)
    : autoSpin && autoRemaining !== undefined
      ? `${autoRemaining === "infinity" ? "∞" : autoRemaining} left`
      : null;
  const state = spinDisabled ? "disabled" : busy ? "spinning" : autoSpin ? "auto" : "ready";

  return (
    <section className="mj-pod" data-mj-pod data-busy={busy} aria-label="Game controls">
      <div className="mj-status" aria-label="Balance and win">
        <div>
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <i aria-hidden="true" className="mj-status__pearl" />
        <div data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
      </div>

      <div className="mj-row">
        <div className="mj-bet" role="group" aria-label="Bet amount">
          {onSelectBet ? (
            <button
              type="button"
              className="mj-bet__value"
              disabled={busy}
              onClick={onSelectBet}
              aria-label="Select Bet Amount"
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="mj-bet__value">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <div className="mj-bet__steps">
            <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
              <Minus size={17} />
            </button>
            <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
              <Plus size={17} />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="mj-bell"
          onClick={onSpin}
          disabled={spinDisabled}
          data-state={state}
          aria-label={label === "Skip" ? "Skip spin animation" : label === "Spin" ? "Spin" : label}
        >
          <span className="mj-bell__tentacles" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="mj-bell__dome">
            <span className="mj-bell__sheen" aria-hidden="true" />
            <span className="mj-bell__label">{label}</span>
            {detail && <small>{detail}</small>}
          </span>
        </button>

        <div className="mj-side">
          {buyFeature ? (
            <button
              type="button"
              className="mj-buy"
              disabled={buyFeature.disabled}
              onClick={buyFeature.onClick}
            >
              <Gem size={14} aria-hidden="true" />
              <span>Buy bonus</span>
              <strong>{formatMoney(buyFeature.price)}</strong>
            </button>
          ) : (
            <div className="mj-buy mj-buy--static" data-fs-counter={fs ?? undefined}>
              <Gem size={14} aria-hidden="true" />
              <span>{inFree ? "Free spins" : "Ready"}</span>
              {inFree && <strong>{fs ?? freeSpins}</strong>}
            </div>
          )}
          <div className="mj-util" ref={wrap}>
            <button
              type="button"
              className="mj-util__orb"
              aria-label="More controls"
              aria-expanded={menu}
              aria-haspopup="true"
              data-on={turbo || autoSpin}
              onClick={() => setMenu((v) => !v)}
            >
              {menu ? <X size={18} /> : <Settings2 size={18} />}
            </button>
            {menu && (
              <div className="mj-util__menu" role="group" aria-label="More controls">
                <button
                  type="button"
                  aria-label="Turbo Fast Mode"
                  aria-pressed={turbo}
                  onClick={onTurbo}
                >
                  <Zap size={16} fill={turbo ? "currentColor" : "none"} />
                  Turbo
                </button>
                <button
                  type="button"
                  aria-label={canStop ? "Stop Game" : "Auto Spin Settings"}
                  aria-pressed={autoSpin}
                  onClick={() => {
                    setMenu(false);
                    onAuto();
                  }}
                >
                  {canStop ? <Square size={15} fill="currentColor" /> : <Repeat2 size={16} />}
                  {canStop ? "Stop" : "Auto"}
                </button>
                {onInfo && (
                  <button
                    type="button"
                    aria-label="Paytable Info"
                    onClick={() => {
                      setMenu(false);
                      onInfo();
                    }}
                  >
                    <Info size={16} />
                    Info
                  </button>
                )}
                {onMute && (
                  <button
                    type="button"
                    aria-label={muted ? "Unmute" : "Mute"}
                    aria-pressed={muted}
                    onClick={onMute}
                  >
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    {muted ? "Unmute" : "Sound"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
