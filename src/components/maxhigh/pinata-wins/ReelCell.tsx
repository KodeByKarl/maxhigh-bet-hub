import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PwSymKind } from "@/lib/pinata-wins-config";
import type { PwCell } from "./types";
import { PinataIcon } from "./PinataIcon";

export type ReelPhase = "idle" | "spinning" | "stopping" | "win";

const SPIN_STRIP: PwSymKind[] = [
  "chili",
  "taco",
  "maracas",
  "sombrero",
  "cactus",
  "guitar",
  "golden_skull",
  "wild",
  "scatter",
];

type ReelCellProps = {
  cell: PwCell;
  phase: ReelPhase;
  reel: number;
  row: number;
  spinId: number;
  winning?: boolean;
  goldPulse?: boolean;
  transformPulse?: boolean;
  removing?: boolean;
  dimmed?: boolean;
};

/**
 * Classic vertical reel scroll + land (Frontier / Fire Spike pattern),
 * with 3D Pinata symbol art.
 */
export function ReelCell({
  cell,
  phase,
  reel,
  row,
  spinId,
  winning,
  goldPulse,
  transformPulse,
  removing,
  dimmed,
}: ReelCellProps) {
  const spinning = phase === "spinning";
  const stopping = phase === "stopping";
  const win = phase === "win" && !!winning && !removing;

  const stopDelay = reel * 0.11 + row * 0.035;
  const strip = [...SPIN_STRIP, ...SPIN_STRIP];
  const framePct = 100 / strip.length;
  const activeGlow = win || !!goldPulse || !!transformPulse || !!removing;
  const showGoldFrame = cell.framed && cell.frameMult > 0 && !spinning;

  return (
    <div
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden rounded-md sm:rounded-lg",
        "border border-amber-800/25 bg-[#1a0c08]",
        dimmed && !activeGlow && "opacity-40",
        activeGlow && "z-10 border-yellow-300/90 shadow-[0_0_16px_rgba(250,204,21,0.75)]",
        showGoldFrame && !activeGlow && "border-yellow-400/70 shadow-[0_0_10px_rgba(250,204,21,0.35)]",
      )}
    >
      {(winning || goldPulse || transformPulse || removing || showGoldFrame) && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[5] rounded-md ring-2 sm:rounded-lg",
            transformPulse
              ? "ring-pink-400"
              : goldPulse || showGoldFrame
                ? "ring-yellow-300"
                : "ring-amber-300",
          )}
        />
      )}

      {spinning && (
        <motion.div
          className="absolute left-0 top-0 z-[1] w-full will-change-transform"
          style={{
            height: `${strip.length * 100}%`,
            filter: "blur(2px) saturate(1.1) brightness(1.06)",
          }}
          animate={{ y: ["0%", "-50%"] }}
          transition={{
            duration: 0.2 + (reel % 3) * 0.03,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {strip.map((sym, i) => (
            <div
              key={`${spinId}-spin-${i}`}
              className="relative w-full overflow-hidden"
              style={{ height: `${framePct}%` }}
            >
              <PinataIcon kind={sym} className="p-[2%]" />
            </div>
          ))}
        </motion.div>
      )}

      {!spinning && (
        <motion.div
          key={`land-${spinId}-${reel}-${row}`}
          className="absolute inset-0 z-[1] will-change-transform"
          initial={
            stopping || phase === "win"
              ? { y: "-120%", opacity: 0.35, scale: 0.92, filter: "blur(4px)" }
              : false
          }
          animate={
            removing
              ? { y: 0, opacity: 0, scale: 0.35, filter: "blur(6px) brightness(1.4)" }
              : win || goldPulse || transformPulse
                ? {
                    y: 0,
                    opacity: 1,
                    scale: [1, 1.08, 1.02],
                    filter: [
                      "blur(0px) brightness(1)",
                      "blur(0px) brightness(1.25)",
                      "blur(0px) brightness(1.08)",
                    ],
                  }
                : {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px) brightness(1)",
                  }
          }
          transition={
            removing
              ? { duration: 0.35, ease: "easeIn" }
              : win || goldPulse || transformPulse
                ? { duration: 0.55, repeat: 1, ease: "easeInOut" }
                : stopping
                  ? {
                      y: {
                        type: "spring",
                        stiffness: 380,
                        damping: 22,
                        mass: 0.9,
                        delay: stopDelay,
                      },
                      opacity: { duration: 0.15, delay: stopDelay },
                      scale: {
                        type: "spring",
                        stiffness: 460,
                        damping: 18,
                        delay: stopDelay + 0.05,
                      },
                      filter: { duration: 0.2, delay: stopDelay },
                    }
                  : { duration: 0.2 }
          }
        >
          <PinataIcon
            kind={cell.kind}
            frameMult={showGoldFrame ? cell.frameMult : 0}
            className="p-[2%]"
          />
        </motion.div>
      )}

      {spinning && (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.45)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.45)_100%)]" />
      )}
    </div>
  );
}
