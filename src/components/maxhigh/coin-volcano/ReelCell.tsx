import { cn } from "@/lib/utils";
import type { McSymKind } from "@/lib/coin-volcano-config";
import { CoinVolcanoIcon } from "./CoinVolcanoIcon";
import { motion, useReducedMotion } from "framer-motion";

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
  const reducedMotion = useReducedMotion();
  const spinning = phase === "spinning";
  const activeGlow = (!!winning || !!mixHighlight) && !fading;
  const showRing = !!winning || !!mixHighlight || !!fading;
  const sequence = SPIN_STRIP.map((_, i) => SPIN_STRIP[(i + reel + row) % SPIN_STRIP.length]);
  const strip = [...sequence, ...sequence];
  const framePct = 100 / strip.length;
  const stopDelay = turbo ? reel * 0.02 + row * 0.01 : reel * 0.075 + row * 0.035;

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
        <motion.div
          key={`shuffle-${spinId}`}
          className="cv-reel-scroll absolute left-0 top-0 z-[1] w-full"
          initial={{ y: reducedMotion ? "0%" : "-50%" }}
          animate={{ y: "0%" }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  duration: turbo ? 0.38 : 0.85 + (reel % 3) * 0.08,
                  repeat: Infinity,
                  ease: "linear",
                }
          }
          style={{
            height: `${strip.length * 100}%`,
            filter: "saturate(1.08) brightness(1.06)",
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
        </motion.div>
      ) : (
        <motion.div
          key={`land-${spinId}-${reel}-${row}`}
          className={cn(
            "absolute inset-0 z-[1] will-change-transform",
            phase === "stopping" && "cv-reel-land",
          )}
          initial={
            phase === "stopping"
              ? {
                  y: reducedMotion ? "0%" : `${-(row + 1.35) * 100}%`,
                  opacity: 0.45,
                  scale: reducedMotion ? 1 : 0.9,
                }
              : false
          }
          animate={{ y: "0%", opacity: 1, scale: 1 }}
          transition={{
            duration: reducedMotion ? 0.12 : turbo ? 0.18 : 0.38,
            delay: reducedMotion ? 0 : stopDelay,
            ease: [0.16, 0.75, 0.35, 1.12],
          }}
        >
          <div className={cn("size-full", activeGlow && "cv-symbol-pulse")}>
            <CoinVolcanoIcon kind={kind} framed={false} />
          </div>
        </motion.div>
      )}

      {spinning ? (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.4)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.4)_100%)]" />
      ) : null}
    </div>
  );
}
