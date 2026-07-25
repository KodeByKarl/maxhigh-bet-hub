import { motion } from "framer-motion";
import { ICON_SRC } from "./paytable";

type Props = {
  count?: number;
  onClose: () => void;
};

export function FreeSpinsTriggerModal({ count = 10, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[150] flex cursor-pointer items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.5, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative w-full max-w-lg rounded-[2.5rem] border-4 border-amber-300 p-2 shadow-[0_0_80px_rgba(250,204,21,0.85)]"
        style={{
          background:
            "linear-gradient(135deg, #7E22CE 0%, #A855F7 50%, #EC4899 100%)",
        }}
      >
        <div className="relative overflow-hidden rounded-[2rem] border-2 border-white/40 bg-gradient-to-b from-purple-950/90 via-purple-900/90 to-black/90 px-6 py-10 text-center shadow-inner">
          {/* Animated 3D Rocket Launch Banner */}
          <div className="relative mx-auto mb-4 flex justify-center">
            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [0, -5, 5, 0],
                scale: [1, 1.18, 1],
              }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="relative"
            >
              <img
                src={ICON_SRC.scat}
                alt="Rocket Scatter"
                className="h-32 w-32 object-contain drop-shadow-[0_0_35px_rgba(250,204,21,1)] sm:h-40 sm:w-40"
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-amber-300 bg-amber-400 px-3 py-0.5 text-xs font-black uppercase text-amber-950 shadow-lg">
                🚀 ROCKET SCATTER
              </div>
            </motion.div>
          </div>

          <motion.h2
            initial={{ scale: 0.7 }}
            animate={{ scale: 1.05 }}
            transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.8 }}
            className="text-3xl font-black uppercase tracking-wider text-amber-300 drop-shadow-[0_4px_0_#581C87] sm:text-5xl"
            style={{
              WebkitTextStroke: "1px #581C87",
            }}
          >
            FREE SPINS!
          </motion.h2>

          <div className="mt-2 text-lg font-black uppercase tracking-widest text-white drop-shadow-md sm:text-2xl">
            You Hit 4 Rocket Scatters
          </div>

          <div className="mt-6 rounded-2xl border border-white/30 bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 px-6 py-4 shadow-2xl">
            <div className="text-sm font-black uppercase tracking-[0.2em] text-white/90">
              FEATURE UNLOCKED
            </div>
            <div className="mt-1 text-4xl font-black text-yellow-300 drop-shadow-[0_3px_0_#7E22CE] sm:text-5xl">
              {count} FREE SPINS
            </div>
          </div>

          <div className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-amber-200">
            Tap Anywhere To Start Spin
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
