import { useEffect, useRef, useState } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Flame,
  Info,
  Minus,
  Plus,
  Repeat2,
  RotateCw,
  Settings2,
  Square,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import type { CoinVolcanoConfig } from "@/lib/coin-volcano-config";
import { formatMoney } from "@/lib/currency";
import { ReelCell, type ReelPhase } from "./ReelCell";
import { cellKey, type McGrid } from "./types";
import "./volcano-ui.css";

export type VolcanoUi = {
  phase: ReelPhase;
  grid: McGrid;
  winKeys: string[];
  mixKeys: string[];
  banner: string | null;
  popup: number | null;
  jackpot: boolean;
  fading: boolean;
  lastWin: number;
  spinId: number;
  locked: boolean;
};

type Props = {
  cfg: CoinVolcanoConfig;
  ui: VolcanoUi;
  balance: number;
  bet: number;
  turbo: boolean;
  autoSpin: boolean;
  muted: boolean;
  onSpin: () => void;
  onDecreaseBet: () => void;
  onIncreaseBet: () => void;
  onTurbo: () => void;
  onAuto: () => void;
  onMute: () => void;
};

/** A visual count only: the target always comes from the authoritative playback. */
function WinAmount({ value }: { value: number }) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = Math.min(previous.current, value);
    previous.current = value;
    if (reducedMotion || value <= from) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 360);
      setDisplay(from + (value - from) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reducedMotion]);
  return (
    <strong aria-label={formatMoney(value)}>
      <span aria-hidden>{formatMoney(display)}</span>
    </strong>
  );
}

export function CoinVolcanoView({
  cfg,
  ui,
  balance,
  bet,
  turbo,
  autoSpin,
  muted,
  onSpin,
  onDecreaseBet,
  onIncreaseBet,
  onTurbo,
  onAuto,
  onMute,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const busy = ui.locked;
  const winning = new Set([...ui.winKeys, ...ui.mixKeys]);
  const celebrating = ui.phase === "win" && (ui.popup ?? 0) > 0 && !ui.fading;
  const bigWin = celebrating && (ui.jackpot || (ui.popup ?? 0) >= bet * 10);
  const shownWin = ui.popup ?? ui.lastWin;
  const status =
    ui.banner ??
    (busy
      ? "Reels in motion"
      : autoSpin
        ? "Auto Spin active"
        : "Choose your stake. Ignite the forge.");

  return (
    <div
      className="cv-game"
      data-game-view="coin-volcano"
      data-phase={ui.phase}
      data-winning={celebrating}
    >
      <main className="cv-machine" aria-label="Coin Volcano slot machine">
        <header className="cv-title">
          <Flame size={20} aria-hidden />
          <div>
            <span>MAXHIGH · INFERNO FORGE</span>
            <h1>
              Coin <em>Volcano</em>
            </h1>
          </div>
        </header>

        <section
          className="cv-cabinet"
          aria-label={`${cfg.reelsCount} reel, ${cfg.rowsCount} row slot`}
        >
          <div className="cv-cabinet__crown">
            <span>INFERNO FORGE</span>
            <span>{cfg.paylineCount} PAYLINES</span>
          </div>
          <div
            className="cv-reels"
            role="group"
            aria-label="Reel results"
            style={{
              gridTemplateColumns: `repeat(${cfg.reelsCount}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${cfg.rowsCount}, minmax(0, 1fr))`,
              aspectRatio: `${cfg.reelsCount} / ${cfg.rowsCount + 0.4}`,
            }}
          >
            {Array.from({ length: cfg.rowsCount }, (_, row) =>
              Array.from({ length: cfg.reelsCount }, (_, reel) => {
                const key = cellKey(reel, row);
                return (
                  <ReelCell
                    key={key}
                    kind={ui.grid[reel]?.[row] ?? "bar"}
                    phase={ui.phase}
                    reel={reel}
                    row={row}
                    spinId={ui.spinId}
                    turbo={turbo}
                    winning={ui.winKeys.includes(key) || ui.jackpot}
                    mixHighlight={ui.mixKeys.includes(key)}
                    fading={ui.fading && winning.has(key)}
                    dimmed={winning.size > 0 && !winning.has(key) && !ui.fading}
                  />
                );
              }),
            )}
          </div>
          {bigWin && (
            <div key={`${ui.spinId}:${ui.banner}`} className="cv-eruption" aria-hidden>
              <span>{ui.jackpot ? "GRAND JACKPOT" : "GOLD ERUPTION"}</span>
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} style={{ "--ember-index": i } as React.CSSProperties} />
              ))}
            </div>
          )}
          <div className="cv-reward" data-active={celebrating} data-mix={ui.mixKeys.length > 0}>
            <div>
              <span>
                {ui.popup != null
                  ? ui.banner === "TOTAL WIN" || ui.banner === "MAX WIN CAP"
                    ? "Total win"
                    : "Round win"
                  : "Last win"}
              </span>
              <WinAmount value={shownWin} />
            </div>
            <p role="status" aria-live="polite">
              {status}
            </p>
          </div>
        </section>

        <section className="cv-console" aria-label="Game controls">
          <div className="cv-wallet">
            <span>Balance</span>
            <strong title={formatMoney(balance)}>{formatMoney(balance)}</strong>
          </div>
          <div className="cv-stake" role="group" aria-label="Bet amount">
            <button
              type="button"
              aria-label="Decrease Bet"
              disabled={busy || bet <= cfg.minBet}
              onClick={onDecreaseBet}
            >
              <Minus size={18} />
            </button>
            <div>
              <span>Total bet</span>
              <strong>{formatMoney(bet)}</strong>
            </div>
            <button
              type="button"
              aria-label="Increase Bet"
              disabled={busy || bet >= cfg.maxBet}
              onClick={onIncreaseBet}
            >
              <Plus size={18} />
            </button>
          </div>
          <button
            type="button"
            className="cv-spin"
            data-active={busy}
            data-win={celebrating}
            disabled={busy || balance < bet}
            onClick={onSpin}
            aria-label={busy ? "Spinning" : "Spin"}
          >
            <span className="cv-spin__face">
              <RotateCw size={25} aria-hidden />
              <strong>{busy ? "Spinning" : "Spin"}</strong>
            </span>
          </button>
          <div className="cv-tools">
            <Menu.Root>
              <Menu.Trigger asChild>
                <button
                  type="button"
                  className="cv-settings-trigger"
                  aria-label={`Game settings${turbo ? ", Turbo on" : ""}${autoSpin ? ", Auto Spin active" : ""}`}
                >
                  <Settings2 size={18} />
                  <span>Settings</span>
                  {(turbo || autoSpin) && <i aria-hidden />}
                </button>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Content
                  className="cv-menu"
                  side="top"
                  align="start"
                  sideOffset={10}
                  collisionPadding={12}
                  aria-label="Game settings"
                >
                  <Menu.CheckboxItem
                    className="cv-menu__item"
                    checked={turbo}
                    onCheckedChange={onTurbo}
                  >
                    <Zap size={17} />
                    <span>Turbo</span>
                    <small>{turbo ? "On" : "Off"}</small>
                  </Menu.CheckboxItem>
                  <Menu.CheckboxItem
                    className="cv-menu__item"
                    checked={autoSpin}
                    onCheckedChange={onAuto}
                  >
                    {autoSpin ? <Square size={17} /> : <Repeat2 size={17} />}
                    <span>{autoSpin ? "Stop Auto Spin" : "Auto Spin"}</span>
                  </Menu.CheckboxItem>
                  <Menu.Item className="cv-menu__item" onSelect={onMute}>
                    {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                    <span>{muted ? "Unmute sound" : "Mute sound"}</span>
                  </Menu.Item>
                  <Menu.Item className="cv-menu__item" onSelect={() => setInfoOpen(true)}>
                    <Info size={17} />
                    <span>Info / Paytable</span>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Portal>
            </Menu.Root>
            <span className="cv-mode">
              {autoSpin ? "Auto Spin on" : turbo ? "Turbo on" : "Base game"}
            </span>
          </div>
          {autoSpin && (
            <button type="button" className="cv-auto-stop" onClick={onAuto}>
              <Square size={14} fill="currentColor" /> Stop Auto Spin
            </button>
          )}
        </section>
        <p className="cv-rules">
          {cfg.paylineCount} lines <b>·</b> Wild + Scatter mix <b>·</b> Grand{" "}
          {cfg.grandJackpotMult.toLocaleString()}×
        </p>
      </main>

      <Dialog.Root open={infoOpen} onOpenChange={setInfoOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="cv-info-backdrop" />
          <Dialog.Content className="cv-info">
            <Dialog.Title>Coin Volcano · Paytable</Dialog.Title>
            <Dialog.Description>
              Current game configuration. Line wins multiply the bet per line; mix and Grand prizes
              multiply the total bet.
            </Dialog.Description>
            <Dialog.Close className="cv-info__close" aria-label="Close paytable">
              <X size={20} />
            </Dialog.Close>
            <p>
              {cfg.paylineCount} lines · Bet per line {formatMoney(bet / cfg.paylineCount)} · Total
              bet {formatMoney(bet)}
            </p>
            <table>
              <caption>Line wins · × bet per line</caption>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>3</th>
                  <th>4</th>
                  <th>5</th>
                </tr>
              </thead>
              <tbody>
                {cfg.symbols
                  .filter((s) => !s.scatter)
                  .map((s) => (
                    <tr key={s.id}>
                      <th>{s.name}</th>
                      {s.pay.map((pay, i) => (
                        <td key={i}>{pay}×</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
            <table>
              <caption>Wild + Scatter mix · × total bet</caption>
              <thead>
                <tr>
                  <th>Count</th>
                  <th>Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cfg.instantMixTable).map(([count, mult]) => (
                  <tr key={count}>
                    <th>{count}</th>
                    <td>{mult}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              All {cfg.reelsCount * cfg.rowsCount} Scatters: Grand{" "}
              {cfg.grandJackpotMult.toLocaleString()}×; replaces the mix prize.{" "}
              {cfg.maxWinMult > 0
                ? `Total payout cap: ${cfg.maxWinMult.toLocaleString()}× total bet.`
                : "No configured total payout cap."}
            </p>
            <p>Base game only. No Buy Bonus or Free Spins.</p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
