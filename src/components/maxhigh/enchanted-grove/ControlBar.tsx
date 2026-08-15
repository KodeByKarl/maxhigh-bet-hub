import type { ButtonHTMLAttributes } from "react";
import { Info, RotateCw, Settings, Square, Volume2, VolumeX, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";

const BET_STEPS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

type ControlBarProps = {
  balance: number;
  bet: number;
  win: number;
  busy: boolean;
  inFree: boolean;
  turbo: boolean;
  autoSpin: boolean;
  muted?: boolean;
  onBetChange: (bet: number) => void;
  onTurbo: () => void;
  onAuto: () => void;
  onSpin: () => void;
  onMuteToggle?: () => void;
  onOpenInfo?: () => void;
  onOpenSettings?: () => void;
};

const goldRim =
  "linear-gradient(135deg, #fef3c7 0%, #fbbf24 22%, #b45309 50%, #fde68a 78%, #92400e 100%)";
const stonePanel =
  "linear-gradient(180deg, #a16207 0%, #78350f 18%, #451a03 55%, #1c0a00 100%)";

function IconBtn({
  children,
  className,
  active,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "grid size-8 place-items-center rounded-full border-2 shadow transition hover:brightness-110 disabled:opacity-40",
        active
          ? "border-amber-200 bg-gradient-to-b from-amber-200 to-amber-600 text-amber-950"
          : "border-amber-400/70 bg-amber-950 text-amber-200",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Candy Peak–style bottom HUD: stats left, turbo center, − / spin / + right. */
export function ControlBar({
  balance,
  bet,
  win,
  busy,
  inFree,
  turbo,
  autoSpin,
  muted = false,
  onBetChange,
  onTurbo,
  onAuto,
  onSpin,
  onMuteToggle,
  onOpenInfo,
  onOpenSettings,
}: ControlBarProps) {
  const stepDown = () => {
    const prev = [...BET_STEPS].reverse().find((v) => v < bet);
    onBetChange(prev ?? BET_STEPS[0]);
  };
  const stepUp = () => {
    const next = BET_STEPS.find((v) => v > bet);
    onBetChange(next ?? BET_STEPS[BET_STEPS.length - 1]);
  };

  return (
    <div className="relative z-20 w-full">
      <div className="rounded-[1.15rem] p-[4px] shadow-[0_12px_36px_rgba(69,26,3,0.55)]" style={{ background: goldRim }}>
        <div
          className="flex flex-col gap-2 rounded-[0.95rem] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3"
          style={{ background: stonePanel }}
        >
          {/* Left — credit / bet / win + utility */}
          <div className="flex min-w-0 flex-col gap-1.5 sm:min-w-[150px]">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-black tracking-wide sm:gap-x-4">
              <div>
                <span className="text-[10px] uppercase text-amber-300/90 sm:text-xs">Balance </span>
                <span className="text-sm tabular-nums text-amber-100 sm:text-base">{formatMoney(balance)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-amber-300/90 sm:text-xs">Bet </span>
                <span className="text-sm tabular-nums text-amber-100 sm:text-base">{formatMoney(bet)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-amber-300/90 sm:text-xs">Win </span>
                <span className="text-sm tabular-nums text-emerald-300 sm:text-base">{formatMoney(win)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <IconBtn aria-label="Settings" onClick={onOpenSettings}>
                <Settings size={14} />
              </IconBtn>
              <IconBtn aria-label="Paytable" onClick={onOpenInfo}>
                <Info size={14} />
              </IconBtn>
              <IconBtn
                aria-label={muted ? "Unmute" : "Mute"}
                active={!muted}
                onClick={onMuteToggle}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </IconBtn>
            </div>
          </div>

          {/* Center — turbo */}
          <div className="flex flex-1 items-center justify-center gap-2">
            <button
              type="button"
              onClick={onTurbo}
              aria-pressed={turbo}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow transition sm:text-xs",
                turbo
                  ? "border-amber-200 bg-gradient-to-b from-amber-100 to-amber-500 text-amber-950"
                  : "border-amber-400/80 bg-amber-950 text-amber-200",
              )}
            >
              <Zap size={12} className={turbo ? "fill-current" : undefined} />
              Turbo
            </button>
          </div>

          {/* Right — − / spin / + + autoplay */}
          <div className="flex flex-col items-center gap-1 self-center">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                disabled={busy || inFree || bet <= BET_STEPS[0]}
                onClick={stepDown}
                className="grid size-10 place-items-center rounded-full border-[3px] border-amber-300 text-xl font-black text-amber-50 shadow-lg disabled:opacity-40 sm:size-11"
                style={{ background: "linear-gradient(180deg,#a16207 0%,#451a03 100%)" }}
                aria-label="Decrease bet"
              >
                −
              </button>

              <button
                type="button"
                disabled={inFree}
                onClick={onSpin}
                className="relative grid size-[68px] place-items-center rounded-full border-[4px] border-amber-200 shadow-[0_8px_28px_rgba(251,191,36,0.45)] disabled:opacity-60 active:scale-95 sm:size-[76px]"
                style={{
                  background: busy
                    ? "linear-gradient(180deg,#fbbf24,#b45309)"
                    : "radial-gradient(circle at 35% 28%, #fef3c7 0%, #fbbf24 35%, #d97706 70%, #78350f 100%)",
                }}
                aria-label={busy ? "Spinning" : "Spin"}
              >
                {busy ? (
                  <Square className="size-7 fill-amber-950 text-amber-950" />
                ) : (
                  <RotateCw className="size-8 text-amber-950 sm:size-9" strokeWidth={2.6} />
                )}
              </button>

              <button
                type="button"
                disabled={busy || inFree || bet >= BET_STEPS[BET_STEPS.length - 1]}
                onClick={stepUp}
                className="grid size-10 place-items-center rounded-full border-[3px] border-amber-300 text-xl font-black text-amber-50 shadow-lg disabled:opacity-40 sm:size-11"
                style={{ background: "linear-gradient(180deg,#a16207 0%,#451a03 100%)" }}
                aria-label="Increase bet"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={inFree}
              onClick={onAuto}
              className={cn(
                "rounded-full border-2 px-5 py-1 text-[10px] font-black uppercase tracking-wider shadow sm:text-xs",
                autoSpin
                  ? "border-amber-200 bg-gradient-to-b from-amber-100 to-amber-500 text-amber-950"
                  : "border-amber-400/80 bg-amber-950 text-amber-200",
              )}
            >
              Autoplay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
