import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  Info,
  Minus,
  MoreHorizontal,
  Plus,
  Repeat2,
  RotateCw,
  Gem,
  Square,
  Zap,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./temple-ui.css";

/** Temple Rush presentation only. The slot owns every action, amount and gameplay state. */
export function TempleMechanism({
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
      className="temple-mechanism"
      data-slot-deck={gameId}
      aria-label="Game controls"
      data-busy={busy}
    >
      <div className="temple-mechanism__treasury">
        <dl>
          <dt>Balance</dt>
          <dd title={formatMoney(balance)}>{formatMoney(balance)}</dd>
        </dl>
        <dl data-winning={win > 0}>
          <dt>{busy ? "Round win" : "Last win"}</dt>
          <dd title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</dd>
        </dl>
      </div>
      <button
        type="button"
        className="temple-mechanism__spin"
        aria-label={busy && supportsSkip ? "Skip spin animation" : label}
        aria-busy={busy}
        data-active={autoSpin || inFree}
        disabled={spinDisabled || (busy && !supportsSkip)}
        onClick={onSpin}
      >
        <svg
          className="temple-mechanism__carving"
          viewBox="0 0 112 104"
          fill="none"
          aria-hidden="true"
        >
          <path d="M24 19h18v7H30v13h-7V19Zm46 0h18v20h-7V26H70v-7ZM23 66h7v13h12v7H24V66Zm58 0h7v20H70v-7h11V66Z" />
          <path className="temple-mechanism__gem" d="m56 9 7 7-7 7-7-7Z" />
        </svg>
        <span className="temple-mechanism__face">
          {canStop ? (
            <Square size={23} aria-hidden="true" />
          ) : (
            <RotateCw size={26} aria-hidden="true" />
          )}
          <strong>{label}</strong>
          {detail && <small>{detail}</small>}
        </span>
      </button>
      <div className="temple-mechanism__feature">
        {buyFeature ? (
          <button
            type="button"
            className="temple-mechanism__bonus"
            onClick={buyFeature.onClick}
            disabled={buyFeature.disabled}
          >
            <Gem size={22} aria-hidden="true" />
            <span>Buy Bonus</span>
            <strong>{formatMoney(buyFeature.price)}</strong>
          </button>
        ) : (
          <span className="temple-mechanism__round">
            {inFree ? "Free spins " + progress : "Ready"}
          </span>
        )}
      </div>
      <div className="temple-mechanism__rail">
        <div className="temple-mechanism__bet" aria-label="Bet controls">
          <button type="button" aria-label="Decrease Bet" onClick={onDecreaseBet} disabled={busy}>
            <Minus size={18} aria-hidden="true" />
          </button>
          {onSelectBet ? (
            <button
              className="temple-mechanism__stake"
              type="button"
              aria-label="Select Bet Amount"
              onClick={onSelectBet}
              disabled={busy}
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="temple-mechanism__stake">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Increase Bet" onClick={onIncreaseBet} disabled={busy}>
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        <Menu.Root>
          <Menu.Trigger asChild>
            <button
              type="button"
              className="temple-mechanism__more"
              aria-label="More game settings"
              data-active={turbo || autoSpin}
            >
              <MoreHorizontal size={22} aria-hidden="true" />
              <span>More</span>
            </button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              className="temple-options"
              data-temple-options
              side="top"
              align="end"
              sideOffset={10}
              collisionPadding={10}
              aria-label="Temple Rush settings"
            >
              <Menu.CheckboxItem
                className="temple-options__item"
                checked={turbo}
                onCheckedChange={() => onTurbo()}
                onSelect={(event) => event.preventDefault()}
              >
                <Zap size={18} aria-hidden="true" />
                <span>Turbo</span>
                <span className="temple-options__state">{turbo ? "On" : "Off"}</span>
              </Menu.CheckboxItem>
              <Menu.Item className="temple-options__item" onSelect={onAuto}>
                <span aria-hidden="true">
                  {canStop ? <Square size={16} /> : <Repeat2 size={18} />}
                </span>
                <span>{canStop ? "Stop Game" : "Auto Spin Settings"}</span>
              </Menu.Item>
              {onInfo && (
                <Menu.Item className="temple-options__item" onSelect={onInfo}>
                  <Info size={18} aria-hidden="true" />
                  <span>Paytable Info</span>
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <span className="temple-mechanism__announcement" role="status" aria-live="polite">
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
