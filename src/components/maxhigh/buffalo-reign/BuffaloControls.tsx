import type { CSSProperties } from "react";
import {
  Flower2,
  Flame,
  Info,
  Minus,
  Moon,
  PawPrint,
  Plus,
  Repeat2,
  RotateCw,
  Square,
  Sun,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { SLOT_CONTROL_SKINS } from "@/lib/slot-control-skins";
import { formatMoney } from "@/lib/currency";
import "../slot-control-deck.css";
import "../slot-control-realms.css";

import type { SlotControlDeckProps } from "../SlotControlDeck";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Settings2 } from "lucide-react";
import { buffaloReignTheme } from "./theme";

const MOTIFS = { flower: Flower2, flame: Flame, sun: Sun, bolt: Zap, paw: PawPrint, moon: Moon };

export function BuffaloControls({
  gameId,
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
  const skin = SLOT_CONTROL_SKINS[gameId];
  if (!skin) return null;
  const Motif = MOTIFS[skin.motif];
  const canStop = autoSpin || (supportsSkip && (busy || (inFree && !freeSpinsPaused)));
  const spinLabel = busy
    ? supportsSkip
      ? "Skip"
      : "Spinning"
    : autoSpin
      ? "Stop auto"
      : inFree
        ? "Free spin"
        : "Spin";
  const style = {
    "--deck-accent": skin.accent,
    "--deck-surface": skin.surface,
    "--deck-ink": skin.ink,
  } as CSSProperties;
  const fsCounter = freeSpinsProgress
    ? `${freeSpinsProgress.current}/${freeSpinsProgress.total}`
    : null;
  const spinDetail = inFree
    ? fsCounter
      ? `FREE SPINS ${fsCounter}`
      : `${freeSpins} left`
    : autoSpin && autoRemaining !== undefined
      ? `${autoRemaining === "infinity" ? "∞" : autoRemaining} left`
      : null;

  return (
    <section
      className={`slot-deck buffalo-controls slot-deck--${skin.style}`}
      style={style}
      data-slot-deck={gameId}
      data-skin={skin.style}
      data-busy={busy}
      aria-label="Game controls"
    >
      <div className="slot-deck__meters">
        <div className="slot-deck__balance">
          <span>Balance</span>
          <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
        </div>
        <div className="slot-deck__win" data-winning={win > 0}>
          <span>{busy ? "Round win" : "Last win"}</span>
          <strong title={formatMoney(win)}>{win > 0 ? formatMoney(win) : "—"}</strong>
        </div>
        {buyFeature ? (
          <button
            type="button"
            className="slot-deck__bonus"
            disabled={buyFeature.disabled}
            onClick={buyFeature.onClick}
          >
            <Motif size={18} />
            <span>
              Buy bonus<strong>{formatMoney(buyFeature.price)}</strong>
            </span>
          </button>
        ) : (
          <div className="slot-deck__round">
            <Motif size={18} />
            <span>{inFree ? "Free spins" : "Ready to play"}</span>
            {inFree && (
              <strong data-fs-counter={fsCounter ?? undefined}>{fsCounter ?? freeSpins}</strong>
            )}
          </div>
        )}
      </div>

      <div className="slot-deck__play">
        <div className="slot-deck__bet" role="group" aria-label="Bet amount">
          <button type="button" aria-label="Decrease Bet" disabled={busy} onClick={onDecreaseBet}>
            <Minus size={17} />
          </button>
          {onSelectBet ? (
            <button
              type="button"
              className="slot-deck__stake"
              disabled={busy}
              onClick={onSelectBet}
              aria-label="Select Bet Amount"
            >
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </button>
          ) : (
            <div className="slot-deck__stake">
              <span>Bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
          )}
          <button type="button" aria-label="Increase Bet" disabled={busy} onClick={onIncreaseBet}>
            <Plus size={17} />
          </button>
        </div>

        <button
          type="button"
          className="slot-deck__spin"
          onClick={onSpin}
          disabled={spinDisabled}
          aria-label={
            spinLabel === "Spin" ? "Spin" : spinLabel === "Skip" ? "Skip spin animation" : spinLabel
          }
          data-active={busy || autoSpin}
        >
          <span className="slot-deck__spin-face">
            {busy ? (
              <RotateCw className="slot-deck__spinning" size={24} />
            ) : autoSpin ? (
              <Square size={22} fill="currentColor" />
            ) : (
              <img
                className="bf-spin-buffalo"
                src={buffaloReignTheme.assets.icons.heart}
                alt=""
                draggable={false}
              />
            )}
            <span>
              {spinLabel}
              <small>{spinDetail}</small>
            </span>
          </span>
        </button>

        <Menu.Root>
          <Menu.Trigger asChild>
            <button
              type="button"
              className="bf-settings-trigger"
              aria-label={`Game settings${turbo ? ", Turbo on" : ""}${autoSpin ? ", Auto Spin active" : ""}`}
              data-active={turbo || autoSpin}
            >
              <Settings2 size={18} />
              <span>Settings</span>
              {(turbo || autoSpin) && <i aria-hidden />}
            </button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              className="bf-settings-menu"
              side="top"
              align="start"
              sideOffset={10}
              collisionPadding={12}
              aria-label="Game settings"
            >
              <Menu.CheckboxItem
                className="bf-settings-item"
                checked={turbo}
                onCheckedChange={onTurbo}
              >
                <Zap size={17} />
                <span>Turbo</span>
                <small>{turbo ? "On" : "Off"}</small>
              </Menu.CheckboxItem>
              <Menu.Item className="bf-settings-item" onSelect={onAuto}>
                {canStop ? <Square size={17} /> : <Repeat2 size={17} />}
                <span>{canStop ? "Stop game" : "Auto Spin"}</span>
                {autoSpin && <small>Active</small>}
              </Menu.Item>
              {onInfo && (
                <Menu.Item className="bf-settings-item" onSelect={onInfo}>
                  <Info size={17} />
                  <span>Info / Paytable</span>
                </Menu.Item>
              )}
              {onMute && (
                <Menu.Item className="bf-settings-item" onSelect={onMute}>
                  {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  <span>{muted ? "Unmute" : "Mute"}</span>
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <div className="slot-deck__message" role="status" aria-live="polite">
        {busy
          ? "Spin in progress"
          : inFree
            ? fsCounter
              ? `FREE SPINS ${fsCounter}${freeSpinsPaused ? " · paused" : ""}`
              : `${freeSpins} free spins${freeSpinsPaused ? " · paused" : " remaining"}`
            : autoSpin
              ? "Auto spin active"
              : win > 0
                ? "Win credited"
                : "Choose your bet, then spin"}
      </div>
    </section>
  );
}
