/**
 * Themed rotating turret + projectile / muzzle / splash FX for the fishing arenas.
 * Each game gets its own weapon: claw cannon, dragon-head cannon, shark-jaw gun,
 * kraken launcher, shell-turtle bubble gun and narwhal harpoon.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FishingGameKey } from "./fauna";

export type FireEvent = { id: number; x: number; y: number; fid?: string };

type Props = {
  game: FishingGameKey;
  /** Live mouse aim in arena %, or null. */
  aim: { x: number; y: number } | null;
  firing: boolean;
  /** Bump `id` on every shot; x/y = target in arena %. */
  fire: FireEvent | null;
  /** Live arena-% position of a fish — projectiles home in on it. */
  getPos?: (fid: string) => { x: number; y: number } | null;
  mountX?: number;
  mountY?: number;
};

export type Skin = {
  metal: string;
  metalDark: string;
  trim: string;
  glow: string;
  shot: string;
  ring: string;
  barrel: (p: { metal: string; metalDark: string; trim: string; glow: string }) => ReactNode;
};

const SHOT_MS = 260;

function angleTo(fx: number, fy: number, tx: number, ty: number) {
  return (Math.atan2(tx - fx, fy - ty) * 180) / Math.PI;
}

/* barrels: drawn pointing UP, pivot at (60,82). Muzzle tip near y≈6. */
const Plain = ({ metal, metalDark, trim }: { metal: string; metalDark: string; trim: string }) => (
  <>
    <rect x="48" y="14" width="24" height="64" rx="8" fill={metalDark} />
    <rect x="50" y="14" width="20" height="62" rx="7" fill={metal} />
    <rect x="53" y="16" width="5" height="58" rx="2.5" fill="rgba(255,255,255,.28)" />
    <rect x="46" y="10" width="28" height="9" rx="4" fill={trim} />
  </>
);

export const SKINS: Record<FishingGameKey, Skin> = {
  "crab-cannon": {
    metal: "#f97316",
    metalDark: "#7c2d12",
    trim: "#fed7aa",
    glow: "rgba(251,146,60,.9)",
    shot: "#fde68a",
    ring: "#b45309",
    barrel: (p) => (
      <>
        <Plain {...p} />
        {/* pincer claws at the muzzle */}
        <path
          d="M44 22 C28 18 24 2 38 -2 C34 8 40 14 50 14 Z"
          fill={p.metal}
          stroke={p.metalDark}
          strokeWidth="2.4"
        />
        <path
          d="M76 22 C92 18 96 2 82 -2 C86 8 80 14 70 14 Z"
          fill={p.metal}
          stroke={p.metalDark}
          strokeWidth="2.4"
        />
        <path d="M36 2 L40 8 M84 2 L80 8" stroke={p.trim} strokeWidth="2" />
        {[34, 46, 58].map((y) => (
          <circle key={y} cx="60" cy={y} r="2.4" fill={p.trim} />
        ))}
      </>
    ),
  },
  "dragon-fisher": {
    metal: "#14b8a6",
    metalDark: "#134e4a",
    trim: "#fde047",
    glow: "rgba(250,204,21,.95)",
    shot: "#fb923c",
    ring: "#a16207",
    barrel: (p) => (
      <>
        <Plain {...p} />
        {/* dragon head jaws */}
        <path
          d="M44 20 C38 8 46 -2 60 -2 C74 -2 82 8 76 20 C70 14 50 14 44 20 Z"
          fill={p.metal}
          stroke={p.metalDark}
          strokeWidth="2.4"
        />
        <path
          d="M46 8 L38 -6 L52 4 M74 8 L82 -6 L68 4"
          fill={p.trim}
          stroke={p.metalDark}
          strokeWidth="1.6"
        />
        <path
          d="M50 14 L52 20 L55 14 M65 14 L68 20 L70 14"
          fill="#fff"
          stroke={p.metalDark}
          strokeWidth="1"
        />
        <path
          d="M44 14 C32 12 26 18 20 12 M76 14 C88 12 94 18 100 12"
          stroke={p.trim}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="52" cy="6" r="2.6" fill="#fde047" />
        <circle cx="68" cy="6" r="2.6" fill="#fde047" />
        <path
          d="M54 50 q6 -6 12 0 q-6 6 -12 0 M54 36 q6 -6 12 0 q-6 6 -12 0"
          stroke={p.trim}
          strokeWidth="1.6"
          fill="none"
        />
      </>
    ),
  },
  "shark-hunter": {
    metal: "#64748b",
    metalDark: "#0f172a",
    trim: "#e2e8f0",
    glow: "rgba(96,165,250,.9)",
    shot: "#e0f2fe",
    ring: "#1e3a8a",
    barrel: (p) => (
      <>
        <rect x="46" y="22" width="28" height="56" rx="9" fill={p.metalDark} />
        <rect x="48" y="22" width="24" height="54" rx="8" fill={p.metal} />
        <rect x="52" y="24" width="5" height="50" rx="2.5" fill="rgba(255,255,255,.3)" />
        <path d="M60 30 L52 52 L68 52 Z" fill={p.metalDark} opacity=".6" />
        {/* jaws */}
        <path
          d="M42 22 L46 4 L60 14 L74 4 L78 22 Z"
          fill={p.metal}
          stroke={p.metalDark}
          strokeWidth="2.4"
        />
        {[46, 52, 58, 64, 70].map((x) => (
          <path
            key={x}
            d={`M${x - 2} 22 L${x} 14 L${x + 2} 22 Z`}
            fill="#fff"
            stroke={p.metalDark}
            strokeWidth=".8"
          />
        ))}
        <path d="M60 36 L52 56 L60 52 Z" fill="#334155" />
        <circle cx="50" cy="12" r="2.2" fill="#ef4444" />
        <circle cx="70" cy="12" r="2.2" fill="#ef4444" />
      </>
    ),
  },
  "octopus-armada": {
    metal: "#7c3aed",
    metalDark: "#2e1065",
    trim: "#2dd4bf",
    glow: "rgba(167,139,250,.95)",
    shot: "#a78bfa",
    ring: "#4c1d95",
    barrel: (p) => (
      <>
        <Plain {...p} />
        {/* tentacles wrapping the barrel */}
        {[0, 1].map((s) => (
          <path
            key={s}
            d={`M${s ? 74 : 46} 78 C${s ? 92 : 28} 62 ${s ? 52 : 70} 52 ${s ? 80 : 40} 36 C${s ? 62 : 58} 26 ${s ? 84 : 36} 20 ${s ? 76 : 44} 10`}
            stroke={p.metal}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
        ))}
        {[0, 1].map((s) => (
          <path
            key={`d${s}`}
            d={`M${s ? 74 : 46} 78 C${s ? 92 : 28} 62 ${s ? 52 : 70} 52 ${s ? 80 : 40} 36 C${s ? 62 : 58} 26 ${s ? 84 : 36} 20 ${s ? 76 : 44} 10`}
            stroke={p.trim}
            strokeWidth="2"
            strokeDasharray="1 7"
            strokeLinecap="round"
            fill="none"
          />
        ))}
        <ellipse cx="60" cy="14" rx="9" ry="7" fill="#0f172a" />
        <circle cx="60" cy="14" r="4" fill={p.glow} />
      </>
    ),
  },
  "turtle-tide": {
    metal: "#4ade80",
    metalDark: "#14532d",
    trim: "#fde047",
    glow: "rgba(110,231,183,.95)",
    shot: "#ccfbf1",
    ring: "#0f766e",
    barrel: (p) => (
      <>
        {/* turtle head as the barrel */}
        <path d="M44 80 C40 50 46 20 60 6 C74 20 80 50 76 80 Z" fill={p.metalDark} />
        <path d="M47 78 C44 50 49 24 60 10 C71 24 76 50 73 78 Z" fill={p.metal} />
        <rect x="53" y="18" width="5" height="52" rx="2.5" fill="rgba(255,255,255,.3)" />
        <circle cx="52" cy="22" r="3.4" fill="#0f172a" />
        <circle cx="68" cy="22" r="3.4" fill="#0f172a" />
        <circle cx="53" cy="21" r="1.1" fill="#fff" />
        <circle cx="69" cy="21" r="1.1" fill="#fff" />
        <ellipse cx="60" cy="8" rx="6" ry="3.4" fill="#0f172a" />
        <circle cx="60" cy="8" r="2" fill={p.glow} />
        {[38, 52, 66].map((y) => (
          <path
            key={y}
            d={`M52 ${y} q8 -5 16 0`}
            stroke={p.metalDark}
            strokeWidth="1.6"
            fill="none"
            opacity=".6"
          />
        ))}
      </>
    ),
  },
  "whale-war": {
    metal: "#7dd3fc",
    metalDark: "#0c4a6e",
    trim: "#f0f9ff",
    glow: "rgba(186,230,253,.95)",
    shot: "#e0f2fe",
    ring: "#075985",
    barrel: (p) => (
      <>
        <rect x="46" y="30" width="28" height="48" rx="9" fill={p.metalDark} />
        <rect x="48" y="30" width="24" height="46" rx="8" fill={p.metal} />
        <rect x="52" y="32" width="5" height="42" rx="2.5" fill="rgba(255,255,255,.4)" />
        {/* narwhal tusk / harpoon */}
        <path d="M60 -6 L54 32 L66 32 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.6" />
        <path d="M56 22 L64 18 M55.4 28 L65 24 M57 14 L63 10" stroke="#94a3b8" strokeWidth="1.4" />
        <path d="M60 -6 L56 4 L64 4 Z" fill="#38bdf8" />
        <path
          d="M46 44 C34 40 30 52 36 60 C40 54 44 52 48 52 Z M74 44 C86 40 90 52 84 60 C80 54 76 52 72 52 Z"
          fill={p.metal}
          stroke={p.metalDark}
          strokeWidth="1.6"
        />
      </>
    ),
  },
  "deep-bass": {
    metal: "#a3e635",
    metalDark: "#1a2e05",
    trim: "#fef9c3",
    glow: "rgba(190,242,100,.9)",
    shot: "#fef08a",
    ring: "#3f6212",
    barrel: (p) => <Plain {...p} />,
  },
};

type Shot = { id: number; sx: number; sy: number };

export function FishingCannon({
  game,
  aim,
  firing,
  fire,
  getPos,
  mountX = 50,
  mountY = 88,
}: Props) {
  const skin = SKINS[game];
  const [lastAngle, setLastAngle] = useState(0);
  const [liveAngle, setLiveAngle] = useState<number | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const shotEls = useRef(new Map<number, HTMLDivElement>());
  const getPosRef = useRef(getPos);
  const seen = useRef(0);

  useEffect(() => {
    getPosRef.current = getPos;
  }, [getPos]);

  const angle = liveAngle ?? (aim ? angleTo(mountX, mountY, aim.x, aim.y) : lastAngle);

  useEffect(() => {
    if (!fire || fire.id === seen.current) return;
    seen.current = fire.id;
    const id = fire.id;
    const first = angleTo(mountX, mountY, fire.x, fire.y);
    const r0 = (first * Math.PI) / 180;
    const sx = mountX + Math.sin(r0) * 6;
    const sy = mountY - Math.cos(r0) * 7;
    setShots((s) => [...s.slice(-5), { id, sx, sy }]);
    let tx = fire.x;
    let ty = fire.y;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / SHOT_MS);
      const live = fire.fid ? getPosRef.current?.(fire.fid) : null;
      if (live) {
        tx = live.x;
        ty = live.y;
      }
      const x = sx + (tx - sx) * t;
      const y = sy + (ty - sy) * t;
      const rot = angleTo(sx, sy, tx, ty);
      const el = shotEls.current.get(id);
      if (el) {
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        el.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${0.7 + t * 0.5})`;
        el.style.opacity = t > 0.92 ? String((1 - t) / 0.08) : "1";
      }
      setLiveAngle(angleTo(mountX, mountY, tx, ty));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setLastAngle(angleTo(mountX, mountY, tx, ty));
        setLiveAngle(null);
        setShots((arr) => arr.filter((x2) => x2.id !== id));
        shotEls.current.delete(id);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire, mountX, mountY]);

  const rad = (angle * Math.PI) / 180;

  return (
    <>
      {/* projectiles — home in on the live fish position */}
      {shots.map((s) => (
        <div
          key={s.id}
          ref={(el) => {
            if (el) shotEls.current.set(s.id, el);
          }}
          className="pointer-events-none absolute z-[12]"
          style={{
            left: `${s.sx}%`,
            top: `${s.sy}%`,
            transform: "translate(-50%, -50%) scale(.7)",
          }}
        >
          <div
            className="h-9 w-3.5 rounded-full"
            style={{
              background: `linear-gradient(180deg, #fff, ${skin.shot} 35%, ${skin.glow})`,
              boxShadow: `0 0 16px 4px ${skin.glow}`,
            }}
          />
          <div
            className="absolute top-full left-1/2 h-16 w-1.5 -translate-x-1/2 rounded-full opacity-60"
            style={{ background: `linear-gradient(180deg, ${skin.glow}, transparent)` }}
          />
        </div>
      ))}

      {/* turret */}
      <div
        className="pointer-events-none absolute z-[11]"
        style={{ left: `${mountX}%`, top: `${mountY}%`, transform: "translate(-50%, -68.3%)" }}
      >
        <svg
          viewBox="0 0 120 120"
          className="h-[8.2rem] w-[8.2rem] overflow-visible sm:h-40 sm:w-40"
          aria-hidden
        >
          <defs>
            <radialGradient id={`fc-${game}-plate`} cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor={skin.metal} />
              <stop offset="70%" stopColor={skin.metalDark} />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>
          <ellipse cx="62" cy="92" rx="40" ry="12" fill="rgba(0,0,0,.45)" />
          {/* glow ring */}
          <circle
            cx="60"
            cy="82"
            r="38"
            fill="none"
            stroke={skin.glow}
            strokeWidth="3"
            opacity={firing ? 0.9 : 0.35}
          >
            {!firing && (
              <animate
                attributeName="opacity"
                values=".18;.5;.18"
                dur="2.6s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          <circle
            cx="60"
            cy="82"
            r="34"
            fill={`url(#fc-${game}-plate)`}
            stroke={skin.ring}
            strokeWidth="3"
          />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={60 + Math.cos(a) * 28}
                cy={82 + Math.sin(a) * 28}
                r="2.2"
                fill={skin.trim}
                opacity=".85"
              />
            );
          })}
          {/* rotating barrel with recoil */}
          <g
            style={{
              transformOrigin: "60px 82px",
              transform: `rotate(${angle}deg) translateY(${firing ? 5 : 0}px)`,
              transition: "transform .09s ease-out",
              filter: firing ? "brightness(1.35)" : undefined,
            }}
          >
            {skin.barrel({
              metal: skin.metal,
              metalDark: skin.metalDark,
              trim: skin.trim,
              glow: skin.glow,
            })}
          </g>
          {/* hub */}
          <circle
            cx="60"
            cy="82"
            r="13"
            fill={skin.metalDark}
            stroke={skin.trim}
            strokeWidth="2.4"
          />
          <circle cx="60" cy="82" r="6" fill={skin.glow} opacity=".9" />
          <circle cx="57" cy="79" r="2.2" fill="#fff" opacity=".8" />
        </svg>
        {/* muzzle flash */}
        <AnimatePresence>
          {firing && (
            <motion.span
              key="mz"
              className={cn("pointer-events-none absolute h-12 w-12 rounded-full")}
              style={{
                left: `calc(50% + ${Math.sin(rad) * 62}px - 1.5rem)`,
                top: `calc(68.3% - ${Math.cos(rad) * 62}px - 1.5rem)`,
                background: `radial-gradient(circle, #fff, ${skin.glow} 45%, transparent 70%)`,
              }}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.12 }}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
