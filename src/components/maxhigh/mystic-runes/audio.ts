/**
 * Mystic Runes — Web Audio sound design.
 * Egyptian desert-temple mood; overlapping one-shots via AudioBufferSourceNode.
 * Assets: original procedurally synthesized SFX (commercial-safe, no attribution).
 */
const BASE = "/sounds/mystic-runes";

export const MYSTIC_RUNES_SOUND_FILES = {
  reelSpinLoop: `${BASE}/reel-spin-loop.wav`,
  reelStop: `${BASE}/reel-stop.wav`,
  winSmall: `${BASE}/win-small.wav`,
  winMedium: `${BASE}/win-medium.wav`,
  winBig: `${BASE}/win-big.wav`,
  scatterTrigger: `${BASE}/scatter-trigger.wav`,
  freespinIntro: `${BASE}/freespin-intro.wav`,
  cascadeTick: `${BASE}/cascade-tick.wav`,
  ambientLoop: `${BASE}/ambient-loop.wav`,
} as const;

type SoundId = keyof typeof MYSTIC_RUNES_SOUND_FILES;

const MUTE_KEY = "mystic-runes-muted";
const VOL_KEY = "mystic-runes-volume";

type ProgressCb = (loaded: number, total: number) => void;

class MysticRunesAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private buffers = new Map<SoundId, AudioBuffer>();
  private ambientSrc: AudioBufferSourceNode | null = null;
  private spinSrc: AudioBufferSourceNode | null = null;
  private spinGain: GainNode | null = null;
  private unlocked = false;
  private preloadPromise: Promise<void> | null = null;
  private muted = false;
  private volume = 0.75;
  private ambientDesired = 0.28;
  private ambientFadedForFs = false;

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

  get isReady() {
    return this.buffers.size === Object.keys(MYSTIC_RUNES_SOUND_FILES).length;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    this.applyMasterGain();
    if (!muted && this.unlocked) {
      void this.resumeIfNeeded();
      if (!this.ambientSrc) this.startAmbient();
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

  /** Preload all buffers; reports progress 0→total. */
  async preload(onProgress?: ProgressCb): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;
    this.preloadPromise = this.loadAll(onProgress);
    return this.preloadPromise;
  }

  private async loadAll(onProgress?: ProgressCb) {
    const entries = Object.entries(MYSTIC_RUNES_SOUND_FILES) as [SoundId, string][];
    const total = entries.length;
    let loaded = 0;
    onProgress?.(0, total);

    // Decode via OfflineAudioContext so we never touch AudioContext before a gesture.
    const decoder =
      typeof OfflineAudioContext !== "undefined"
        ? new OfflineAudioContext(2, 1, 44100)
        : null;

    await Promise.all(
      entries.map(async ([id, url]) => {
        try {
          const res = await fetch(url, { cache: "force-cache" });
          if (!res.ok) throw new Error(`${url} → ${res.status}`);
          const arr = await res.arrayBuffer();
          if (decoder) {
            const buf = await decoder.decodeAudioData(arr.slice(0));
            this.buffers.set(id, buf);
          } else {
            // Fallback: create suspended context without resume (decode only).
            const ctx = this.ensureCtx({ resume: false });
            if (!ctx) throw new Error("AudioContext unavailable");
            const buf = await ctx.decodeAudioData(arr.slice(0));
            this.buffers.set(id, buf);
          }
        } catch (e) {
          console.warn("[GE audio] failed to load", id, e);
        } finally {
          loaded += 1;
          onProgress?.(loaded, total);
        }
      }),
    );
  }

  private ensureCtx(opts: { resume?: boolean } = {}): AudioContext | null {
    if (typeof window === "undefined") return null;
    const wantResume = opts.resume !== false && this.unlocked;
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
        this.ambientGain.gain.value = this.ambientDesired;
        this.sfxGain.gain.value = 1;
        this.applyMasterGain();
      }
      if (wantResume && this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => undefined);
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private resumeIfNeeded() {
    if (!this.unlocked || !this.ctx) return;
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => undefined);
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
      this.unlocked = true;
      const ctx = this.ensureCtx({ resume: true });
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

  private playBuffer(
    id: SoundId,
    opts: {
      loop?: boolean;
      gain?: number;
      playbackRate?: number;
      dest?: GainNode;
      fadeIn?: number;
    } = {},
  ): { source: AudioBufferSourceNode; gain: GainNode } | null {
    if (!this.unlocked) return null;
    const ctx = this.ensureCtx({ resume: true });
    const buf = this.buffers.get(id);
    if (!ctx || !buf || !this.sfxGain) return null;

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = !!opts.loop;
    source.playbackRate.value = opts.playbackRate ?? 1;

    const gain = ctx.createGain();
    const peak = opts.gain ?? 1;
    if (opts.fadeIn && opts.fadeIn > 0) {
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + opts.fadeIn);
    } else {
      gain.gain.value = peak;
    }

    const dest = opts.dest ?? this.sfxGain;
    source.connect(gain);
    gain.connect(dest);
    try {
      source.start();
    } catch {
      return null;
    }
    return { source, gain };
  }

  /** Soft desert-wind whoosh while symbols drop. */
  startSpinLoop() {
    this.stopSpinLoop();
    const played = this.playBuffer("reelSpinLoop", { loop: true, gain: 0.55, fadeIn: 0.08 });
    if (!played) return;
    this.spinSrc = played.source;
    this.spinGain = played.gain;
    played.source.onended = () => {
      if (this.spinSrc === played.source) {
        this.spinSrc = null;
        this.spinGain = null;
      }
    };
  }

  stopSpinLoop() {
    const ctx = this.ctx;
    if (this.spinGain && ctx) {
      try {
        this.spinGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
      } catch {
        /* ignore */
      }
    }
    const src = this.spinSrc;
    this.spinSrc = null;
    this.spinGain = null;
    if (src) {
      try {
        setTimeout(() => {
          try {
            src.stop();
          } catch {
            /* ignore */
          }
        }, 120);
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Percussive thunk per column stop.
   * Reel 0 lowest → reel 5 highest (musical cascade).
   */
  playReelStop(reelIndex: number) {
    const rate = 0.88 + Math.max(0, Math.min(5, reelIndex)) * 0.055;
    this.playBuffer("reelStop", { gain: 0.7, playbackRate: rate });
  }

  playCascadeTick() {
    // Fresh source each call — never cuts itself off
    this.playBuffer("cascadeTick", { gain: 0.45, playbackRate: 0.95 + Math.random() * 0.1 });
  }

  playWin(amount: number, bet: number) {
    if (amount <= 0 || bet <= 0) return;
    const mult = amount / bet;
    if (mult >= 20) this.playBuffer("winBig", { gain: 0.85 });
    else if (mult >= 5) this.playBuffer("winMedium", { gain: 0.75 });
    else this.playBuffer("winSmall", { gain: 0.65 });
  }

  playScatterTrigger() {
    this.stopSpinLoop();
    this.playBuffer("scatterTrigger", { gain: 0.9 });
  }

  /** Crossfade ambient down, play temple-doors stinger. */
  playFreespinIntro() {
    this.crossfadeAmbient(0.04, 0.55);
    this.ambientFadedForFs = true;
    this.playBuffer("freespinIntro", { gain: 0.95 });
  }

  /** Restore ambient after free spins end. */
  endFreespins() {
    if (this.ambientFadedForFs) {
      this.crossfadeAmbient(this.ambientDesired, 0.9);
      this.ambientFadedForFs = false;
    }
  }

  startAmbient() {
    if (this.muted || this.ambientSrc || !this.unlocked) return;
    const ctx = this.ensureCtx({ resume: true });
    if (!ctx || !this.ambientGain) return;
    const buf = this.buffers.get("ambientLoop");
    if (!buf) return;

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    source.connect(this.ambientGain);
    try {
      source.start();
      this.ambientSrc = source;
      source.onended = () => {
        if (this.ambientSrc === source) this.ambientSrc = null;
      };
    } catch {
      /* ignore */
    }
  }

  stopAmbient() {
    if (!this.ambientSrc) return;
    try {
      this.ambientSrc.stop();
    } catch {
      /* ignore */
    }
    this.ambientSrc = null;
  }

  private crossfadeAmbient(target: number, seconds: number) {
    if (!this.unlocked) return;
    const ctx = this.ensureCtx({ resume: true });
    if (!ctx || !this.ambientGain) return;
    const now = ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setValueAtTime(Math.max(0.0001, this.ambientGain.gain.value), now);
    this.ambientGain.gain.linearRampToValueAtTime(Math.max(0.0001, target), now + seconds);
  }
}

export const mysticRunesAudio = new MysticRunesAudio();
