import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { FgSymKind } from "@/lib/outlaw-coins-config";
import { OutlawCoinsIcon, TILE_IMAGE_MAP } from "./OutlawCoinsIcon";

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
  style?: CSSProperties;
};

/**
 * Circular reel cell — Pug Den diamond style (no square wooden frames).
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
  style,
}: ReelCellProps) {
  const spinning = phase === "spinning";
  const stopping = phase === "stopping";
  const win = phase === "win" && !!winning && !removing;

  const stopDelay = reel * 0.11 + row * 0.035;
  const strip = [...SPIN_STRIP, ...SPIN_STRIP];
  const framePct = 100 / strip.length;

  return (
    <div
      style={style}
      className={cn(
        "relative flex aspect-square w-full min-h-0 shrink-0 items-center justify-center overflow-hidden rounded-full",
        "border-[3px] border-amber-500/85 bg-[#140e08]/92 sm:border-[3.5px]",
        "shadow-[0_4px_18px_rgba(0,0,0,0.5),inset_0_0_14px_rgba(0,0,0,0.55)]",
        "backdrop-blur-[2px]",
        "transition-[border-color,box-shadow,transform,opacity] duration-200",
        dimmed && !winning && !removing && "opacity-40",
        (winning || removing) &&
          "z-10 scale-[1.06] border-amber-300 ring-2 ring-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.75)]",
        className,
      )}
    >
      {spinning && (
        <motion.div
          className="absolute left-0 top-0 z-[1] w-full will-change-transform"
          style={{
            height: `${strip.length * 100}%`,
            filter: "blur(1.5px) saturate(1.1) brightness(1.05)",
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
              className="relative grid w-full place-items-center"
              style={{ height: `${framePct}%` }}
            >
              <div className="size-[88%] overflow-hidden rounded-full bg-[#1a1208]">
                <img
                  src={TILE_IMAGE_MAP[sym]}
                  alt=""
                  draggable={false}
                  className="pointer-events-none size-full scale-[1.28] object-cover object-center"
                />
              </div>
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
          <OutlawCoinsIcon kind={kind} coinLabel={coinLabel} />
        </motion.div>
      )}

      {spinning && (
        <div className="pointer-events-none absolute inset-0 z-[3] rounded-full bg-[linear-gradient(to_bottom,rgba(0,0,0,0.45)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.45)_100%)]" />
      )}
    </div>
  );
}
