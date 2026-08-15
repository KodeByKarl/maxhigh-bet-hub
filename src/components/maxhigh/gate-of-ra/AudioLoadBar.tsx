import { motion } from "framer-motion";

type Props = {
  loaded: number;
  total: number;
};

/** Brief audio preload bar shown on game mount. */
export function AudioLoadBar({ loaded, total }: Props) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  const done = total > 0 && loaded >= total;

  if (done) return null;

  return (
    <div className="absolute inset-x-0 top-0 z-[60] flex justify-center pt-3">
      <div
        className="flex min-w-[200px] flex-col gap-1.5 rounded-xl border border-amber-500/50 px-4 py-2.5 shadow-lg"
        style={{ background: "linear-gradient(180deg,#451a03ee,#1c1917f2)" }}
      >
        <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/90">
          <span>Loading temple audio</span>
          <span className="tabular-nums text-amber-400">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-900/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
