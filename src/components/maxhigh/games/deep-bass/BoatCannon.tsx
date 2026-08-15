/**
 * Top-down boat cannon + bullet / impact FX (fish-table camera).
 */
import { AnimatePresence, motion } from "framer-motion";
import { DEEP_BASS_ASSET, TIMING } from "./animationConfig";
import { cn } from "@/lib/utils";

export type CannonShot = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type CannonImpact = {
  id: string;
  x: number;
  y: number;
  /** true = connected with fish */
  hit: boolean;
};

type Props = {
  aim: { x: number; y: number } | null;
  firing: boolean;
  shots: CannonShot[];
  impacts: CannonImpact[];
  onShotDone: (id: string) => void;
  onImpactDone: (id: string) => void;
  mountX?: number;
  mountY?: number;
};

const SHOT_SEC = TIMING.shotTravelMs / 1000;

export function aimAngleDeg(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  return (Math.atan2(toX - fromX, fromY - toY) * 180) / Math.PI;
}

export function BoatCannon({
  aim,
  firing,
  shots,
  impacts,
  onShotDone,
  onImpactDone,
  mountX = 50,
  mountY = 88,
}: Props) {
  const look = aim ?? { x: mountX, y: mountY - 35 };
  const angle = aimAngleDeg(mountX, mountY, look.x, look.y);
  const rad = (angle * Math.PI) / 180;

  return (
    <>
      <AnimatePresence>
        {shots.map((s) => {
          const rot = aimAngleDeg(s.fromX, s.fromY, s.toX, s.toY);
          return (
            <motion.div
              key={s.id}
              className="pointer-events-none absolute z-[12] -translate-x-1/2 -translate-y-1/2"
              initial={{ left: `${s.fromX}%`, top: `${s.fromY}%`, opacity: 1, scale: 0.75 }}
              animate={{ left: `${s.toX}%`, top: `${s.toY}%`, opacity: 1, scale: 1.1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: SHOT_SEC, ease: "linear" }}
              onAnimationComplete={() => onShotDone(s.id)}
              style={{ rotate: `${rot}deg` }}
            >
              <img
                src={DEEP_BASS_ASSET.bullet}
                alt=""
                draggable={false}
                className="h-12 w-12 object-contain mix-blend-screen drop-shadow-[0_0_10px_rgba(251,191,36,0.9)] sm:h-14 sm:w-14"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {impacts.map((imp) => (
          <motion.div
            key={imp.id}
            className="pointer-events-none absolute z-[14] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${imp.x}%`, top: `${imp.y}%` }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: imp.hit ? 1.2 : 0.95 }}
            exit={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onAnimationComplete={() => onImpactDone(imp.id)}
          >
            <img
              src={DEEP_BASS_ASSET.muzzle}
              alt=""
              draggable={false}
              className={cn(
                "object-contain mix-blend-screen",
                imp.hit ? "h-20 w-20 sm:h-24 sm:w-24" : "h-14 w-14 opacity-75",
              )}
            />
            {imp.hit ? (
              <span className="absolute inset-0 animate-ping rounded-full border border-amber-300/70" />
            ) : null}
            <span
              className={cn(
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black drop-shadow",
                imp.hit
                  ? "text-xs text-amber-200"
                  : "text-[10px] text-sky-200/90",
              )}
            >
              {imp.hit ? "HIT!" : "splash"}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {firing ? (
          <motion.div
            key="muzzle"
            className="pointer-events-none absolute z-[13] -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${mountX + Math.sin(rad) * 10}%`,
              top: `${mountY - Math.cos(rad) * 10}%`,
            }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: TIMING.muzzleMs / 1000 }}
          >
            <img
              src={DEEP_BASS_ASSET.muzzle}
              alt=""
              draggable={false}
              className="h-16 w-16 object-contain mix-blend-screen sm:h-20 sm:w-20"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className="pointer-events-none absolute z-[11] -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${mountX}%`, top: `${mountY}%` }}
      >
        <motion.div
          className={cn("relative will-change-transform", firing && "brightness-125")}
          animate={{
            rotate: angle,
            scale: firing ? 0.94 : 1,
            x: firing ? Math.sin(rad) * -4 : 0,
            y: firing ? Math.cos(rad) * 4 : 0,
          }}
          transition={{ type: "tween", duration: 0.08, ease: "easeOut" }}
        >
          <img
            src={DEEP_BASS_ASSET.cannon}
            alt="Cannon"
            draggable={false}
            className="h-36 w-36 object-contain mix-blend-screen drop-shadow-[0_14px_28px_rgba(0,0,0,0.75)] sm:h-44 sm:w-44"
          />
        </motion.div>
      </div>
    </>
  );
}
