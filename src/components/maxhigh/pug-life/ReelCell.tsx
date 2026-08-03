import { cn } from "@/lib/utils";
import type { PlSymKind } from "@/lib/pug-life-config";
import { ANIM } from "./animationConfig";
import { PugDenIcon } from "./PugDenIcon";
import type { PlCell } from "./types";

export type ReelPhase = "idle" | "spinning" | "stopping" | "win";

const SPIN_STRIP: PlSymKind[] = [
  "sym_10",
  "sym_j",
  "sym_q",
  "sym_k",
  "sym_a",
  "rat",
  "pigeon",
  "cat",
  "chihuahua",
  "pug",
  "treat_biscuit",
  "treat_bone",
  "scatter",
];

type Props = {
  cell: PlCell;
  phase: ReelPhase;
  reel: number;
  row: number;
  spinId: number;
  winning?: boolean;
  sticky?: boolean;
  className?: string;
};

export function ReelCell({
  cell,
  phase,
  reel,
  row,
  spinId,
  winning,
  sticky,
  className,
}: Props) {
  const spinning = phase === "spinning";
  const strip = [...SPIN_STRIP, ...SPIN_STRIP];
  const framePct = 100 / strip.length;
  const stopDelayMs = reel * ANIM.reelStagger + row * 35;

  return (
    <div
      className={cn(
        "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full",
        "border-[3px] border-amber-500/80 bg-[#140e08]/90",
        "shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_0_12px_rgba(0,0,0,0.55)]",
        "backdrop-blur-[2px]",
        "transition-[border-color,box-shadow,transform] duration-200",
        winning &&
          "z-10 scale-[1.06] border-amber-300 ring-2 ring-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.75)]",
        sticky && "ring-2 ring-pink-400/70",
        className,
      )}
    >
      {spinning ? (
        <div
          className="pd-reel-scroll absolute left-0 top-0 z-[1] w-full"
          style={{
            height: `${strip.length * 100}%`,
            filter: "blur(1.5px) saturate(1.1) brightness(1.05)",
            animationDuration: `${0.16 + (reel % 3) * 0.025}s`,
          }}
        >
          {strip.map((sym, i) => (
            <div
              key={`${spinId}-spin-${i}`}
              className="relative w-full"
              style={{ height: `${framePct}%` }}
            >
              <PugDenIcon kind={sym} framed={false} />
            </div>
          ))}
        </div>
      ) : (
        <div
          key={`land-${spinId}-${reel}-${row}`}
          className={cn(
            "absolute inset-0 z-[1]",
            phase === "stopping" && "pd-reel-land",
            winning && "pd-win-pulse",
          )}
          style={phase === "stopping" ? { animationDelay: `${stopDelayMs}ms` } : undefined}
        >
          <PugDenIcon kind={cell.kind} treatMult={cell.treatMult} framed={false} />
        </div>
      )}

      {spinning ? (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.45)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.45)_100%)]" />
      ) : null}
    </div>
  );
}
