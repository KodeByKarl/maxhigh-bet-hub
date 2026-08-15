/**
 * Phoenix Fisher SFX. Assets: public/sounds/phoenix-fisher/*.wav
 */
import { PHOENIX_FISHER_ASSET } from "./animationConfig";

export type PhoenixFisherSoundKey =
  | "shotFire"
  | "splash"
  | "hit"
  | "fishDeathSmall"
  | "fishDeathLarge"
  | "bossRoar"
  | "bossDeath"
  | "coinPayout"
  | "crateDrop";

const FILES: Record<PhoenixFisherSoundKey, string> = {
  shotFire: "shot-fire.wav",
  splash: "splash.wav",
  hit: "hit.wav",
  fishDeathSmall: "fish-death-small.wav",
  fishDeathLarge: "fish-death-large.wav",
  bossRoar: "boss-roar.wav",
  bossDeath: "boss-death.wav",
  coinPayout: "coin-payout.wav",
  crateDrop: "crate-drop.wav",
};

const DEFAULT_VOL: Partial<Record<PhoenixFisherSoundKey, number>> = {
  shotFire: 0.45,
  splash: 0.4,
  hit: 0.55,
  fishDeathSmall: 0.6,
  fishDeathLarge: 0.7,
  bossRoar: 0.75,
  bossDeath: 0.8,
  coinPayout: 0.65,
  crateDrop: 0.62,
};

let muted = false;
let unlocked = false;
const cache = new Map<string, HTMLAudioElement>();

function getAudio(key: PhoenixFisherSoundKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const src = `${PHOENIX_FISHER_ASSET.soundDir}/${FILES[key]}`;
  let el = cache.get(src);
  if (!el) {
    el = new Audio(src);
    el.preload = "auto";
    cache.set(src, el);
  }
  return el;
}

export function unlockPhoenixFisherAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    for (const key of Object.keys(FILES) as PhoenixFisherSoundKey[]) {
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

export function setPhoenixFisherMuted(v: boolean) {
  muted = v;
}

export function playPhoenixFisherSound(key: PhoenixFisherSoundKey, vol?: number) {
  if (muted) return;
  const el = getAudio(key);
  if (!el) return;
  try {
    el.currentTime = 0;
    el.volume = vol ?? DEFAULT_VOL[key] ?? 0.55;
    void el.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}
