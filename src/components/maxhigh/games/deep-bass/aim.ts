/**
 * Shared aim / tracking math for Deep Bass auto-fire + bullets.
 */
import { pathAmpFor } from "./animationConfig";
import type { ArenaFish } from "./types";

export type AimPoint = { x: number; y: number };

export const CANNON_MOUNT: AimPoint = { x: 50, y: 88 };

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function dist2(a: AimPoint, b: AimPoint) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Cheap swim-progress estimate (no layout reads). */
export function estimateFishAim(f: ArenaFish, leadMs = 0): AimPoint {
  const frozen = f.frozenUntil > Date.now();
  const start = f.fromLeft ? -12 : 112;
  const end = f.fromLeft ? 112 : -12;
  const mid = f.fromLeft ? 48 : 52;
  const pathAmp = pathAmpFor(f.path);

  let t = clamp((Date.now() - f.createdAt) / f.speedMs, 0, 1);
  if (leadMs > 0 && !frozen) {
    t = clamp(t + leadMs / f.speedMs, 0, 1);
  }

  const x = frozen ? mid : start + (end - start) * t;
  const yMid = clamp(f.y + pathAmp, 10, 86);
  const yEnd = clamp(f.y + pathAmp * 0.35, 10, 86);
  const y =
    t < 0.5
      ? f.y + (yMid - f.y) * (t * 2)
      : yMid + (yEnd - yMid) * ((t - 0.5) * 2);

  return { x: clamp(x, 2, 98), y: clamp(y, 8, 82) };
}

export function leadFishAim(live: AimPoint, f: ArenaFish, leadMs: number): AimPoint {
  if (leadMs <= 0 || f.frozenUntil > Date.now()) return live;
  const start = f.fromLeft ? -12 : 112;
  const end = f.fromLeft ? 112 : -12;
  const vx = (end - start) / f.speedMs;
  return {
    x: clamp(live.x + vx * leadMs, 2, 98),
    y: live.y,
  };
}

export function isOnScreen(p: AimPoint) {
  return p.x >= 4 && p.x <= 96 && p.y >= 6 && p.y <= 84;
}
