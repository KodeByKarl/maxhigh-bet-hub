import { cn } from "@/lib/utils";
import type { McSymKind } from "@/lib/coin-volcano-config";
import { CoinVolcanoIcon } from "./CoinVolcanoIcon";

export type ReelPhase = "idle" | "spinning" | "stopping" | "win";

const SPIN_STRIP: McSymKind[] = ["bar", "dice", "diamond", "chip", "lucky7", "wild", "scatter"];

type ReelCellProps = {
  kind: McSymKind;
  phase: ReelPhase;
  reel: number;
  row: number;
  spinId: number;
  winning?: boolean;
  mixHighlight?: boolean;
  /** Win/mix ring is fading out (keep painted, opacity → 0). */
  fading?: boolean;
  dimmed?: boolean;
  className?: string;
};

/**
 * Coin Volcano cell — CSS win ring with smooth fade-out (no hard cut).
 */
export function ReelCell({
  kind,
  phase,
  reel,
  row,
  spinId,
  winning,
  mixHighlight,
  fading,
  dimmed,
  className,
}: ReelCellProps) {
  const spinning = phase === "spinning";
  const activeGlow = (!!winning || !!mixHighlight) && !fading;
  const showRing = !!winning || !!mixHighlight || !!fading;
  const strip = [...SPIN_STRIP, ...SPIN_STRIP];
  const framePct = 100 / strip.length;
  const stopDelayMs = reel * 110 + row * 35;

  return (
    <div
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden rounded-[6px]",
        "border border-orange-600/50 bg-gradient-to-b from-[#6b2a12] to-[#140806]",
        "shadow-[inset_0_1px_0_rgba(255,210,140,0.2),inset_0_-2px_8px_rgba(0,0,0,0.35)]",
        "transition-[opacity,border-color,box-shadow] duration-350 ease-out",
        dimmed && !activeGlow && !fading && "opacity-35",
        fading && "opacity-100",
        activeGlow && "z-10 border-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.85)]",
        fading && "z-10 border-orange-600/50 shadow-none",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-[1px] z-[2] rounded-[5px] border border-amber-200/20" />
      <div className="pointer-events-none absolute inset-[3px] z-[2] rounded-[4px] border border-orange-900/40" />

      {showRing ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[5] rounded-[6px] ring-[3px] ring-yellow-300",
            "transition-opacity duration-350 ease-out",
            fading ? "opacity-0" : "opacity-100",
          )}
        />
      ) : null}

      {spinning ? (
        <div
          className="fs-reel-scroll absolute left-0 top-0 z-[1] w-full"
          style={{
            height: `${strip.length * 100}%`,
            filter: "blur(2px) saturate(1.08) brightness(1.06)",
            animationDuration: `${0.18 + (reel % 3) * 0.03}s`,
          }}
        >
          {strip.map((sym, i) => (
            <div
              key={`${spinId}-spin-${i}`}
              className="relative w-full"
              style={{ height: `${framePct}%` }}
            >
              <CoinVolcanoIcon kind={sym} framed />
            </div>
          ))}
        </div>
      ) : (
        <div
          key={`land-${spinId}-${reel}-${row}`}
          className={cn(
            "absolute inset-0 z-[1] transition-[transform,filter] duration-350 ease-out",
            phase === "stopping" && "fs-reel-land",
            activeGlow && "fs-win-pulse",
            fading && "scale-100 brightness-100",
          )}
          style={phase === "stopping" ? { animationDelay: `${stopDelayMs}ms` } : undefined}
        >
          <CoinVolcanoIcon kind={kind} />
        </div>
      )}

      {spinning ? (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.4)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.4)_100%)]" />
      ) : null}
    </div>
  );
}
