/**
 * Royal Climb sound kit — synthesized for this game (see /sounds/royal-climb).
 * Climb chimes ascend a pentatonic scale, so a long streak sounds like a melody.
 */
const SOUND_DIR = "/sounds/gentle-v1/lucky-drop";

export type LuckyDropSoundKey =
  "chip" | "flip" | "start" | "skip" | "bust" | "cashout" | "summit" | "tick";

const CLIMB_COUNT = 10;

let unlocked = false;
const cache = new Map<string, HTMLAudioElement>();

function load(file: string): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const src = `${SOUND_DIR}/${file}`;
  let a = cache.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    cache.set(src, a);
  }
  return a;
}

function play(file: string, volume: number) {
  const base = load(file);
  if (!base) return;
  try {
    // Clone so rapid / overlapping effects never cut each other off.
    const a = base.cloneNode(true) as HTMLAudioElement;
    a.volume = Math.min(1, Math.max(0, volume));
    void a.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/** Warm the cache so the first effects do not lag. */
export function unlockLuckyDropAudio() {
  if (unlocked) return;
  unlocked = true;
  for (const f of ["flip", "chip", "start", "skip", "bust", "cashout", "summit", "tick"]) {
    load(`${f}.wav`);
  }
  for (let i = 1; i <= CLIMB_COUNT; i++) load(`climb${i}.wav`);
}

export function playLuckyDropSound(key: LuckyDropSoundKey, volume = 0.6) {
  unlockLuckyDropAudio();
  play(`${key}.wav`, volume);
}

/** Rung chime — step 1 is the lowest note, each rung climbs higher. */
export function playClimbChime(step: number, volume = 0.65) {
  unlockLuckyDropAudio();
  const n = Math.min(CLIMB_COUNT, Math.max(1, step));
  play(`climb${n}.wav`, volume);
}
