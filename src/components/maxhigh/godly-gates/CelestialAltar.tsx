import { useEffect, useRef, useState } from "react";
import { Info, Minus, MoreHorizontal, Plus, Repeat2, Square, X, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./celestial-altar.css";

/** Eight-pointed celestial star used as the Spin glyph. */
function GateStar({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      className="gg-core__star"
      data-spin={spinning}
    >
      <path
        d="M12 1.5l2.2 7.1 7.1-2.2-4.6 5.6 4.6 5.6-7.1-2.2L12 22.5l-2.2-7.1-7.1 2.2 4.6-5.6-4.6-5.6 7.1 2.2z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Godly Gates "Celestial Command Altar": a dark-glass status strip over a stepped altar. The octagonal Spin Core sits centrally,
 * flanked by a Bet wing (left) and a Feature wing (right: Buy Bonus + options menu for Turbo / Auto / Info).
 * Same props and handlers as SlotControlDeck; presentation only.
 */
export function CelestialAltar({
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

  return (
    <section className="gg-altar" data-gg-altar data-busy={busy} aria-label="Game controls">
      <div className="gg-status" aria-label="Balance and win">
        <div>
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <div data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
      </div>

      <div className="gg-row">
        <div className="gg-wing gg-wing--bet" role="group" aria-label="Bet amount">
          {onSelectBet ? (
            <button
              type="button"
              className="gg-bet"
              disabled={busy}
              onClick={onSelectBet}
              aria-label="Select Bet Amount"
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="gg-bet">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <div className="gg-step">
            <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
              <Minus size={18} />
            </button>
            <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
              <Plus size={18} />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="gg-core"
          onClick={onSpin}
          disabled={spinDisabled}
          data-active={busy || autoSpin}
          aria-label={label === "Skip" ? "Skip spin animation" : label}
        >
          <span className="gg-core__ring" aria-hidden="true" />
          <span className="gg-core__face">
            <GateStar spinning={busy || autoSpin} />
            <span className="gg-core__label">{label}</span>
            {detail && <small>{detail}</small>}
          </span>
        </button>

        <div className="gg-wing gg-wing--feature">
          {buyFeature ? (
            <button
              type="button"
              className="gg-buy"
              disabled={buyFeature.disabled}
              onClick={buyFeature.onClick}
            >
              <span>Buy bonus</span>
              <strong>{formatMoney(buyFeature.price)}</strong>
            </button>
          ) : (
            <div className="gg-buy gg-buy--static" data-fs-counter={fs ?? undefined}>
              <span>{inFree ? "Free spins" : "Ready"}</span>
              {inFree && <strong>{fs ?? freeSpins}</strong>}
            </div>
          )}
          <div className="gg-opts" ref={wrap}>
            <button
              type="button"
              className="gg-opts__toggle"
              aria-label="More controls"
              aria-expanded={menu}
              aria-haspopup="true"
              data-on={turbo || autoSpin}
              onClick={() => setMenu((v) => !v)}
            >
              {menu ? <X size={18} /> : <MoreHorizontal size={18} />}
              <span>Options</span>
            </button>
            {menu && (
              <div className="gg-opts__menu" role="group" aria-label="More controls">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
