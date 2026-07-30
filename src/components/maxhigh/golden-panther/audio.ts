/**
 * Golden Panther — Web Audio Sound Engine & Theme Music Synthesizer.
 * Commercial-safe, procedural Web Audio synthesized sounds and jungle ambient beat.
 */

const MUTE_KEY = "golden-panther-muted";
const VOL_KEY = "golden-panther-volume";

class GoldenPantherAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private spinGain: GainNode | null = null;

  private spinOsc: OscillatorNode | null = null;
  private spinNoiseNode: AudioNode | null = null;
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
    if (!this.muted && !this.isAmbientPlaying) {
      this.startAmbient();
    }
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
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
  }

  /**
   * Procedural Jungle Drums & Mystical Aztec Pad Ambient Theme Music.
   */
  startAmbient() {
    if (this.muted || this.isAmbientPlaying) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.ambientGain) return;

    this.isAmbientPlaying = true;
    let step = 0;

    // Jungle Drum + Aztec Flute Chords
    const chordFreqs = [110, 138.59, 164.81, 220]; // A minor jungle vibe

    const playPulse = () => {
      if (!this.isAmbientPlaying || !this.ctx || this.muted) return;
      const t = this.ctx.currentTime;

      // Deep jungle bass drum every 4 steps
      if (step % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.25);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(gain);
        gain.connect(this.ambientGain!);
        osc.start(t);
        osc.stop(t + 0.35);
      }

      // Jungle bongo / wood block tick
      if (step % 2 === 1) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(280 + (step % 3) * 60, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ambientGain!);
        osc.start(t);
        osc.stop(t + 0.15);
      }

      // Soft ambient flute chord every 8 steps
      if (step % 8 === 0) {
        const root = chordFreqs[(step / 8) % chordFreqs.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(root, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.4);
        gain.gain.linearRampToValueAtTime(0.001, t + 1.2);

        osc.connect(gain);
        gain.connect(this.ambientGain!);
        osc.start(t);
        osc.stop(t + 1.3);
      }

      step = (step + 1) % 32;
    };

    playPulse();
    this.ambientInterval = window.setInterval(playPulse, 280);
  }

  stopAmbient() {
    this.isAmbientPlaying = false;
    if (this.ambientInterval != null) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  /**
   * Sound during reel spinning (low jungle rumble + wind whoosh).
   */
  startSpinLoop() {
    this.stopSpinLoop();
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(120, t + 0.5);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.1);

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

  /**
   * Column stop sound (resonant Aztec drum thunk with rising pitch per reel).
   */
  playReelStop(reelIndex: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;

    const t = ctx.currentTime;
    const freq = 130 + reelIndex * 22; // pitch increases col 0 -> 5

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Cascade tick (crystal pop sound during winning symbol explosion).
   */
  playCascadeTick() {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600 + Math.random() * 200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Win payout sound fanfare (small, medium, big win).
   */
  playWin(amount: number, bet: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted || amount <= 0 || bet <= 0) return;

    const mult = amount / bet;
    const t = ctx.currentTime;

    const notes = mult >= 20 ? [261.63, 329.63, 392.0, 523.25, 659.25] : mult >= 5 ? [261.63, 329.63, 392.0] : [261.63, 329.63];

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

  /**
   * Golden Panther Scatter Trigger Stinger (Roar + Majestic Chimes).
   */
  playScatterTrigger() {
    this.stopSpinLoop();
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;

    const t = ctx.currentTime;

    // Panther Growl / Roar frequency bend
    const roarOsc = ctx.createOscillator();
    const roarGain = ctx.createGain();

    roarOsc.type = "sawtooth";
    roarOsc.frequency.setValueAtTime(140, t);
    roarOsc.frequency.exponentialRampToValueAtTime(60, t + 0.6);

    roarGain.gain.setValueAtTime(0.4, t);
    roarGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    roarOsc.connect(roarGain);
    roarGain.connect(this.sfxGain);
    roarOsc.start(t);
    roarOsc.stop(t + 0.7);

    // Golden Chime Arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      const st = t + 0.1 + i * 0.1;

      chimeOsc.type = "sine";
      chimeOsc.frequency.setValueAtTime(freq, st);

      chimeGain.gain.setValueAtTime(0.001, st);
      chimeGain.gain.linearRampToValueAtTime(0.35, st + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, st + 0.6);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.sfxGain!);
      chimeOsc.start(st);
      chimeOsc.stop(st + 0.65);
    });
  }

  /**
   * Free Spins Intro Fanfare.
   */
  playFreespinIntro() {
    this.playScatterTrigger();
  }

  /**
   * End Free Spins restore ambient.
   */
  endFreespins() {
    if (!this.muted && !this.isAmbientPlaying) {
      this.startAmbient();
    }
  }
}

export const pantherAudio = new GoldenPantherAudio();
