const SOUND_DIR = "/sounds/lucky9";

export type LuckyDropSoundKey = "chip" | "deal" | "win" | "lose";

const FILES: Record<LuckyDropSoundKey, string> = {
  chip: "chip.wav",
  deal: "deal.wav",
  win: "win.wav",
  lose: "lose.wav",
};

let unlocked = false;
const cache = new Map<string, HTMLAudioElement>();

function getAudio(key: LuckyDropSoundKey): HTMLAudioElement | null {
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

export function unlockLuckyDropAudio() {
  if (unlocked) return;
  unlocked = true;
}

export function playLuckyDropSound(key: LuckyDropSoundKey, volume = 0.55) {
  unlockLuckyDropAudio();
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
