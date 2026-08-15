import { motion, useAnimationControls } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ASSET } from "./paytable";

export type MascotMood = "idle" | "spin" | "win" | "celebrate";

/** Pharaoh mascot — no studio box; soft desert glow underfoot. */
export function PharaohMascot({
  mood,
  pulse = 0,
  className,
}: {
  mood: MascotMood;
  pulse?: number;
  className?: string;
}) {
  const controls = useAnimationControls();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (mood === "spin") {
        await controls.start({
          rotate: [0, -7, 9, -5, 3, 0],
          y: [0, -22, 8, -12, 0],
          scale: [1, 1.08, 0.97, 1.05, 1],
          transition: { duration: 0.9, ease: "easeInOut" },
        });
      } else if (mood === "win") {
        await controls.start({
          rotate: [0, -4, 4, -2, 0],
          y: [0, -26, -6, -18, 0],
          scale: [1, 1.12, 1.03, 1.09, 1],
          filter: [
            "brightness(1)",
            "brightness(1.3)",
            "brightness(1.1)",
            "brightness(1.22)",
            "brightness(1)",
          ],
          transition: { duration: 1, ease: "easeOut" },
        });
      } else if (mood === "celebrate") {
        await controls.start({
          rotate: [0, -12, 12, -8, 6, 0],
          y: [0, -32, -4, -22, 0],
          scale: [1, 1.16, 1.06, 1.12, 1],
          transition: { duration: 1.25, ease: "easeInOut" },
        });
      }

      if (cancelled) return;

      controls.start({
        y: [0, -7, 0],
        rotate: [0, 1.5, -1.5, 0],
        scale: 1,
        filter: "brightness(1)",
        transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
      });
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [mood, pulse, controls]);

  return (
    <div className={cn("relative", className)}>
      {/* Warm desert ground glow — replaces the black plate */}
      <div
        className="pointer-events-none absolute bottom-[6%] left-1/2 h-[18%] w-[78%] -translate-x-1/2 rounded-[100%] blur-md"
        style={{
          background:
            "radial-gradient(ellipse, rgba(251,191,36,0.45) 0%, rgba(180,83,9,0.2) 45%, transparent 72%)",
        }}
      />
      <motion.img
        src={ASSET.mascot}
        alt="Mystic Runes Pharaoh"
        animate={controls}
        initial={{ y: 0, rotate: 0, scale: 1 }}
        className="pointer-events-none relative z-[1] h-full w-auto max-w-none select-none object-contain object-bottom drop-shadow-[0_18px_36px_rgba(69,26,3,0.55)]"
        style={{ backgroundColor: "transparent", mixBlendMode: "normal" }}
        draggable={false}
      />
    </div>
  );
}
