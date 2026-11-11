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
  turbo?: boolean;
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
  turbo = false,
  winning,
  mixHighlight,
  fading,
  dimmed,
  className,
}: ReelCellProps) {
  const spinning = phase === "spinning";
  const activeGlow = (!!winning || !!mixHighlight) && !fading;
  const showRing = !!winning || !!mixHighlight || !!fading;
  const sequence = SPIN_STRIP.map((_, i) => SPIN_STRIP[(i + reel + row) % SPIN_STRIP.length]);
  const strip = [...sequence, ...sequence];
  const framePct = 100 / strip.length;
  // Every landing must finish inside the existing playback window (60ms in Turbo).
  const stopDelayMs = turbo ? reel * 3 + row : reel * 90 + row * 20;

  return (
    <div
      className={cn("cv-cell", className)}
      data-winning={activeGlow}
      data-dimmed={dimmed && !activeGlow && !fading}
      data-fading={fading}
      aria-label={`Reel ${reel + 1}, row ${row + 1}: ${kind}`}
    >
      {showRing && <div className="cv-cell__win-edge" data-fading={fading} aria-hidden />}

      {spinning ? (
        <div
          className="cv-reel-scroll absolute left-0 top-0 z-[1] w-full"
          style={{
            height: `${strip.length * 100}%`,
            filter: "blur(0.6px) saturate(1.08) brightness(1.06)",
            animationDuration: `${turbo ? 0.25 : 0.6 + (reel % 3) * 0.06}s`,
          }}
        >
          {strip.map((sym, i) => (
            <div
              key={`${spinId}-spin-${i}`}
              className="relative w-full"
              style={{ height: `${framePct}%` }}
            >
              <CoinVolcanoIcon kind={sym} framed={false} />
            </div>
          ))}
        </div>
      ) : (
        <div
          key={`land-${spinId}-${reel}-${row}`}
          className={cn(
            "absolute inset-0 z-[1] transition-[transform,filter] duration-350 ease-out",
            phase === "stopping" && "cv-reel-land",
            activeGlow && "cv-symbol-pulse",
            fading && "scale-100 brightness-100",
          )}
          style={
            phase === "stopping"
              ? { animationDelay: `${stopDelayMs}ms`, animationDuration: turbo ? "28ms" : "300ms" }
              : undefined
          }
        >
          <CoinVolcanoIcon kind={kind} framed={false} />
        </div>
      )}

      {spinning ? (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.4)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.4)_100%)]" />
      ) : null}
    </div>
  );
}
