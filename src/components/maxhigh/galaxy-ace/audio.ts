/**
 * Galaxy Ace — spin-only audio (celestial swirl loop + land chime).
 * Procedurally synthesized SFX — no third-party samples.
 */
const BASE = "/sounds/galaxy-ace";

const SPIN_LOOP = `${BASE}/reel-spin-loop.wav`;
const REEL_STOP = `${BASE}/reel-stop.wav`;

class GalaxyAceAudio {
  private spinAudio: HTMLAudioElement | null = null;
  private stopAudio: HTMLAudioElement | null = null;
  private muted = false;
  private preloaded = false;

  get isMuted() {
    return this.muted;
  }

  preload() {
    if (this.preloaded || typeof Audio === "undefined") return;
    this.preloaded = true;
    try {
      this.spinAudio = new Audio(SPIN_LOOP);
      this.spinAudio.preload = "auto";
      this.spinAudio.loop = true;
      this.spinAudio.volume = 0.42;
      this.stopAudio = new Audio(REEL_STOP);
      this.stopAudio.preload = "auto";
      this.stopAudio.volume = 0.5;
    } catch {
      /* ignore until gesture */
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.stopSpinLoop();
  }

  playSpin() {
    if (this.muted) return;
    this.preload();
    try {
      if (!this.spinAudio) {
        this.spinAudio = new Audio(SPIN_LOOP);
        this.spinAudio.loop = true;
        this.spinAudio.volume = 0.42;
      }
      this.spinAudio.currentTime = 0;
      void this.spinAudio.play().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }

  stopSpinLoop() {
    if (this.spinAudio) {
      this.spinAudio.pause();
      this.spinAudio.currentTime = 0;
    }
  }

  playReelStop() {
    if (this.muted) return;
    this.preload();
    this.stopSpinLoop();
    try {
      if (!this.stopAudio) {
        this.stopAudio = new Audio(REEL_STOP);
        this.stopAudio.volume = 0.5;
      }
      this.stopAudio.currentTime = 0;
      void this.stopAudio.play().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }
}

export const galaxyAceAudio = new GalaxyAceAudio();
