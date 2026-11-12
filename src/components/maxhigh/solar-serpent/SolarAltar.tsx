import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  Info,
  Minus,
  MoreHorizontal,
  Plus,
  Repeat2,
  RotateCw,
  Sun,
  Square,
  Zap,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { SlotControlDeckProps } from "../SlotControlDeck";
import "./solar-ui.css";

/** Solar Serpent presentation only. The slot owns every action, amount and gameplay state. */
export function SolarAltar({
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
      className="solar-altar"
      data-slot-deck={gameId}
      aria-label="Game controls"
      data-busy={busy}
    >
      <div className="solar-altar__treasury">
        <dl>
          <dt>Balance</dt>
          <dd title={formatMoney(balance)}>{formatMoney(balance)}</dd>
        </dl>
        <span className="solar-altar__eclipse" aria-hidden="true" />
        <dl>
          <dt>{busy ? "Round win" : "Last win"}</dt>
          <dd title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</dd>
        </dl>
      </div>
      <div className="solar-altar__bet" aria-label="Bet controls">
        {onSelectBet ? (
          <button
            className="solar-altar__stake"
            type="button"
            aria-label="Select Bet Amount"
            onClick={onSelectBet}
            disabled={busy}
          >
            <span>Bet</span>
            <strong>{formatMoney(bet)}</strong>
          </button>
        ) : (
          <div className="solar-altar__stake">
            <span>Bet</span>
            <strong>{formatMoney(bet)}</strong>
          </div>
        )}
        <button type="button" aria-label="Decrease Bet" onClick={onDecreaseBet} disabled={busy}>
          <Minus size={18} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Increase Bet" onClick={onIncreaseBet} disabled={busy}>
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        className="solar-altar__spin"
        aria-label={busy && supportsSkip ? "Skip spin animation" : label}
        aria-busy={busy}
        data-active={autoSpin || inFree}
        disabled={spinDisabled || (busy && !supportsSkip)}
        onClick={onSpin}
      >
        <svg className="solar-altar__serpent" viewBox="0 0 120 120" aria-hidden="true">
          <path d="M84 20C35-2 1 47 25 86c18 30 67 25 76-9 8-28-10-48-31-49" />
          <path className="solar-altar__head" d="m69 19 19 8-17 12-9-10Z" />
          <circle cx="76" cy="27" r="1.8" />
        </svg>
        <span className="solar-altar__face">
          {canStop ? (
            <Square size={22} aria-hidden="true" />
          ) : (
            <RotateCw size={25} aria-hidden="true" />
          )}
          <strong>{label}</strong>
          {detail && <small>{detail}</small>}
        </span>
      </button>
      <div className="solar-altar__utilities">
        {buyFeature ? (
          <button
            type="button"
            className="solar-altar__bonus"
            onClick={buyFeature.onClick}
            disabled={buyFeature.disabled}
          >
            <Sun size={16} aria-hidden="true" />
            <span>
              Buy Bonus<strong>{formatMoney(buyFeature.price)}</strong>
            </span>
          </button>
        ) : (
          <span className="solar-altar__round">{inFree ? "Free spins " + progress : "Ready"}</span>
        )}
        <Menu.Root>
          <Menu.Trigger asChild>
            <button
              type="button"
              className="solar-altar__more"
              aria-label="More game settings"
              data-active={turbo || autoSpin}
            >
              <MoreHorizontal size={22} aria-hidden="true" />
              <span>More</span>
            </button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              className="solar-options"
              data-solar-options
              side="top"
              align="end"
              sideOffset={10}
              collisionPadding={10}
              aria-label="Solar Serpent settings"
            >
              <Menu.CheckboxItem
                className="solar-options__item"
                checked={turbo}
                onCheckedChange={() => onTurbo()}
                onSelect={(event) => event.preventDefault()}
              >
                <Zap size={18} aria-hidden="true" />
                <span>Turbo</span>
                <span className="solar-options__state">{turbo ? "On" : "Off"}</span>
              </Menu.CheckboxItem>
              <Menu.Item className="solar-options__item" onSelect={onAuto}>
                <span aria-hidden="true">
                  {canStop ? <Square size={16} /> : <Repeat2 size={18} />}
                </span>
                <span>{canStop ? "Stop Game" : "Auto Spin Settings"}</span>
              </Menu.Item>
              {onInfo && (
                <Menu.Item className="solar-options__item" onSelect={onInfo}>
                  <Info size={18} aria-hidden="true" />
                  <span>Paytable Info</span>
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <span className="solar-altar__announcement" role="status" aria-live="polite">
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
