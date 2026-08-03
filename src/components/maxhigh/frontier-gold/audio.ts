/**
 * Frontier Gold — western Hold & Win SFX.
 * Assets from scripts/generate-frontier-gold-sounds.mjs
 */
const BASE = "/sounds/frontier-gold";

const FILES = {
  spinLoop: `${BASE}/reel-spin-loop.wav`,
  reelStop: `${BASE}/reel-stop.wav`,
  win: `${BASE}/win.wav`,
  holdWin: `${BASE}/hold-win.wav`,
  coinLand: `${BASE}/coin-land.wav`,
  coinLock: `${BASE}/coin-lock.wav`,
  jackpot: `${BASE}/jackpot.wav`,
  freeSpins: `${BASE}/free-spins.wav`,
  uiClick: `${BASE}/ui-click.wav`,
} as const;

type SfxKey = keyof typeof FILES;

class FrontierGoldAudio {
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
          a.volume = 0.36;
        } else if (key === "jackpot" || key === "holdWin") {
          a.volume = 0.62;
        } else if (key === "win" || key === "freeSpins") {
          a.volume = 0.55;
        } else if (key === "uiClick") {
          a.volume = 0.35;
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

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
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

  playReelStop() {
    this.stopSpinLoop();
    this.play("reelStop");
  }

  playWin() {
    this.play("win");
  }

  playHoldWin() {
    this.play("holdWin");
  }

  playCoinLand() {
    this.play("coinLand");
  }

  playCoinLock() {
    this.play("coinLock");
  }

  playJackpot() {
    this.play("jackpot");
  }

  playFreeSpins() {
    this.play("freeSpins");
  }

  playUiClick() {
    this.play("uiClick");
  }
}

export const frontierAudio = new FrontierGoldAudio();
