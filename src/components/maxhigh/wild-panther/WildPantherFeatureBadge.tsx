import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "multiplier" | "freespins";

const VARIANT: Record<
  Variant,
  { stripe: string; fill: string; label: string }
> = {
  multiplier: {
    stripe:
      "repeating-linear-gradient(135deg,#7dd3fc 0 8px,#fff 8px 16px,#38bdf8 16px 24px,#fff 24px 32px)",
    fill: "radial-gradient(circle at 35% 20%, #e0f2fe 0%, #38bdf8 42%, #0284c7 100%)",
    label: "Total\nMultiplier",
  },
  freespins: {
    stripe:
      "repeating-linear-gradient(135deg,#f9a8d4 0 8px,#fff 8px 16px,#ec4899 16px 24px,#fff 24px 32px)",
    fill: "radial-gradient(circle at 35% 20%, #fce7f3 0%, #f472b6 42%, #db2777 100%)",
    label: "Free Spins\nLeft",
  },
};

/** Glossy panther-cane badge — Total Multiplier / Free Spins Left. */
export function WildPantherFeatureBadge({
  variant,
  value,
  className,
}: {
  variant: Variant;
  value: string | number;
  className?: string;
}) {
  const v = VARIANT[variant];
  return (
    <motion.div
      initial={{ scale: 0.88, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("w-[118px] shrink-0", className)}
    >
      <div
        className="rounded-[1.15rem] p-[5px] shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
        style={{ background: v.stripe }}
      >
        <div
          className="relative overflow-hidden rounded-[0.95rem] border-2 border-white/70 px-2 py-3 text-center"
          style={{ background: v.fill }}
        >
          {/* gloss highlight */}
          <div
            className="pointer-events-none absolute inset-x-2 top-1 h-5 rounded-full opacity-50"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.75), transparent)",
            }}
          />
          <div
            className="relative text-[11px] font-black uppercase leading-[1.15] tracking-wide text-white"
            style={{
              textShadow:
                "0 1px 0 #9d174d, 0 -1px 0 #9d174d, 1px 0 0 #9d174d, -1px 0 0 #9d174d, 0 2px 4px rgba(0,0,0,0.35)",
              whiteSpace: "pre-line",
            }}
          >
            {v.label}
          </div>
          <div
            className="relative mt-1.5 font-black text-[2.35rem] leading-none tabular-nums"
            style={{
              color: "#fde047",
              textShadow:
                "0 3px 0 #78350f, 0 5px 8px rgba(0,0,0,0.45), 0 0 1px #78350f",
              WebkitTextStroke: "1px #92400e",
            }}
          >
            {value}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
