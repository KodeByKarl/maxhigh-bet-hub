/**
 * Baccarat SFX. Assets: public/sounds/baccarat/*.wav
 */
import { BC_ASSET } from "./animationConfig";

export type BaccaratSoundKey =
  | "chip"
  | "deal"
  | "flip"
  | "win"
  | "tie"
  | "commission"
  | "bigWin";

const FILES: Record<BaccaratSoundKey, string> = {
  chip: "chip.wav",
  deal: "deal.wav",
  flip: "flip.wav",
  win: "win.wav",
  tie: "tie.wav",
  commission: "commission.wav",
  bigWin: "big-win.wav",
};

const DEFAULT_VOL: Partial<Record<BaccaratSoundKey, number>> = {
  chip: 0.62,
  deal: 0.48,
  flip: 0.58,
  win: 0.7,
  bigWin: 0.78,
  tie: 0.55,
  commission: 0.5,
};

let muted = false;
let unlocked = false;
const cache = new Map<string, HTMLAudioElement>();

function getAudio(key: BaccaratSoundKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const src = `${BC_ASSET.soundDir}/${FILES[key]}`;
  let el = cache.get(src);
  if (!el) {
    el = new Audio(src);
    el.preload = "auto";
    cache.set(src, el);
  }
  return el;
}

export function unlockBaccaratAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    for (const key of Object.keys(FILES) as BaccaratSoundKey[]) {
      const el = getAudio(key);
      if (!el) continue;
      el.volume = 0.001;
      void el
        .play()
        .then(() => {
          el.pause();
          el.currentTime = 0;
        })
        .catch(() => undefined);
    }
  } catch {
    /* ignore */
  }
}

export function setBaccaratMuted(v: boolean) {
  muted = v;
}

export function playBaccaratSound(key: BaccaratSoundKey, volume?: number) {
  if (muted) return;
  unlockBaccaratAudio();
  try {
    const el = getAudio(key);
    if (!el) return;
    const vol = volume ?? DEFAULT_VOL[key] ?? 0.55;
    el.volume = Math.max(0, Math.min(1, vol));
    el.currentTime = 0;
    void el.play().catch(() => {
      /* missing file / autoplay */
    });
  } catch {
    /* ignore */
  }
}
