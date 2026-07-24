/**
 * Lightweight sound helper for Candy Peak.
 * Reuses preloaded Audio elements to avoid decode/network cost on every spin.
 */
class SoundManager {
  private spinAudio: HTMLAudioElement | null = null;
  private winAudio: HTMLAudioElement | null = null;
  private muted = false;
  private preloaded = false;

  get isMuted() {
    return this.muted;
  }

  /** Warm decode buffers once (safe to call from mount / idle). */
  preload() {
    if (this.preloaded || typeof Audio === "undefined") return;
    this.preloaded = true;
    try {
      this.spinAudio = new Audio("/sounds/slots/spinningslot.wav");
      this.spinAudio.preload = "auto";
      this.spinAudio.loop = true;
      this.spinAudio.volume = 0.35;
      this.winAudio = new Audio("/sounds/slots/winner%20slot.wav");
      this.winAudio.preload = "auto";
      this.winAudio.volume = 0.45;
    } catch {
      /* ignore — audio may be blocked until gesture */
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.stopSpinLoop();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  playSpin() {
    if (this.muted) return;
    this.preload();
    try {
      if (!this.spinAudio) {
        this.spinAudio = new Audio("/sounds/slots/spinningslot.wav");
        this.spinAudio.loop = true;
        this.spinAudio.volume = 0.35;
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

  playWin() {
    if (this.muted) return;
    this.preload();
    try {
      if (!this.winAudio) {
        this.winAudio = new Audio("/sounds/slots/winner%20slot.wav");
        this.winAudio.volume = 0.45;
      }
      this.winAudio.currentTime = 0;
      void this.winAudio.play().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }

  playFreeSpinsTrigger() {
    this.playWin();
  }

  playFreeSpinsRetrigger() {
    this.playWin();
  }
}

export const sounds = new SoundManager();
