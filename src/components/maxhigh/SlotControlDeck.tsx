import { StagConsole } from "@/games/stag-spirit-glade/StagConsole";
import { SnowglobeConsole } from "@/games/snowglobe-sorcery/SnowglobeConsole";
import { ShogunConsole } from "@/games/shogun-sakura/ShogunConsole";
import { SaturnConsole } from "@/games/saturn-rings/SaturnConsole";
import { SalamanderConsole } from "@/games/salamander-sun/SalamanderConsole";
import { RocketConsole } from "@/games/rocket-rendezvous/RocketConsole";
import { ParlorConsole } from "@/games/potion-parlor/ParlorConsole";
import { PrismConsole } from "@/games/polar-prism/PrismConsole";
import { PeacockConsole } from "@/games/persian-peacock/PeacockConsole";
import { OrchidConsole } from "@/games/orchid-oasis/OrchidConsole";
import { OracleConsole } from "@/games/obsidian-oracle/OracleConsole";
import { NarwhalConsole } from "@/games/northwind-narwhal/NarwhalConsole";
import { NebulaConsole } from "@/games/nebula-nomads/NebulaConsole";
import { MoonwellConsole } from "@/games/moonwell-mysteries/MoonwellConsole";
import { MonsoonConsole } from "@/games/monsoon-grove/MonsoonConsole";
import { MeadowConsole } from "@/games/monarch-meadow/MeadowConsole";
import { MagmaConsole } from "@/games/magma-anvil/MagmaConsole";
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
import "./slot-control-deck.css";
import "./slot-control-realms.css";
import { SirensConsole } from "@/games/sirens-lagoon/SirensConsole";
import { TideNavigation } from "@/games/tidecaller-hoard/TideNavigation";

export type SlotControlDeckProps = {
  gameId: string;
  bet: number;
  win: number;
  balance: number;
  busy: boolean;
  turbo: boolean;
  autoSpin: boolean;
  inFree?: boolean;
  freeSpins?: number;
  /** Optional "n/N" progress derived from the server session (see bonus/freeSpinsProgress). Falls back to the plain count. */
  freeSpinsProgress?: { current: number; total: number } | null;
  freeSpinsPaused?: boolean;
  autoRemaining?: number | "infinity";
  spinDisabled?: boolean;
  onSpin: () => void;
  onDecreaseBet: () => void;
  onIncreaseBet: () => void;
  onSelectBet?: () => void;
  onInfo?: () => void;
  onTurbo: () => void;
  onAuto: () => void;
  muted?: boolean;
  onMute?: () => void;
  /** Fire/coin engines disable their spin action instead of supporting animation skip. */
  supportsSkip?: boolean;
  buyFeature?: { price: number; disabled: boolean; onClick: () => void };
};

const MOTIFS = { flower: Flower2, flame: Flame, sun: Sun, bolt: Zap, paw: PawPrint, moon: Moon };

function StandardSlotControlDeck({
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
      className={`slot-deck slot-deck--${skin.style}`}
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
              <Motif size={26} />
            )}
            <span>
              {spinLabel}
              <small>{spinDetail}</small>
            </span>
          </span>
        </button>

        <div className="slot-deck__tools">
          <button
            type="button"
            className="slot-deck__turbo"
            aria-label="Turbo Fast Mode"
            aria-pressed={turbo}
            onClick={onTurbo}
          >
            <Zap size={17} fill={turbo ? "currentColor" : "none"} />
            <span>Turbo</span>
          </button>
          <button
            type="button"
            className="slot-deck__auto"
            aria-label={canStop ? "Stop Game" : "Auto Spin Settings"}
            aria-pressed={autoSpin}
            onClick={onAuto}
            data-stopping={canStop}
          >
            {canStop ? <Square size={16} fill="currentColor" /> : <Repeat2 size={18} />}
            <span>{canStop ? "Stop" : "Auto"}</span>
          </button>
          {onInfo && (
            <button
              type="button"
              className="slot-deck__info"
              aria-label="Paytable Info"
              onClick={onInfo}
            >
              <Info size={18} />
            </button>
          )}
          {onMute && (
            <button
              type="button"
              className="slot-deck__info"
              aria-label={muted ? "Unmute" : "Mute"}
              aria-pressed={muted}
              onClick={onMute}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
        </div>
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

/** Keep every other game's existing deck unchanged. Realms gameplay retains all callbacks. */
export function SlotControlDeck(props: SlotControlDeckProps) {
  if (props.gameId === "stag-spirit-glade") return <StagConsole {...props} />;
  if (props.gameId === "snowglobe-sorcery") return <SnowglobeConsole {...props} />;
  if (props.gameId === "shogun-sakura") return <ShogunConsole {...props} />;
  if (props.gameId === "saturn-rings") return <SaturnConsole {...props} />;
  if (props.gameId === "salamander-sun") return <SalamanderConsole {...props} />;
  if (props.gameId === "rocket-rendezvous") return <RocketConsole {...props} />;
  if (props.gameId === "potion-parlor") return <ParlorConsole {...props} />;
  if (props.gameId === "polar-prism") return <PrismConsole {...props} />;
  if (props.gameId === "persian-peacock") return <PeacockConsole {...props} />;
  if (props.gameId === "orchid-oasis") return <OrchidConsole {...props} />;
  if (props.gameId === "obsidian-oracle") return <OracleConsole {...props} />;
  if (props.gameId === "northwind-narwhal") return <NarwhalConsole {...props} />;
  if (props.gameId === "nebula-nomads") return <NebulaConsole {...props} />;
  if (props.gameId === "moonwell-mysteries") return <MoonwellConsole {...props} />;
  if (props.gameId === "monsoon-grove") return <MonsoonConsole {...props} />;
  if (props.gameId === "monarch-meadow") return <MeadowConsole {...props} />;
  if (props.gameId === "magma-anvil") return <MagmaConsole {...props} />;
  if (props.gameId === "tidecaller-hoard") return <TideNavigation {...props} />;
  return props.gameId === "sirens-lagoon" ? (
    <SirensConsole {...props} />
  ) : (
    <StandardSlotControlDeck {...props} />
  );
}
