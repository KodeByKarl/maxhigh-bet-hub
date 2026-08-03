/**
 * Chinese New Year — themed SFX (firecrackers, gongs, pentatonic luck).
 * Assets from scripts/generate-chinese-new-year-sounds.mjs
 */
const BASE = "/sounds/chinese-new-year";

const FILES = {
  spinLoop: `${BASE}/reel-spin-loop.wav`,
  reelStop: `${BASE}/reel-stop.wav`,
  win: `${BASE}/win.wav`,
  dragonFirework: `${BASE}/dragon-firework.wav`,
  dragonBust: `${BASE}/dragon-bust.wav`,
  monkeyTrigger: `${BASE}/monkey-trigger.wav`,
  gambleFlip: `${BASE}/gamble-flip.wav`,
  collect: `${BASE}/collect.wav`,
} as const;

type SfxKey = keyof typeof FILES;

class ChineseNewYearAudio {
  private els: Partial<Record<SfxKey, HTMLAudioElement>> = {};
  private unlocked = false;
  private muted = false;
  private preloaded = false;

  get isMuted() {
    return this.muted;
  }

  preload() {
    if (this.preloaded || typeof Audio === "undefined") return;
    this.preloaded = true;
    try {
      for (const key of Object.keys(FILES) as SfxKey[]) {
        const a = new Audio(FILES[key]);
        a.preload = "auto";
        if (key === "spinLoop") {
          a.loop = true;
          a.volume = 0.38;
        } else if (key === "win" || key === "monkeyTrigger") {
          a.volume = 0.58;
        } else if (key === "dragonFirework" || key === "dragonBust") {
          a.volume = 0.5;
        } else {
          a.volume = 0.48;
        }
        this.els[key] = a;
      }
    } catch {
      /* ignore until gesture */
    }
  }

  unlock() {
    this.unlocked = true;
    this.preload();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.stopSpinLoop();
  }

  private play(key: SfxKey) {
    if (this.muted || !this.unlocked) return;
    this.preload();
    try {
      let a = this.els[key];
      if (!a) {
        a = new Audio(FILES[key]);
        a.volume = 0.5;
        this.els[key] = a;
      }
      a.currentTime = 0;
      void a.play().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }

  startSpinLoop() {
    if (this.muted || !this.unlocked) return;
    this.preload();
    try {
      const a = this.els.spinLoop;
      if (!a) return;
      a.currentTime = 0;
      void a.play().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }

  stopSpinLoop() {
    const a = this.els.spinLoop;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
  }

  stopAmbient() {
    this.stopSpinLoop();
  }

  /** Drum + soft gong when a reel lands. */
  playReelStop() {
    this.stopSpinLoop();
    this.play("reelStop");
  }

  playWin() {
    this.play("win");
  }

  playDragonFirework() {
    this.play("dragonFirework");
  }

  playDragonBust() {
    this.play("dragonBust");
  }

  playMonkeyTrigger() {
    this.play("monkeyTrigger");
  }

  playGambleFlip() {
    this.play("gambleFlip");
  }

  playCollect() {
    this.play("collect");
  }
}

export const chineseAudio = new ChineseNewYearAudio();
