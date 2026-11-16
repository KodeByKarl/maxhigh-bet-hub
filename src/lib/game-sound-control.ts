/**
 * Platform-wide game sound control (client). Installed once; applies the Super Admin's general sound setting to every game
 * without touching each game's own audio code:
 *
 *  - HTMLMediaElement sources (new Audio(...), clone nodes): the `volume` setter is wrapped so the game's requested volume
 *    is multiplied by the platform gain (capped at 1.0). The getter still returns what the game asked for, so games that
 *    compare or clamp volumes behave exactly as before.
 *  - Web Audio sources: `AudioContext.destination` resolves to one master GainNode per context that feeds the real output.
 *
 * While no setting has ever been saved the gain is 1 and nothing is altered. Browser autoplay/mobile unlock rules are left
 * untouched: contexts and elements still start only after the games' own user-gesture unlock.
 */
import {
  DEFAULT_GAME_SOUND_SETTING,
  gameSoundGain,
  normalizeGameSoundSetting,
  type GameSoundSetting,
} from "./game-sound-settings";

let setting: GameSoundSetting = DEFAULT_GAME_SOUND_SETTING;
let installed = false;
const requested = new WeakMap<HTMLMediaElement, number>();
const liveElements = new Set<WeakRef<HTMLMediaElement>>();
const masters = new WeakMap<object, GainNode>();
const liveMasters = new Set<WeakRef<GainNode>>();
const listeners = new Set<(s: GameSoundSetting) => void>();

export function getGameSoundSetting(): GameSoundSetting {
  return setting;
}

export function subscribeGameSound(fn: (s: GameSoundSetting) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function applyToElement(el: HTMLMediaElement, desc: PropertyDescriptor) {
  const want = requested.get(el);
  if (want === undefined) return;
  try {
    desc.set?.call(el, Math.min(1, want * gameSoundGain(setting)));
  } catch {
    /* element not ready */
  }
}

export function setGameSoundSetting(next: unknown): void {
  setting = normalizeGameSoundSetting(next);
  const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
  const gain = gameSoundGain(setting);
  for (const ref of liveElements) {
    const el = ref.deref();
    if (!el) liveElements.delete(ref);
    else if (desc) applyToElement(el, desc);
  }
  for (const ref of liveMasters) {
    const node = ref.deref();
    if (!node) liveMasters.delete(ref);
    else node.gain.setTargetAtTime(gain, node.context.currentTime, 0.03);
  }
  for (const fn of listeners) fn(setting);
}

export function installGameSoundControl(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
  if (desc?.get && desc.set && desc.configurable) {
    const nativeGet = desc.get;
    Object.defineProperty(HTMLMediaElement.prototype, "volume", {
      configurable: true,
      enumerable: desc.enumerable,
      get(this: HTMLMediaElement) {
        return requested.get(this) ?? nativeGet.call(this);
      },
      set(this: HTMLMediaElement, v: number) {
        const n = Number(v);
        if (!Number.isFinite(n)) return desc.set!.call(this, v); // let the browser raise its normal error
        if (!requested.has(this)) liveElements.add(new WeakRef(this));
        requested.set(this, n);
        desc.set!.call(this, Math.max(0, Math.min(1, n * gameSoundGain(setting))));
      },
    });
    // Elements that play without ever setting a volume (browser default 1.0) are scaled on first play.
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (!requested.has(this)) {
        requested.set(this, nativeGet.call(this));
        liveElements.add(new WeakRef(this));
        applyToElement(this, desc);
      }
      return nativePlay.call(this);
    };
  }

  const Base = (window as unknown as { BaseAudioContext?: { prototype: object } }).BaseAudioContext;
  const destDesc = Base
    ? Object.getOwnPropertyDescriptor(Base.prototype, "destination")
    : undefined;
  if (Base && destDesc?.get && destDesc.configurable) {
    const nativeDest = destDesc.get;
    Object.defineProperty(Base.prototype, "destination", {
      configurable: true,
      enumerable: destDesc.enumerable,
      get(this: BaseAudioContext) {
        const real = nativeDest.call(this) as AudioDestinationNode;
        let master = masters.get(this);
        if (!master) {
          master = this.createGain();
          master.gain.value = gameSoundGain(setting);
          master.connect(real);
          masters.set(this, master);
          liveMasters.add(new WeakRef(master));
        }
        return master as unknown as AudioDestinationNode;
      },
    });
  }
}
