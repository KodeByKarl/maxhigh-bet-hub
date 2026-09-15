/**
 * Golden Panther — quiet, ear-safe Web Audio kit.
 * Sine/triangle only, low-pass on every voice, low default volume.
 */

const MUTE_KEY = "golden-panther-muted";
const VOL_KEY = "golden-panther-volume";

const DEFAULT_VOLUME = 0.28;
const AMBIENT_BUS = 0.07;
const SFX_BUS = 0.18;

class GoldenPantherAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private sfxFilter: BiquadFilterNode | null = null;
  private spinGain: GainNode | null = null;

  private spinOsc: OscillatorNode | null = null;
  private padOsc: OscillatorNode[] = [];
  private isAmbientPlaying = false;

  private unlocked = false;
  private muted = false;
  private volume = DEFAULT_VOLUME;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const m = localStorage.getItem(MUTE_KEY);
      const v = localStorage.getItem(VOL_KEY);
      if (m != null) this.muted = m === "1";
      if (v != null) this.volume = Math.max(0, Math.min(0.55, Number(v)));
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
    if (muted) {
      this.stopAmbient();
      this.stopSpinLoop();
    } else if (this.unlocked && !this.isAmbientPlaying) {
      this.startAmbient();
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(0.55, vol));
    try {
      localStorage.setItem(VOL_KEY, String(this.volume));
    } catch {
      /* ignore */
    }
    this.applyMasterGain();
  }

  preload() {
    /* AudioContext waits for a gesture — see setupUnlock. */
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined" || !this.unlocked) return null;
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.ambientGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.sfxFilter = this.ctx.createBiquadFilter();

        this.sfxFilter.type = "lowpass";
        this.sfxFilter.frequency.value = 1400;
        this.sfxFilter.Q.value = 0.55;

        this.ambientGain.connect(this.master);
        this.sfxGain.connect(this.sfxFilter);
        this.sfxFilter.connect(this.master);
        this.master.connect(this.ctx.destination);

        this.ambientGain.gain.value = AMBIENT_BUS;
        this.sfxGain.gain.value = SFX_BUS;
        this.applyMasterGain();
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => undefined);
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private applyMasterGain() {
    if (!this.master || !this.ctx) return;
    const g = this.muted ? 0 : this.volume;
    this.master.gain.setTargetAtTime(g, this.ctx.currentTime, 0.04);
  }

  private setupUnlock() {
    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      const ctx = this.ensureCtx();
      if (ctx?.state === "suspended") {
        void ctx.resume().catch(() => undefined);
      }
      if (!this.muted) this.startAmbient();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
  }

  private tone(
    dest: AudioNode,
    {
      freq,
      endFreq,
      type = "sine",
      peak = 0.08,
      attack = 0.02,
      hold = 0.04,
      release = 0.18,
      at = 0,
    }: {
      freq: number;
      endFreq?: number;
      type?: OscillatorType;
      peak?: number;
      attack?: number;
      hold?: number;
      release?: number;
      at?: number;
    },
  ) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + attack + hold + release);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.setValueAtTime(peak, t + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + attack + hold + release + 0.02);
  }

  /** Soft A-minor pad — no drums, no ticks. */
  startAmbient() {
    if (this.muted || this.isAmbientPlaying || !this.unlocked) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.ambientGain) return;

    this.stopAmbient();
    this.isAmbientPlaying = true;
    const t = ctx.currentTime;
    const freqs = [110, 164.81, 220];

    this.padOsc = freqs.map((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "sine";
      osc.frequency.value = freq;
      filter.type = "lowpass";
      filter.frequency.value = 420;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.045 - i * 0.01, t + 1.4);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain!);
      osc.start(t);
      return osc;
    });
  }

  stopAmbient() {
    this.isAmbientPlaying = false;
    const t = this.ctx?.currentTime ?? 0;
    for (const osc of this.padOsc) {
      try {
        osc.stop(t + 0.2);
        osc.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.padOsc = [];
  }

  startSpinLoop() {
    this.stopSpinLoop();
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(62, t);
    filter.type = "lowpass";
    filter.frequency.value = 280;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.055, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);

    this.spinOsc = osc;
    this.spinGain = gain;
  }

  stopSpinLoop() {
    if (!this.ctx || !this.spinGain || !this.spinOsc) return;
    const t = this.ctx.currentTime;
    try {
      this.spinGain.gain.setValueAtTime(Math.max(0.0001, this.spinGain.gain.value), t);
      this.spinGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      const osc = this.spinOsc;
      const gain = this.spinGain;
      window.setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        } catch {
          /* ignore */
        }
      }, 120);
    } catch {
      /* ignore */
    }
    this.spinOsc = null;
    this.spinGain = null;
  }

  playUiClick() {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;
    this.tone(this.sfxGain, { freq: 320, endFreq: 210, peak: 0.05, attack: 0.008, hold: 0.02, release: 0.08 });
  }

  playReelStop(reelIndex: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;
    const freq = 96 + reelIndex * 8;
    this.tone(this.sfxGain, {
      freq,
      endFreq: 48,
      peak: 0.07,
      attack: 0.01,
      hold: 0.03,
      release: 0.12,
    });
  }

  playCascadeTick() {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;
    this.tone(this.sfxGain, {
      freq: 430,
      endFreq: 260,
      peak: 0.045,
      attack: 0.01,
      hold: 0.02,
      release: 0.1,
    });
  }

  playWin(amount: number, bet: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted || amount <= 0 || bet <= 0) return;

    const mult = amount / bet;
    let notes = [196];
    if (mult >= 20) notes = [196, 246.94, 293.66];
    else if (mult >= 5) notes = [196, 246.94];

    notes.forEach((freq, idx) => {
      this.tone(this.sfxGain!, {
        freq,
        type: "sine",
        peak: 0.06,
        attack: 0.03,
        hold: 0.06,
        release: 0.28,
        at: idx * 0.09,
      });
    });
  }

  playScatterTrigger() {
    this.stopSpinLoop();
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain || this.muted) return;

    [261.63, 329.63, 392].forEach((freq, i) => {
      this.tone(this.sfxGain!, {
        freq,
        type: "sine",
        peak: 0.065,
        attack: 0.04,
        hold: 0.08,
        release: 0.42,
        at: 0.06 + i * 0.11,
      });
    });
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

export const pantherAudio = new GoldenPantherAudio();
