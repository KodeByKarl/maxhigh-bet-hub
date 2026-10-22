import { ANIM } from "./animationConfig";

/** Initial reel drop — column + row stagger headroom for this board. */
export function getDropWaitMs(cols: number, rows: number) {
  return ANIM.dropDuration + cols * ANIM.dropStaggerCol + rows * ANIM.dropStaggerRow;
}

/** Gravity refill after a tumble pop. */
export function getRefillWaitMs(cols: number) {
  return ANIM.refillDuration + cols * ANIM.fallStaggerCol + ANIM.fallStaggerRow * 2;
}

/** Pop animation — capped stagger for large clusters. */
export function getPopWaitMs(winningCount: number) {
  return ANIM.popDuration + Math.min(winningCount, 12) * ANIM.popStagger;
}

/** Turbo scales waits by phase instead of flattening everything. */
export function scaleWaitMs(ms: number, turbo: boolean) {
  if (!turbo) return ms;
  if (ms >= ANIM.glowDuration) return Math.max(90, Math.round(ms * 0.3));
  if (ms >= ANIM.popDuration) return Math.max(70, Math.round(ms * 0.4));
  if (ms >= ANIM.refillDuration) return Math.max(80, Math.round(ms * 0.45));
  return Math.min(ms, 100);
}

export function getAutoSpinGapMs(turbo: boolean, fast = false) {
  if (fast) return ANIM.autoSpinGapFast;
  return turbo ? ANIM.autoSpinGapTurbo : ANIM.autoSpinGapNormal;
}
