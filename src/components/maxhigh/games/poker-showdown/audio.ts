/**
 * Poker Showdown SFX. Assets: public/sounds/poker-showdown/*.wav
 */
import { TCP_ASSET } from "./animationConfig";

export type ThreeCardPokerSoundKey =
  | "chip"
  | "deal"
  | "flip"
  | "fold"
  | "play"
  | "qualifyFail"
  | "win"
  | "tie"
  | "bigWin";

const FILES: Record<ThreeCardPokerSoundKey, string> = {
  chip: "chip.wav",
  deal: "deal.wav",
  flip: "flip.wav",
  fold: "fold.wav",
  play: "play.wav",
  qualifyFail: "qualify-fail.wav",
  win: "win.wav",
  tie: "tie.wav",
  bigWin: "big-win.wav",
};

const DEFAULT_VOL: Partial<Record<ThreeCardPokerSoundKey, number>> = {
  chip: 0.62,
  deal: 0.48,
  flip: 0.58,
  fold: 0.55,
  play: 0.6,
  qualifyFail: 0.58,
  win: 0.7,
  bigWin: 0.78,
  tie: 0.55,
};

let muted = false;
let unlocked = false;
const cache = new Map<string, HTMLAudioElement>();

function getAudio(key: ThreeCardPokerSoundKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const src = `${TCP_ASSET.soundDir}/${FILES[key]}`;
  let el = cache.get(src);
  if (!el) {
    el = new Audio(src);
    el.preload = "auto";
    cache.set(src, el);
  }
  return el;
}

export function unlockThreeCardPokerAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    for (const key of Object.keys(FILES) as ThreeCardPokerSoundKey[]) {
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

export function setThreeCardPokerMuted(v: boolean) {
  muted = v;
}

export function playThreeCardPokerSound(key: ThreeCardPokerSoundKey, volume?: number) {
  if (muted) return;
  unlockThreeCardPokerAudio();
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
