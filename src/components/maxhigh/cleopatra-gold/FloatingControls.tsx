import * as Menu from "@radix-ui/react-dropdown-menu";
import { Info, Minus, Plus, Repeat2, RotateCw, Settings2, Square, Sun, Zap } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./floating-controls.css";

/** Cleopatra-only presentation; all game actions remain owned by the slot. */
export function FloatingControls({
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
  const canStop = autoSpin || busy || (inFree && !freeSpinsPaused);
  const label = busy ? "Skip" : autoSpin ? "Stop auto" : inFree ? "Free spin" : "Spin";
  const progress = freeSpinsProgress
    ? `${freeSpinsProgress.current}/${freeSpinsProgress.total}`
    : `${freeSpins} left`;
  const detail = inFree
    ? progress
    : autoSpin
      ? `${autoRemaining === "infinity" ? "∞" : (autoRemaining ?? 0)} left`
      : null;

  return (
    <section className="cleo-controls" aria-label="Game controls" data-slot-deck="cleopatra-gold">
      <div className="cleo-controls__meters">
        <div>
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <div>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
      </div>
      <div className="cleo-controls__main">
        <div className="cleo-controls__bet" role="group" aria-label="Bet amount">
          <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
            <Minus size={17} />
          </button>
          <button
            type="button"
            className="cleo-controls__amount"
            aria-label="Select Bet Amount"
            disabled={busy}
            onClick={onSelectBet}
          >
            <span>Bet</span>
            <strong>{formatMoney(bet)}</strong>
          </button>
          <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
            <Plus size={17} />
          </button>
        </div>
        <button
          type="button"
          className="cleo-controls__spin"
          disabled={spinDisabled}
          onClick={onSpin}
          aria-label={busy ? "Skip spin animation" : label}
        >
          {busy ? (
            <RotateCw size={23} />
          ) : autoSpin ? (
            <Square size={21} fill="currentColor" />
          ) : (
            <Sun size={24} aria-hidden />
          )}
          <span>
            {label}
            {detail && <small>{detail}</small>}
          </span>
        </button>
      </div>
      <div className="cleo-controls__secondary">
        {buyFeature ? (
          <button
            type="button"
            className="cleo-controls__bonus"
            disabled={buyFeature.disabled}
            onClick={buyFeature.onClick}
          >
            <Sun size={16} aria-hidden />
            <span>Buy bonus</span>
            <strong>{formatMoney(buyFeature.price)}</strong>
          </button>
        ) : (
          <span className="cleo-controls__free">
            {inFree
              ? `Free spins · ${progress}${freeSpinsPaused ? " · paused" : ""}`
              : "Ready to play"}
          </span>
        )}
        <Menu.Root>
          <Menu.Trigger asChild>
            <button
              type="button"
              className="cleo-controls__settings"
              aria-label={`Game settings${turbo ? ", Turbo on" : ""}${autoSpin ? ", Auto Spin active" : ""}`}
              data-active={turbo || autoSpin}
            >
              <Settings2 size={20} />
              {(turbo || autoSpin) && <i aria-hidden />}
            </button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              className="cleo-settings"
              side="top"
              align="end"
              sideOffset={8}
              collisionPadding={12}
              aria-label="Game settings"
            >
              <Menu.CheckboxItem
                className="cleo-settings__item"
                checked={turbo}
                onCheckedChange={onTurbo}
              >
                <Zap size={17} aria-hidden />
                <span>Turbo</span>
                <span className="cleo-settings__state">{turbo ? "On" : "Off"}</span>
              </Menu.CheckboxItem>
              <Menu.Item className="cleo-settings__item" onSelect={onAuto}>
                {canStop ? <Square size={16} aria-hidden /> : <Repeat2 size={17} aria-hidden />}
                <span>{canStop ? "Stop game" : "Auto Spin"}</span>
                {autoSpin && <span className="cleo-settings__state">Active</span>}
              </Menu.Item>
              {onInfo && (
                <Menu.Item className="cleo-settings__item" onSelect={onInfo}>
                  <Info size={17} aria-hidden />
                  <span>Info / Paytable</span>
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {busy
          ? "Spin in progress"
          : inFree
            ? `Free spins ${progress}${freeSpinsPaused ? ", paused" : ""}`
            : autoSpin
              ? "Auto spin active"
              : win > 0
                ? "Win credited"
                : "Choose your bet, then spin"}
      </span>
    </section>
  );
}
