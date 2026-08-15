import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function FreeSpinsBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "w-full rounded-2xl border-[3px] px-2 py-3 text-center shadow-[0_8px_24px_rgba(0,0,0,0.45)]",
        className,
      )}
      style={{
        background: "linear-gradient(180deg, #92400e 0%, #451a03 55%, #1c0a00 100%)",
        borderColor: "#fbbf24",
        boxShadow: "inset 0 1px 0 rgba(253,230,138,0.4), 0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
        Free Spins
      </div>
      <div className="font-black text-3xl leading-none text-amber-300 tabular-nums">{count}</div>
      <div className="mt-1 text-[8px] font-bold uppercase tracking-widest text-amber-500/90">
        Of the Nile
      </div>
    </motion.div>
  );
}
