/**
 * Deep Bass SFX. Assets: public/sounds/deep-bass/*.wav
 * Supports overlapping playback (rapid cannon fire).
 */
import { DEEP_BASS_ASSET } from "./animationConfig";

export type DeepBassSoundKey =
  | "shotFire"
  | "splash"
  | "hit"
  | "superHit"
  | "fishDeathSmall"
  | "fishDeathLarge"
  | "bossRoar"
  | "bossDeath"
  | "coinPayout"
  | "crateDrop"
  | "weaponSwitch"
  | "freeze"
  | "netBomb"
  | "uiClick";

const FILES: Record<DeepBassSoundKey, string> = {
  shotFire: "shot-fire.wav",
  splash: "splash.wav",
  hit: "hit.wav",
  superHit: "super-hit.wav",
  fishDeathSmall: "fish-death-small.wav",
  fishDeathLarge: "fish-death-large.wav",
  bossRoar: "boss-roar.wav",
  bossDeath: "boss-death.wav",
  coinPayout: "coin-payout.wav",
  crateDrop: "crate-drop.wav",
  weaponSwitch: "weapon-switch.wav",
  freeze: "freeze.wav",
  netBomb: "net-bomb.wav",
  uiClick: "ui-click.wav",
};

const DEFAULT_VOL: Partial<Record<DeepBassSoundKey, number>> = {
  shotFire: 0.55,
  splash: 0.42,
  hit: 0.62,
  superHit: 0.7,
  fishDeathSmall: 0.62,
  fishDeathLarge: 0.72,
  bossRoar: 0.78,
  bossDeath: 0.85,
  coinPayout: 0.68,
  crateDrop: 0.64,
  weaponSwitch: 0.4,
  freeze: 0.58,
  netBomb: 0.7,
  uiClick: 0.35,
};

let muted = false;
let unlocked = false;
const templates = new Map<string, HTMLAudioElement>();

function templateFor(key: DeepBassSoundKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const src = `${DEEP_BASS_ASSET.soundDir}/${FILES[key]}`;
  let el = templates.get(src);
  if (!el) {
    el = new Audio(src);
    el.preload = "auto";
    templates.set(src, el);
  }
  return el;
}

export function unlockDeepBassAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    for (const key of Object.keys(FILES) as DeepBassSoundKey[]) {
      const el = templateFor(key);
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

export function setDeepBassMuted(v: boolean) {
  muted = v;
}

export function isDeepBassMuted() {
  return muted;
}

/** Play SFX; clones so rapid shots overlap cleanly. */
export function playDeepBassSound(key: DeepBassSoundKey, vol?: number) {
  if (muted) return;
  const template = templateFor(key);
  if (!template) return;
  try {
    const el = template.cloneNode(true) as HTMLAudioElement;
    el.volume = Math.max(0, Math.min(1, vol ?? DEFAULT_VOL[key] ?? 0.55));
    void el.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}
