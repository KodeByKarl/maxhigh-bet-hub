/**
 * Chinese New Year — Web Audio Sound Engine & Traditional Festive Synthesizer.
 * Synthesizes pentatonic Guzheng notes, temple gongs, festive drums, and firecracker pops.
 */

const MUTE_KEY = "chinese-new-year-muted";
const VOL_KEY = "chinese-new-year-volume";

class ChineseNewYearAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private spinGain: GainNode | null = null;

  private spinOsc: OscillatorNode | null = null;
  private ambientInterval: number | null = null;
  private isAmbientPlaying = false;

  private unlocked = false;
  private muted = false;
  private volume = 0.75;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const m = localStorage.getItem(MUTE_KEY);
      const v = localStorage.getItem(VOL_KEY);
      if (m != null) this.muted = m === "1";
      if (v != null) this.volume = Math.max(0, Math.min(1, Number(v)));
    } catch {
      /* ignore */
    }
    this.setupUnlock();
  }

  get isMuted() {
    return this.muted;
  }

  get masterVolume() {
    return this.volume;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    this.applyMasterGain();
    if (!muted && !this.isAmbientPlaying) {
      this.startAmbient();
    } else if (muted) {
      this.stopAmbient();
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem(VOL_KEY, String(this.volume));
    } catch {
      /* ignore */
    }
    this.applyMasterGain();
  }

  preload() {
    if (!this.ctx) this.ensureCtx();
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.ambientGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.ambientGain.connect(this.master);
        this.sfxGain.connect(this.master);
        this.master.connect(this.ctx.destination);

        this.ambientGain.gain.value = 0.35;
        this.sfxGain.gain.value = 0.85;
        this.applyMasterGain();
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private applyMasterGain() {
    if (!this.master || !this.ctx) return;
    const g = this.muted ? 0 : this.volume;
    this.master.gain.setTargetAtTime(g, this.ctx.currentTime, 0.03);
  }

  private setupUnlock() {
    const unlock = () => {
      if (this.unlocked) return;
      const ctx = this.ensureCtx();
      if (ctx?.state === "suspended") void ctx.resume();
      this.unlocked = true;
      if (!this.muted) this.startAmbient();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
  }

  /**
   * Procedural Traditional Chinese Pentatonic Guzheng & Festive Drum Melody.
   */
  startAmbient() {
    if (this.muted || this.isAmbientPlaying) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.ambientGain) return;

    this.isAmbientPlaying = true;
    let step = 0;

    // Chinese Pentatonic Scale (D4, E4, F#4, A4, B4, D5)
    const pentatonicScale = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33];

    const playPulse = () => {
      if (!this.isAmbientPlaying || !this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      // Festive Chinese Bass Drum (Tanggu) every 4 steps
      if (step % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.22);

        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.ambientGain!);
        osc.start(t);
        osc.stop(t + 0.28);
      }

      // Guzheng Pluck every 2 steps
      if (step % 2 === 0) {
        const freq = pentatonicScale[(step + Math.floor(step / 3)) % pentatonicScale.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.ambientGain!);
        osc.start(t);
        osc.stop(t + 0.5);
      }

      // Temple Gong Strike every 16 steps
      if (step % 16 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(180, t);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

        osc.connect(gain);
        gain.connect(this.ambientGain!);
        osc.start(t);
        osc.stop(t + 1.6);
      }

      step = (step + 1) % 32;
    };

    playPulse();
    this.ambientInterval = window.setInterval(playPulse, 260);
  }

  stopAmbient() {
    this.isAmbientPlaying = false;
    if (this.ambientInterval != null) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  startSpinLoop() {
    this.stopSpinLoop();
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(140, t + 0.5);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);

    this.spinOsc = osc;
    this.spinGain = gain;
  }

  stopSpinLoop() {
    if (!this.ctx || !this.spinGain || !this.spinOsc) return;
    const t = this.ctx.currentTime;
    try {
      this.spinGain.gain.setValueAtTime(this.spinGain.gain.value, t);
      this.spinGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      setTimeout(() => {
        try {
          this.spinOsc?.stop();
          this.spinOsc?.disconnect();
        } catch {
          /* ignore */
        }
        this.spinOsc = null;
        this.spinGain = null;
      }, 90);
    } catch {
      this.spinOsc = null;
      this.spinGain = null;
    }
  }

  playReelStop(reelIndex: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;

    const t = ctx.currentTime;
    const freq = 150 + reelIndex * 25;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  playCascadeTick() {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(580 + Math.random() * 250, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  playWin(amount: number, bet: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted || amount <= 0 || bet <= 0) return;

    const mult = amount / bet;
    const t = ctx.currentTime;

    const notes =
      mult >= 20
        ? [293.66, 369.99, 440.0, 587.33, 739.99]
        : mult >= 5
          ? [293.66, 369.99, 440.0]
          : [293.66, 369.99];

    notes.forEach((freq, idx) => {
      const startTime = t + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(startTime);
      osc.stop(startTime + 0.38);
    });
  }

  /** Firecracker Pop + Dragon Gong Trigger */
  playScatterTrigger() {
    this.stopSpinLoop();
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;

    const t = ctx.currentTime;

    // Firecracker Pop Crackle
    for (let i = 0; i < 5; i++) {
      const popTime = t + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(800 + Math.random() * 600, popTime);
      osc.frequency.exponentialRampToValueAtTime(100, popTime + 0.05);

      gain.gain.setValueAtTime(0.35, popTime);
      gain.gain.exponentialRampToValueAtTime(0.001, popTime + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(popTime);
      osc.stop(popTime + 0.07);
    }

    // Dragon Gong Stinger
    const gongOsc = ctx.createOscillator();
    const gongGain = ctx.createGain();

    gongOsc.type = "sine";
    gongOsc.frequency.setValueAtTime(220, t + 0.3);

    gongGain.gain.setValueAtTime(0.001, t + 0.3);
    gongGain.gain.linearRampToValueAtTime(0.45, t + 0.35);
    gongGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    gongOsc.connect(gongGain);
    gongGain.connect(this.sfxGain);
    gongOsc.start(t + 0.3);
    gongOsc.stop(t + 1.25);
  }

  playFreespinIntro() {
    this.playScatterTrigger();
  }

  endFreespins() {
    if (!this.muted && !this.isAmbientPlaying) {
      this.startAmbient();
    }
  }
}

export const chineseAudio = new ChineseNewYearAudio();
