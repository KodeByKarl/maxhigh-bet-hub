import { motion } from "framer-motion";
import type { WayWin } from "./types";
import { SymbolIcon } from "./SymbolIcon";

/** Mid-reel ways win breakdown overlay (ref style). */
export function WaysWinOverlay({
  ways,
  multiplier,
}: {
  ways: WayWin[];
  multiplier: number;
}) {
  if (ways.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none absolute inset-x-2 top-1/2 z-30 -translate-y-1/2 rounded-md border-2 border-amber-400/60 px-3 py-2 shadow-xl backdrop-blur-sm"
      style={{
        background: "linear-gradient(180deg, rgba(69,26,3,0.94), rgba(28,10,0,0.96))",
        boxShadow: "inset 0 1px 0 rgba(253,230,138,0.25), 0 12px 28px rgba(0,0,0,0.45)",
      }}
    >
      <div className="space-y-1.5">
        {ways.slice(0, 4).map((w) => {
          const perWay = +(w.pay / Math.max(1, w.ways) / Math.max(1, multiplier)).toFixed(2);
          const total = w.pay;
          return (
            <div
              key={w.id}
              className="flex items-center gap-2 font-black tabular-nums text-amber-200"
              style={{
                textShadow: "0 1px 0 #000, 0 0 8px rgba(0,0,0,0.8)",
                fontSize: "clamp(12px, 2.8vw, 16px)",
              }}
            >
              <div className="relative size-8 shrink-0 overflow-hidden rounded-md border border-amber-400/50 bg-amber-950">
                <SymbolIcon kind={w.kind} className="size-full" />
                <span className="absolute bottom-0 right-0 rounded-tl bg-amber-950/90 px-0.5 text-[8px] text-amber-100">
                  {w.length}
                </span>
              </div>
              <span>
                {perWay} × {w.ways} WAYS = {total}
                {multiplier > 1 ? `  (×${multiplier})` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
