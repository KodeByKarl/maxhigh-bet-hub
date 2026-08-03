import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { FgSymKind } from "@/lib/frontier-gold-config";
import { FrontierIcon, TILE_IMAGE_MAP } from "./FrontierIcon";

export type ReelPhase = "idle" | "spinning" | "stopping" | "win";

const SPIN_STRIP: FgSymKind[] = [
  "sym_j",
  "sym_q",
  "sym_k",
  "sym_a",
  "sheriff",
  "bartender",
  "banker",
  "bandit",
  "safe",
  "wild",
];

type ReelCellProps = {
  kind: FgSymKind;
  phase: ReelPhase;
  reel: number;
  row: number;
  spinId: number;
  winning?: boolean;
  dimmed?: boolean;
  removing?: boolean;
  coinLabel?: string;
  className?: string;
};

/**
 * Classic vertical reel + cascade remove (CNY spin / Mahjong tumble hybrid).
 */
export function ReelCell({
  kind,
  phase,
  reel,
  row,
  spinId,
  winning,
  dimmed,
  removing,
  coinLabel,
  className,
}: ReelCellProps) {
  const spinning = phase === "spinning";
  const stopping = phase === "stopping";
  const win = phase === "win" && !!winning && !removing;

  const stopDelay = reel * 0.11 + row * 0.035;
  const strip = [...SPIN_STRIP, ...SPIN_STRIP];
  const framePct = 100 / strip.length;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[5px]",
        "border border-amber-600/40 bg-gradient-to-b from-[#5c3a1e] to-[#2a160c]",
        "shadow-[inset_0_1px_0_rgba(255,220,120,0.14)]",
        dimmed && !winning && !removing && "opacity-40",
        (winning || removing) && "z-10 border-yellow-300/90 shadow-[0_0_16px_rgba(250,204,21,0.75)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-[1px] z-[2] rounded-[4px] border border-amber-200/12" />
      {(winning || removing) && (
        <div className="pointer-events-none absolute inset-0 z-[5] rounded-[5px] ring-2 ring-yellow-300/90" />
      )}

      {spinning && (
        <motion.div
          className="absolute left-0 top-0 z-[1] w-full will-change-transform"
          style={{
            height: `${strip.length * 100}%`,
            filter: "blur(2px) saturate(1.08) brightness(1.06)",
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
              className="relative w-full"
              style={{ height: `${framePct}%` }}
            >
              <img
                src={TILE_IMAGE_MAP[sym]}
                alt=""
                draggable={false}
                className="pointer-events-none size-full scale-[1.55] object-contain object-center"
              />
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
              : win
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
              : win
                ? { duration: 0.55, repeat: 2, ease: "easeInOut" }
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
          <FrontierIcon kind={kind} coinLabel={coinLabel} />
        </motion.div>
      )}

      {spinning && (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.4)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.4)_100%)]" />
      )}
    </div>
  );
}
