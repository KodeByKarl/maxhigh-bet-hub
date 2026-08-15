import { memo } from "react";
import { cn } from "@/lib/utils";
import type { FsSymKind } from "@/lib/fire-spike-config";
import { FireSpikeIcon } from "./FireSpikeIcon";

export type ReelPhase = "idle" | "spinning" | "stopping" | "win";

const SPIN_STRIP: FsSymKind[] = ["bar", "dice", "diamond", "chip", "lucky7", "wild", "scatter"];
const SPIN_STRIP_LOOP: FsSymKind[] = [...SPIN_STRIP, ...SPIN_STRIP];
const FRAME_PCT = 100 / SPIN_STRIP_LOOP.length;

type ReelCellProps = {
  kind: FsSymKind;
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
 * Fire Spike cell — CSS win ring with smooth fade-out (no hard cut).
 */
export const ReelCell = memo(function ReelCell({
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
          className="fs-reel-scroll absolute left-0 top-0 z-[1] w-full opacity-90"
          style={{
            height: `${SPIN_STRIP_LOOP.length * 100}%`,
            animationDuration: `${0.18 + (reel % 3) * 0.03}s`,
          }}
        >
          {SPIN_STRIP_LOOP.map((sym, i) => (
            <div key={`spin-${i}`} className="relative w-full" style={{ height: `${FRAME_PCT}%` }}>
              <FireSpikeIcon kind={sym} framed />
            </div>
          ))}
        </div>
      ) : (
        <div
          key={phase === "stopping" ? `land-${spinId}` : "idle"}
          className={cn(
            "absolute inset-0 z-[1] transition-transform duration-350 ease-out",
            phase === "stopping" && "fs-reel-land",
            activeGlow && "fs-win-pulse",
            fading && "scale-100",
          )}
          style={phase === "stopping" ? { animationDelay: `${stopDelayMs}ms` } : undefined}
        >
          <FireSpikeIcon kind={kind} />
        </div>
      )}

      {spinning ? (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.4)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.4)_100%)]" />
      ) : null}
    </div>
  );
});
