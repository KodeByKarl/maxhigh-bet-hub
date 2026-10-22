/**
 * Hit / kill explosions for the fishing arenas: fiery core flash, shock rings,
 * sparks, debris and — on kills — a coin burst with a floating payout.
 * Misses become a water splash instead.
 */
import { motion } from "framer-motion";
import { SKINS } from "./FishingCannon";
import type { FishingGameKey } from "./fauna";

export type Blast = {
  id: number;
  x: number;
  y: number;
  kind: "miss" | "hit" | "kill" | "boss";
  credit?: number;
};

function Burst({ b, game }: { b: Blast; game: FishingGameKey }) {
  const skin = SKINS[game];
  const big = b.kind === "boss" ? 2 : b.kind === "kill" ? 1.35 : 1;
  const miss = b.kind === "miss";
  const sparkN = miss ? 8 : b.kind === "hit" ? 10 : b.kind === "kill" ? 18 : 28;
  const coinN = b.kind === "kill" ? 7 : b.kind === "boss" ? 16 : 0;
  const fire = miss ? "#bae6fd" : "#fde68a";
  const hot = miss ? "#e0f2fe" : "#fb923c";
  const rings = b.kind === "boss" ? [0, 0.12, 0.24] : b.kind === "kill" ? [0, 0.12] : [0];

  return (
    <div
      className="pointer-events-none absolute z-[15] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${b.x}%`, top: `${b.y}%` }}
    >
      {/* white-hot core flash */}
      <motion.span
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 70 * big,
          height: 70 * big,
          background: `radial-gradient(circle, #fff 0%, ${fire} 30%, ${hot} 55%, transparent 72%)`,
        }}
        initial={{ opacity: 1, scale: 0.2 }}
        animate={{ opacity: 0, scale: miss ? 1.1 : 1.8 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
      />
      {/* shock rings */}
      {rings.map((d) => (
        <motion.span
          key={d}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
          style={{ width: 60 * big, height: 60 * big, borderColor: miss ? "#bae6fd" : skin.shot }}
          initial={{ opacity: 0.95, scale: 0.2 }}
          animate={{ opacity: 0, scale: miss ? 1.6 : 2.8 }}
          transition={{ duration: 0.6, delay: d, ease: "easeOut" }}
        />
      ))}
      {/* sparks / droplets */}
      {Array.from({ length: sparkN }).map((_, i) => {
        const a = (i / sparkN) * Math.PI * 2 + (i % 2) * 0.2;
        const dist = (miss ? 34 : 46 + (i % 3) * 14) * big;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: miss ? 5 : 4 + (i % 3) * 2,
              height: miss ? 5 : 8 + (i % 3) * 3,
              background: miss ? "#e0f2fe" : i % 2 ? "#fde047" : "#fb923c",
              boxShadow: `0 0 8px ${miss ? "#7dd3fc" : skin.glow}`,
              rotate: `${(a * 180) / Math.PI + 90}deg`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(a) * dist,
              y: Math.sin(a) * dist + (miss ? 14 : 6),
              opacity: 0,
              scale: 0.3,
            }}
            transition={{ duration: 0.5 + (i % 3) * 0.08, ease: "easeOut" }}
          />
        );
      })}
      {/* debris shards */}
      {!miss &&
        Array.from({ length: b.kind === "hit" ? 4 : 10 }).map((_, i) => {
          const a = (i * 2.399 + b.id) % (Math.PI * 2);
          const dist = (30 + ((i * 17) % 50)) * big;
          return (
            <motion.span
              key={`s${i}`}
              className="absolute"
              style={{
                width: 7,
                height: 4,
                background: i % 2 ? skin.metal : skin.trim,
                border: "1px solid rgba(0,0,0,.35)",
              }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{
                x: Math.cos(a) * dist,
                y: Math.sin(a) * dist + 30,
                opacity: 0,
                rotate: ((i * 97) % 540) - 270,
              }}
              transition={{ duration: 0.75, ease: "easeOut" }}
            />
          );
        })}
      {/* coins burst out of kills */}
      {Array.from({ length: coinN }).map((_, i) => {
        const dx = (i / coinN - 0.5) * 150 * big;
        return (
          <motion.span
            key={`c${i}`}
            className="absolute h-4 w-4 rounded-full border border-amber-700"
            style={{
              background: "radial-gradient(circle at 35% 30%, #fff7c2, #fbbf24 55%, #b45309)",
              boxShadow: "0 0 8px rgba(251,191,36,.9)",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
            animate={{
              x: dx,
              y: [0, -70 - (i % 3) * 18, 40],
              opacity: [1, 1, 0],
              scale: [0.5, 1, 0.9],
            }}
            transition={{ duration: 0.95, ease: "easeOut", delay: 0.05 * (i % 4) }}
          />
        );
      })}
      {/* payout pop */}
      {b.credit != null && b.credit > 0 && (
        <motion.span
          className="absolute -translate-x-1/2 text-lg font-black whitespace-nowrap text-amber-200 [text-shadow:0_2px_0_#78350f,0_0_12px_rgba(251,191,36,.9)]"
          initial={{ y: -10, opacity: 0, scale: 0.6 }}
          animate={{ y: -64, opacity: [0, 1, 1, 0], scale: [0.6, 1.25, 1, 1] }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        >
          +₱{b.credit.toFixed(2)}
        </motion.span>
      )}
    </div>
  );
}

export function HitBlasts({ game, blasts }: { game: FishingGameKey; blasts: Blast[] }) {
  const boss = blasts.find((b) => b.kind === "boss");
  return (
    <>
      {boss && (
        <motion.div
          key={`f${boss.id}`}
          className="pointer-events-none absolute inset-0 z-[16] bg-white"
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        />
      )}
      {blasts.map((b) => (
        <Burst key={b.id} b={b} game={game} />
      ))}
    </>
  );
}
