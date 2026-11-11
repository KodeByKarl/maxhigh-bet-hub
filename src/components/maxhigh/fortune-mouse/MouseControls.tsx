import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  Coins,
  Info,
  Minus,
  MoreHorizontal,
  Plus,
  Repeat2,
  RotateCw,
  Square,
  Zap,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./mouse-controls.css";

/** Fortune Mouse controls only. The slot owns every action, amount and gameplay state. */
export function MouseControls({
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
      className="mouse-deck"
      data-slot-deck={gameId}
      aria-label="Game controls"
      data-busy={busy}
    >
      <div className="mouse-deck__status">
        <dl>
          <dt>Balance</dt>
          <dd title={formatMoney(balance)}>{formatMoney(balance)}</dd>
        </dl>
        <dl className="mouse-deck__win" data-winning={win > 0}>
          <dt>{busy ? "Round win" : "Last win"}</dt>
          <dd title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</dd>
        </dl>
        {buyFeature ? (
          <button
            type="button"
            className="mouse-deck__bonus"
            onClick={buyFeature.onClick}
            disabled={buyFeature.disabled}
          >
            <Coins size={17} aria-hidden="true" />
            <span>
              Buy Bonus<strong>{formatMoney(buyFeature.price)}</strong>
            </span>
          </button>
        ) : (
          <span className="mouse-deck__round">{inFree ? `Free spins ${progress}` : "Ready"}</span>
        )}
      </div>
      <div className="mouse-deck__main">
        <div className="mouse-deck__bet" role="group" aria-label="Bet amount">
          <button type="button" aria-label="Decrease Bet" onClick={onDecreaseBet} disabled={busy}>
            <Minus size={18} aria-hidden="true" />
          </button>
          {onSelectBet ? (
            <button
              type="button"
              className="mouse-deck__stake"
              aria-label="Select Bet Amount"
              onClick={onSelectBet}
              disabled={busy}
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="mouse-deck__stake">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Increase Bet" onClick={onIncreaseBet} disabled={busy}>
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="mouse-deck__spin"
          aria-label={label === "Skip" ? "Skip spin animation" : label}
          aria-busy={busy}
          disabled={spinDisabled}
          onClick={onSpin}
          data-active={busy || autoSpin}
        >
          {autoSpin && !busy ? (
            <Square size={22} aria-hidden="true" />
          ) : (
            <RotateCw size={25} aria-hidden="true" />
          )}
          <span>{label}</span>
          {detail && <small>{detail}</small>}
        </button>
        <Menu.Root>
          <Menu.Trigger asChild>
            <button
              type="button"
              className="mouse-deck__more"
              aria-label="More game settings"
              data-active={turbo || autoSpin}
            >
              <MoreHorizontal size={22} aria-hidden="true" />
              <span>More</span>
            </button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              className="mouse-options"
              data-mouse-options
              side="top"
              align="end"
              sideOffset={10}
              collisionPadding={10}
              aria-label="Fortune Mouse settings"
            >
              <Menu.CheckboxItem
                className="mouse-options__item"
                checked={turbo}
                onCheckedChange={() => onTurbo()}
                onSelect={(event) => event.preventDefault()}
              >
                <Zap size={18} aria-hidden="true" />
                <span>Turbo</span>
                <span className="mouse-options__state">{turbo ? "On" : "Off"}</span>
              </Menu.CheckboxItem>
              <Menu.Item className="mouse-options__item" onSelect={onAuto}>
                <span aria-hidden="true">
                  {canStop ? <Square size={16} /> : <Repeat2 size={18} />}
                </span>
                <span>{canStop ? "Stop Game" : "Auto Spin Settings"}</span>
              </Menu.Item>
              {onInfo && (
                <Menu.Item className="mouse-options__item" onSelect={onInfo}>
                  <Info size={18} aria-hidden="true" />
                  <span>Paytable Info</span>
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <span className="mouse-deck__announcement" role="status" aria-live="polite">
        {busy
          ? "Spin in progress"
          : inFree
            ? `Free spins ${detail}`
            : autoSpin
              ? `Auto spin active ${detail ?? ""}`
              : win > 0
                ? "Win credited"
                : "Ready to spin"}
      </span>
    </section>
  );
}
