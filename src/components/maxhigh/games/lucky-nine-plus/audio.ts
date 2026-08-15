/**
 * Lucky Nine Plus SFX. Assets: public/sounds/lucky-nine-plus/*.wav
 * (Shared pack — copies of baccarat deal/flip/win plus natural-9).
 */
import { L9_ASSET } from "./animationConfig";

export type LuckyNinePlusSoundKey =
  | "chip"
  | "deal"
  | "flip"
  | "win"
  | "tie"
  | "natural"
  | "bigWin";

const FILES: Record<LuckyNinePlusSoundKey, string> = {
  chip: "chip.wav",
  deal: "deal.wav",
  flip: "flip.wav",
  win: "win.wav",
  tie: "tie.wav",
  natural: "natural-9.wav",
  bigWin: "big-win.wav",
};

const DEFAULT_VOL: Partial<Record<LuckyNinePlusSoundKey, number>> = {
  chip: 0.62,
  deal: 0.48,
  flip: 0.58,
  win: 0.7,
  bigWin: 0.78,
  tie: 0.55,
  natural: 0.72,
};

let muted = false;
let unlocked = false;
const cache = new Map<string, HTMLAudioElement>();

function getAudio(key: LuckyNinePlusSoundKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const src = `${L9_ASSET.soundDir}/${FILES[key]}`;
  let el = cache.get(src);
  if (!el) {
    el = new Audio(src);
    el.preload = "auto";
    cache.set(src, el);
  }
  return el;
}

export function unlockLuckyNinePlusAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    for (const key of Object.keys(FILES) as LuckyNinePlusSoundKey[]) {
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

export function setLuckyNinePlusMuted(v: boolean) {
  muted = v;
}

export function playLuckyNinePlusSound(key: LuckyNinePlusSoundKey, volume?: number) {
  if (muted) return;
  unlockLuckyNinePlusAudio();
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
