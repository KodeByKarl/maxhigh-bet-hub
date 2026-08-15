/** Optional SFX — reuse Lucky 9 stubs when present. */
const SOUND_DIR = "/sounds/lucky9";

export type ColorGameProSoundKey = "chip" | "deal" | "win" | "lose";

const FILES: Record<ColorGameProSoundKey, string> = {
  chip: "chip.wav",
  deal: "deal.wav",
  win: "win.wav",
  lose: "lose.wav",
};

let unlocked = false;
const cache = new Map<string, HTMLAudioElement>();

function getAudio(key: ColorGameProSoundKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const src = `${SOUND_DIR}/${FILES[key]}`;
  let a = cache.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    cache.set(src, a);
  }
  return a;
}

export function unlockColorGameProAudio() {
  if (unlocked) return;
  unlocked = true;
}

export function playColorGameProSound(key: ColorGameProSoundKey, volume = 0.55) {
  unlockColorGameProAudio();
  const a = getAudio(key);
  if (!a) return;
  try {
    a.volume = volume;
    a.currentTime = 0;
    void a.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}
