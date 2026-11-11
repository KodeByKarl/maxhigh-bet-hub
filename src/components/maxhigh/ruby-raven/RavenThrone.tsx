import { useEffect, useRef, useState } from "react";
import { Gem, Info, MoreHorizontal, Repeat2, Square, X, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./raven-throne.css";

/** One feather-edged wing, drawn for the left side; mirrored for the right. */
const WING =
  "M97 62 C78 40 48 26 6 30 L18 40 L5 47 L24 52 L13 63 L35 66 L27 78 L50 79 L46 92 L70 87 L84 78 Z";
const FEATHERS = "M90 60 C70 46 44 38 18 41 M86 68 C64 58 40 54 20 58 M82 76 C62 70 44 70 30 72";

function RavenSeal() {
  return (
    <svg className="rr-seal" viewBox="0 0 200 124" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rr-wing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3d47" />
          <stop offset="0.35" stopColor="#14151b" />
          <stop offset="1" stopColor="#050507" />
        </linearGradient>
        <linearGradient id="rr-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e4e7ee" />
          <stop offset="0.5" stopColor="#8b909c" />
          <stop offset="1" stopColor="#3b3e47" />
        </linearGradient>
        <radialGradient id="rr-bed" cx="0.5" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#3b0a15" />
          <stop offset="1" stopColor="#0a0306" />
        </radialGradient>
        <linearGradient id="rr-f1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7b8e" />
          <stop offset="1" stopColor="#d4153a" />
        </linearGradient>
        <linearGradient id="rr-f2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e11d48" />
          <stop offset="1" stopColor="#7a0d26" />
        </linearGradient>
        <linearGradient id="rr-f3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b3122f" />
          <stop offset="1" stopColor="#4a0716" />
        </linearGradient>
      </defs>
      {[false, true].map((mirror) => (
        <g key={String(mirror)} transform={mirror ? "translate(200 0) scale(-1 1)" : undefined}>
          <path
            d={WING}
            fill="url(#rr-wing)"
            stroke="url(#rr-silver)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d={FEATHERS}
            fill="none"
            stroke="#c9ced8"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* sculpted housing */}
      <circle cx="100" cy="64" r="38" fill="url(#rr-silver)" />
      <circle cx="100" cy="64" r="35" fill="#07070a" />
      <circle cx="100" cy="64" r="32" fill="url(#rr-bed)" stroke="#c9ced8" strokeOpacity="0.4" />
      {/* ruby crystal: faceted octagon */}
      <g className="rr-gem">
        <polygon points="100,38 118,46 126,64 118,82 100,90 82,82 74,64 82,46" fill="url(#rr-f3)" />
        <polygon points="100,38 118,46 100,64" fill="url(#rr-f1)" />
        <polygon points="118,46 126,64 100,64" fill="url(#rr-f2)" />
        <polygon points="82,46 100,38 100,64" fill="url(#rr-f2)" />
        <polygon points="74,64 82,46 100,64" fill="url(#rr-f1)" opacity="0.8" />
        <polygon points="100,64 118,82 100,90" fill="#6d0b22" />
        <polygon points="100,64 100,90 82,82" fill="#8f1230" />
        <polygon
          points="100,38 118,46 126,64 118,82 100,90 82,82 74,64 82,46"
          fill="none"
          stroke="#ffd1d9"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
        <polygon points="92,46 104,42 98,54" fill="#fff" opacity="0.28" />
      </g>
    </svg>
  );
}

/**
 * Ruby Raven's Raven's Ruby Throne control deck. The Spin seal (raven wings around a ruby) sits in the centre with the Treasury (Balance /
 * Last Win) on its wings; a lower rail holds Buy Bonus, the Bet selector and a utility menu. Same props and handlers as SlotControlDeck:
 * presentation only.
 */
export function RavenThrone({
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
  const state = spinDisabled ? "disabled" : busy ? "spinning" : autoSpin ? "auto" : "ready";

  return (
    <section className="rr-deck" data-rr-deck data-busy={busy} aria-label="Game controls">
      <div className="rr-top">
        <div className="rr-plate rr-plate--l" aria-label="Balance">
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>

        <button
          type="button"
          className="rr-spin"
          data-state={state}
          onClick={onSpin}
          disabled={spinDisabled}
          aria-label={label === "Skip" ? "Skip spin animation" : label}
        >
          <RavenSeal />
          <span className="rr-spin__label">
            <b>{label}</b>
            {detail && <small>{detail}</small>}
          </span>
        </button>

        <div className="rr-plate rr-plate--r" data-winning={win > 0} aria-label="Last win">
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
      </div>

      <div className="rr-rail">
        {buyFeature ? (
          <button
            type="button"
            className="rr-buy"
            disabled={buyFeature.disabled}
            onClick={buyFeature.onClick}
          >
            <Gem size={14} aria-hidden="true" />
            <span>
              <small>Buy Bonus</small>
              <strong>{formatMoney(buyFeature.price)}</strong>
            </span>
          </button>
        ) : (
          <div className="rr-buy rr-buy--static" data-fs-counter={fs ?? undefined}>
            <Gem size={14} aria-hidden="true" />
            <span>
              <small>{inFree ? "Free spins" : "Ready"}</small>
              {inFree && <strong>{fs ?? freeSpins}</strong>}
            </span>
          </div>
        )}

        <div className="rr-bet" role="group" aria-label="Bet amount">
          <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
            <i aria-hidden="true">−</i>
          </button>
          {onSelectBet ? (
            <button
              type="button"
              className="rr-bet__value"
              disabled={busy}
              onClick={onSelectBet}
              aria-label="Select Bet Amount"
            >
              <small>Bet</small>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="rr-bet__value">
              <small>Bet</small>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
            <i aria-hidden="true">+</i>
          </button>
        </div>

        <div className="rr-util" ref={wrap}>
          <button
            type="button"
            className="rr-util__toggle"
            aria-label="More controls"
            aria-expanded={menu}
            aria-haspopup="true"
            data-on={turbo || autoSpin}
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <X size={18} /> : <MoreHorizontal size={18} />}
          </button>
          {menu && (
            <div className="rr-util__menu" role="group" aria-label="More controls">
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
    </section>
  );
}
