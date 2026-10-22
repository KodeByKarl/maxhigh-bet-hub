/**
 * Soft “paid arcade / perya” Web Audio kit for panther-family slots.
 * Every game gets its own instrument, musical scale and spin-loop texture,
 * so the family shares an engine but never sounds the same.
 *
 * Anti-buzz rules: sine partials only, every note decays (no sustained drones),
 * nothing tonal below MIN_NOTE_HZ, textures are filtered noise — not oscillators.
 */

import { createGentleGameAudio } from "@/lib/gentle-game-audio";

export type PeryaInstrument =
  | "bell"
  | "marimba"
  | "kalimba"
  | "musicbox"
  | "koto"
  | "glass"
  | "steelpan"
  | "flute"
  | "gong"
  | "harp"
  | "celesta"
  | "vibes"
  | "pizzicato"
  | "pluck";

export type PeryaSpinStyle =
  | "roulette"
  | "arp"
  | "taiko"
  | "coins"
  | "gallop"
  | "shaker"
  | "harp"
  | "crackle"
  | "wind"
  | "thunder"
  | "chimes"
  | "roll"
  | "rain"
  | "bubbles"
  | "drip"
  | "clock"
  | "flutter";

export type SoftPeryaVoice = {
  /** Stable id for localStorage keys */
  id: string;
  /** Melody root in Hz (≈196–523) */
  root: number;
  /** Scale as semitone offsets from the root */
  scale: readonly number[];
  instrument: PeryaInstrument;
  spin: PeryaSpinStyle;
  /** Rhythm multiplier for spin/ambient (>1 = faster) */
  tempo: number;
  /** SFX low-pass ceiling in Hz */
  brightness: number;
};

export type SoftPeryaAudio = {
  isMuted: boolean;
  masterVolume: number;
  setMuted: (muted: boolean) => void;
  toggleMute: () => boolean;
  setVolume: (vol: number) => void;
  preload: () => void;
  startAmbient: () => void;
  stopAmbient: () => void;
  startSpinLoop: () => void;
  stopSpinLoop: () => void;
  playUiClick: () => void;
  playReelStop: (reelIndex: number) => void;
  playCascadeTick: () => void;
  playWin: (amount: number, bet: number) => void;
  playScatterTrigger: () => void;
  playFreespinIntro: () => void;
  endFreespins: () => void;
};

type Instrument = {
  /** [frequency ratio, gain, decay multiplier] */
  partials: readonly (readonly [number, number, number])[];
  attack: number;
  decay: number;
  octave?: number;
  bend?: number;
  vibrato?: number;
  tremolo?: number;
  breath?: number;
  transient?: number;
};

const INSTRUMENTS: Record<PeryaInstrument, Instrument> = {
  bell: {
    partials: [
      [1, 1, 1],
      [2.76, 0.32, 0.55],
      [5.4, 0.14, 0.35],
      [8.93, 0.05, 0.25],
    ],
    attack: 0.004,
    decay: 1.3,
  },
  marimba: {
    partials: [
      [1, 1, 1],
      [3.99, 0.28, 0.25],
      [9.9, 0.05, 0.12],
    ],
    attack: 0.003,
    decay: 0.5,
    transient: 0.08,
  },
  kalimba: {
    partials: [
      [1, 1, 1],
      [5.95, 0.12, 0.2],
      [2.02, 0.08, 0.5],
    ],
    attack: 0.003,
    decay: 0.75,
    transient: 0.06,
  },
  musicbox: {
    partials: [
      [1, 1, 1],
      [2, 0.28, 0.6],
      [3.01, 0.12, 0.4],
      [4.2, 0.06, 0.3],
    ],
    attack: 0.002,
    decay: 0.95,
    octave: 1,
  },
  koto: {
    partials: [
      [1, 1, 1],
      [2, 0.55, 0.55],
      [3, 0.28, 0.4],
      [4, 0.14, 0.3],
      [5, 0.07, 0.2],
    ],
    attack: 0.002,
    decay: 0.7,
    bend: 0.012,
    transient: 0.05,
  },
  glass: {
    partials: [
      [1, 1, 1],
      [2.32, 0.35, 0.6],
      [4.25, 0.18, 0.4],
      [6.63, 0.07, 0.3],
    ],
    attack: 0.006,
    decay: 1.5,
    octave: 1,
  },
  steelpan: {
    partials: [
      [1, 1, 1],
      [2, 0.6, 0.7],
      [3, 0.22, 0.5],
      [4.07, 0.1, 0.3],
    ],
    attack: 0.006,
    decay: 0.85,
  },
  flute: {
    partials: [
      [1, 1, 1],
      [2, 0.14, 0.8],
      [3, 0.05, 0.6],
    ],
    attack: 0.05,
    decay: 0.55,
    vibrato: 0.007,
    breath: 0.06,
  },
  gong: {
    partials: [
      [1, 1, 1],
      [1.48, 0.3, 0.8],
      [2.41, 0.2, 0.6],
      [3.1, 0.1, 0.5],
    ],
    attack: 0.01,
    decay: 1.7,
  },
  harp: {
    partials: [
      [1, 1, 1],
      [2, 0.42, 0.6],
      [3, 0.2, 0.45],
      [4, 0.1, 0.35],
      [5, 0.05, 0.25],
    ],
    attack: 0.003,
    decay: 1.1,
  },
  celesta: {
    partials: [
      [1, 1, 1],
      [4, 0.3, 0.35],
      [3, 0.08, 0.5],
    ],
    attack: 0.003,
    decay: 0.95,
    octave: 1,
  },
  vibes: {
    partials: [
      [1, 1, 1],
      [4, 0.22, 0.3],
      [10, 0.04, 0.1],
    ],
    attack: 0.004,
    decay: 1.4,
    tremolo: 5.5,
  },
  pizzicato: {
    partials: [
      [1, 1, 1],
      [2, 0.45, 0.5],
      [3, 0.18, 0.35],
    ],
    attack: 0.002,
    decay: 0.32,
    transient: 0.04,
  },
  pluck: {
    partials: [
      [1, 1, 1],
      [2, 0.5, 0.5],
      [3, 0.3, 0.35],
      [4, 0.18, 0.25],
      [6, 0.06, 0.15],
    ],
    attack: 0.002,
    decay: 0.6,
    bend: 0.02,
    transient: 0.06,
  },
};

export const PERYA_SCALES = {
  majorPent: [0, 2, 4, 7, 9],
  minorPent: [0, 3, 5, 7, 10],
  hirajoshi: [0, 2, 3, 7, 8],
  inSen: [0, 1, 5, 7, 10],
  pelog: [0, 1, 3, 7, 8],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  phrygianDom: [0, 1, 4, 5, 7, 8, 10],
  doubleHarmonic: [0, 1, 4, 5, 7, 8, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
} as const;

const DEFAULT_VOLUME = 0.42;
const AMBIENT_BUS = 0.12;
const SFX_BUS = 0.42;
const SPIN_LEVEL = 0.6;
/** Phone speakers turn low tones into buzz — keep every pitched note above this. */
const MIN_NOTE_HZ = 165;
const MAX_NOTE_HZ = 2400;
const MAX_SPIN_SECONDS = 20;

/** Gentle per-game recordings (public/sounds/gentle-v1) replace the old synthesized voices. */
export function createSoftPeryaAudio(voice: SoftPeryaVoice): SoftPeryaAudio {
  return createGentleGameAudio(voice.id);
}

/** Legacy Web Audio synthesis, kept for reference/fallback. */
export function createSynthPeryaAudio(voice: SoftPeryaVoice): SoftPeryaAudio {
  const MUTE_KEY = `${voice.id}-muted`;
  const VOL_KEY = `${voice.id}-volume`;
  const inst = INSTRUMENTS[voice.instrument];
  /** Voices with a low root get their spin melodies lifted an octave. */
  const hi = voice.root < 350 ? 1 : 0;

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let ambientGain: GainNode | null = null;
  let sfxGain: GainNode | null = null;
  let whiteBuf: AudioBuffer | null = null;
  let pinkBuf: AudioBuffer | null = null;

  let spinBus: GainNode | null = null;
  let spinBeds: AudioScheduledSourceNode[] = [];
  let spinTimer: number | null = null;
  let spinStart = 0;
  let spinNext = 0;
  let spinStep = 0;

  let ambientTimer: number | null = null;
  let ambientNext = 0;
  let isAmbientPlaying = false;
  let cascadeStep = 0;

  let unlocked = false;
  let muted = false;
  let volume = DEFAULT_VOLUME;

  if (typeof window !== "undefined") {
    try {
      const m = localStorage.getItem(MUTE_KEY);
      const v = localStorage.getItem(VOL_KEY);
      if (m != null) muted = m === "1";
      if (v != null) volume = Math.max(0, Math.min(0.7, Number(v)));
    } catch {
      /* ignore */
    }
  }

  function applyMasterGain() {
    if (!master || !ctx) return;
    master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05);
  }

  function ensureCtx(): AudioContext | null {
    if (typeof window === "undefined" || !unlocked) return null;
    try {
      if (!ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC();
        master = ctx.createGain();
        ambientGain = ctx.createGain();
        sfxGain = ctx.createGain();
        const sfxFilter = ctx.createBiquadFilter();
        const comp = ctx.createDynamicsCompressor();

        sfxFilter.type = "lowpass";
        sfxFilter.frequency.value = voice.brightness;
        sfxFilter.Q.value = 0.4;
        comp.threshold.value = -14;
        comp.knee.value = 12;
        comp.ratio.value = 3;
        comp.attack.value = 0.005;
        comp.release.value = 0.2;

        sfxGain.connect(sfxFilter);
        sfxFilter.connect(comp);
        ambientGain.connect(comp);
        comp.connect(master);
        master.connect(ctx.destination);

        ambientGain.gain.value = AMBIENT_BUS;
        sfxGain.gain.value = SFX_BUS;
        applyMasterGain();
      }
      if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
      return ctx;
    } catch {
      return null;
    }
  }

  /** Must run inside a user gesture (pointer/key) for mobile autoplay policies. */
  function unlockFromGesture() {
    if (typeof window === "undefined") return;
    unlocked = true;
    const c = ensureCtx();
    if (c?.state === "suspended") void c.resume().catch(() => undefined);
    if (!muted && !isAmbientPlaying) startAmbient();
  }

  function setupUnlock() {
    if (typeof window === "undefined") return;
    const unlock = () => {
      unlockFromGesture();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("touchstart", unlock, { capture: true, passive: true });
    window.addEventListener("keydown", unlock, { capture: true });
  }

  function getWhite(c: AudioContext): AudioBuffer {
    if (whiteBuf && whiteBuf.sampleRate === c.sampleRate) return whiteBuf;
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    whiteBuf = buf;
    return buf;
  }

  function getPink(c: AudioContext): AudioBuffer {
    if (pinkBuf && pinkBuf.sampleRate === c.sampleRate) return pinkBuf;
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.2;
    }
    pinkBuf = buf;
    return buf;
  }

  function degFreq(degree: number, octave = 0): number {
    const s = voice.scale;
    const n = s.length;
    const oct = Math.floor(degree / n);
    const idx = ((degree % n) + n) % n;
    return voice.root * Math.pow(2, (s[idx]! + 12 * (oct + octave)) / 12);
  }

  function clampPitch(f: number): number {
    let out = f;
    while (out < MIN_NOTE_HZ) out *= 2;
    while (out > MAX_NOTE_HZ) out /= 2;
    return out;
  }

  function playNote(
    dest: AudioNode,
    freq: number,
    t: number,
    peak: number,
    decayMul = 1,
    instrument: Instrument = inst,
  ) {
    const c = ctx;
    if (!c) return;
    const f = clampPitch(freq * Math.pow(2, instrument.octave ?? 0));
    const decay = instrument.decay * decayMul;
    const end = t + instrument.attack + decay + 0.05;

    const out = c.createGain();
    out.gain.value = peak;
    if (instrument.tremolo) {
      const trem = c.createGain();
      trem.gain.value = 0.8;
      const lfo = c.createOscillator();
      lfo.frequency.value = instrument.tremolo;
      const depth = c.createGain();
      depth.gain.value = 0.2;
      lfo.connect(depth);
      depth.connect(trem.gain);
      out.connect(trem);
      trem.connect(dest);
      lfo.start(t);
      lfo.stop(end);
    } else {
      out.connect(dest);
    }

    for (const [ratio, gain, decayRatio] of instrument.partials) {
      const pf = f * ratio;
      if (pf > 9000) continue;
      const osc = c.createOscillator();
      osc.type = "sine";
      if (instrument.bend) {
        osc.frequency.setValueAtTime(pf * (1 + instrument.bend), t);
        osc.frequency.exponentialRampToValueAtTime(pf, t + 0.06);
      } else {
        osc.frequency.setValueAtTime(pf, t);
      }
      if (instrument.vibrato && ratio === 1) {
        const vib = c.createOscillator();
        vib.frequency.value = 5.2;
        const vibDepth = c.createGain();
        vibDepth.gain.value = pf * instrument.vibrato;
        vib.connect(vibDepth);
        vibDepth.connect(osc.frequency);
        vib.start(t);
        vib.stop(end);
      }
      const pd = Math.max(0.04, decay * decayRatio);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + instrument.attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + instrument.attack + pd);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + instrument.attack + pd + 0.03);
    }

    if (instrument.transient) {
      noiseBurst(dest, t, {
        type: "highpass",
        freq: 2500,
        peak: peak * instrument.transient * 3,
        dur: 0.012,
      });
    }
    if (instrument.breath) {
      noiseBurst(dest, t, {
        freq: Math.min(4000, f * 2),
        q: 1.2,
        peak: peak * instrument.breath * 3,
        dur: decay * 0.6,
        attack: instrument.attack,
      });
    }
  }

  function noiseBurst(
    dest: AudioNode,
    t: number,
    o: {
      type?: BiquadFilterType;
      freq: number;
      q?: number;
      peak: number;
      dur: number;
      attack?: number;
      pink?: boolean;
    },
  ) {
    const c = ctx;
    if (!c) return;
    const src = c.createBufferSource();
    src.buffer = o.pink ? getPink(c) : getWhite(c);
    src.loop = true;
    const filt = c.createBiquadFilter();
    filt.type = o.type ?? "bandpass";
    filt.frequency.value = o.freq;
    filt.Q.value = o.q ?? 1;
    const g = c.createGain();
    const a = o.attack ?? 0.002;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + a + o.dur + 0.03);
  }

  /** Short sine sweep — droplets, bubbles, coin pings, drum bodies. */
  function blip(dest: AudioNode, t: number, f0: number, f1: number, peak: number, dur: number) {
    const c = ctx;
    if (!c) return;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function noiseBed(
    dest: AudioNode,
    o: {
      type: BiquadFilterType;
      freq: number;
      q?: number;
      gain: number;
      pink?: boolean;
      sweepRate?: number;
      sweepDepth?: number;
      swellRate?: number;
      swellDepth?: number;
    },
  ): AudioScheduledSourceNode[] {
    const c = ctx;
    if (!c) return [];
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = o.pink ? getPink(c) : getWhite(c);
    src.loop = true;
    const filt = c.createBiquadFilter();
    filt.type = o.type;
    filt.frequency.value = o.freq;
    filt.Q.value = o.q ?? 0.7;
    const g = c.createGain();
    g.gain.value = o.gain;
    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 1.5);
    const nodes: AudioScheduledSourceNode[] = [src];
    if (o.sweepRate && o.sweepDepth) {
      const lfo = c.createOscillator();
      lfo.frequency.value = o.sweepRate;
      const depth = c.createGain();
      depth.gain.value = o.sweepDepth;
      lfo.connect(depth);
      depth.connect(filt.frequency);
      lfo.start(t);
      nodes.push(lfo);
    }
    if (o.swellRate && o.swellDepth) {
      const lfo = c.createOscillator();
      lfo.frequency.value = o.swellRate;
      const depth = c.createGain();
      depth.gain.value = o.swellDepth;
      lfo.connect(depth);
      depth.connect(g.gain);
      lfo.start(t);
      nodes.push(lfo);
    }
    return nodes;
  }

  function sparkle(t: number, count: number, peak = 0.06) {
    if (!sfxGain) return;
    for (let i = 0; i < count; i++) {
      playNote(
        sfxGain,
        degFreq(Math.floor(Math.random() * 8), 2),
        t + i * 0.065,
        peak,
        0.6,
        INSTRUMENTS.glass,
      );
    }
  }

  function spinBed(bus: GainNode): AudioScheduledSourceNode[] {
    switch (voice.spin) {
      case "roulette":
        return noiseBed(bus, { type: "bandpass", freq: 900, q: 0.8, gain: 0.25, pink: true });
      case "crackle":
        return noiseBed(bus, {
          type: "bandpass",
          freq: 720,
          q: 0.6,
          gain: 0.3,
          pink: true,
          swellRate: 0.7,
          swellDepth: 0.08,
        });
      case "wind":
        return noiseBed(bus, {
          type: "bandpass",
          freq: 850,
          q: 1.4,
          gain: 0.85,
          pink: true,
          sweepRate: 0.3,
          sweepDepth: 380,
        });
      case "thunder":
        return noiseBed(bus, {
          type: "bandpass",
          freq: 650,
          q: 0.5,
          gain: 0.6,
          pink: true,
          swellRate: 0.45,
          swellDepth: 0.22,
        });
      case "chimes":
        return noiseBed(bus, { type: "highpass", freq: 3500, gain: 0.035 });
      case "rain":
        return noiseBed(bus, { type: "highpass", freq: 2600, gain: 0.05 });
      default:
        return [];
    }
  }

  /** Schedules one spin-loop event at `t`; returns seconds until the next one. */
  function spinEvent(bus: GainNode, t: number, step: number): number {
    const rand = Math.random;
    switch (voice.spin) {
      case "roulette":
        noiseBurst(bus, t, { freq: 2600, q: 5, peak: 0.35, dur: 0.014 });
        return 0.075;
      case "arp": {
        const pat = [0, 2, 4, 7, 5, 3, 4, 1];
        playNote(bus, degFreq(pat[step % 8]!, hi), t, 0.2, 0.45);
        return 0.1;
      }
      case "taiko": {
        const pat = [1, 0, 0.45, 0, 0.85, 0.4, 0, 0.6];
        const v = pat[step % 8]!;
        if (v > 0) {
          blip(bus, t, 280, 170, 0.5 * v, 0.2);
          noiseBurst(bus, t, { type: "lowpass", freq: 1100, peak: 0.22 * v, dur: 0.03 });
        }
        if (step % 16 === 0) playNote(bus, degFreq(0, hi), t, 0.12, 0.6);
        return 0.125;
      }
      case "coins": {
        const n = 2 + (step % 2);
        for (let i = 0; i < n; i++) {
          const f = 2300 + rand() * 1900;
          const at = t + i * 0.018 + rand() * 0.01;
          const p = 0.07 + rand() * 0.05;
          blip(bus, at, f, f * 0.985, p, 0.05);
          blip(bus, at, f * 1.51, f * 1.5, p * 0.5, 0.03);
        }
        if (step % 6 === 0) playNote(bus, degFreq(2 + ((step / 6) % 3), hi), t, 0.1, 0.4);
        return 0.08 + rand() * 0.06;
      }
      case "gallop": {
        const k = step % 3;
        noiseBurst(bus, t, { freq: 650, q: 1.1, peak: k === 0 ? 0.45 : 0.32, dur: 0.045 });
        blip(bus, t, 270, 175, k === 0 ? 0.28 : 0.18, 0.08);
        if (step % 12 === 0) playNote(bus, degFreq(step % 24 === 0 ? 0 : 2, hi), t, 0.1, 0.5);
        return k === 2 ? 0.26 : 0.085;
      }
      case "shaker": {
        const accent = step % 4 === 0;
        noiseBurst(bus, t, {
          type: "highpass",
          freq: 5200,
          peak: accent ? 0.3 : 0.16,
          dur: 0.045,
          attack: 0.012,
        });
        if (accent) blip(bus, t, 250, 175, 0.2, 0.1);
        if (step % 8 === 4) playNote(bus, degFreq(step % 16 === 4 ? 2 : 4, hi), t, 0.1, 0.35);
        return 0.1;
      }
      case "harp": {
        const span = 10;
        const cyc = step % (span * 2);
        const d = cyc < span ? cyc : span * 2 - cyc - 1;
        playNote(bus, degFreq(d), t, 0.15, 0.55);
        return 0.075;
      }
      case "crackle":
        noiseBurst(bus, t, {
          freq: 1500 + rand() * 2500,
          q: 2,
          peak: 0.18 + rand() * 0.45,
          dur: 0.008 + rand() * 0.014,
        });
        if (step % 14 === 0)
          playNote(bus, degFreq([0, 2, 4][Math.floor(step / 14) % 3]!), t, 0.1, 0.5);
        return 0.03 + rand() * 0.08;
      case "wind":
        playNote(bus, degFreq(Math.floor(rand() * 6), hi), t, 0.15, 0.8);
        return 0.42 + rand() * 0.2;
      case "thunder":
        if (rand() < 0.35)
          noiseBurst(bus, t, { freq: 2200 + rand() * 1800, q: 2, peak: 0.12, dur: 0.01 });
        if (step % 5 === 0)
          noiseBurst(bus, t, { freq: 520, q: 0.6, peak: 0.5, dur: 0.45, attack: 0.08, pink: true });
        if (step % 9 === 0) playNote(bus, degFreq(step % 18 === 0 ? 0 : 4, hi), t, 0.1, 0.6);
        return 0.17;
      case "chimes":
        playNote(bus, degFreq(Math.floor(rand() * 8), hi), t, 0.06 + rand() * 0.1, 0.7);
        return 0.1 + rand() * 0.2;
      case "roll": {
        const pairs = [
          [0, 2],
          [3, 5],
          [1, 4],
          [2, 4],
        ];
        const pair = pairs[Math.floor(step / 16) % 4]!;
        playNote(bus, degFreq(pair[step % 2]!, hi), t, 0.12, 0.35, INSTRUMENTS.marimba);
        if (step % 16 === 0) playNote(bus, degFreq(pair[0]!, hi), t, 0.08, 0.6);
        return 0.062;
      }
      case "rain": {
        const f = 1100 + rand() * 1200;
        blip(bus, t, f, f * 0.55, 0.12 + rand() * 0.12, 0.035);
        if (step % 18 === 0) playNote(bus, degFreq(Math.floor(rand() * 5), hi), t, 0.09, 0.5);
        return 0.035 + rand() * 0.07;
      }
      case "bubbles": {
        const f = 320 + rand() * 320;
        blip(bus, t, f, f * 2.3, 0.2, 0.055);
        if (step % 10 === 0) playNote(bus, degFreq(Math.floor(rand() * 5), hi), t, 0.08, 0.5);
        return 0.06 + rand() * 0.11;
      }
      case "drip": {
        const f = 950 + rand() * 400;
        blip(bus, t, f, f * 0.42, 0.2, 0.1);
        if (step % 4 === 2)
          playNote(bus, degFreq([0, 2, 4, 2][Math.floor(step / 4) % 4]!), t, 0.11, 0.4);
        return 0.14;
      }
      case "clock": {
        const f = step % 2 === 1 ? 1250 : 1750;
        noiseBurst(bus, t, { freq: f, q: 5, peak: 1, dur: 0.022 });
        blip(bus, t, f, f * 0.9, 0.14, 0.025);
        if (step % 8 === 0) playNote(bus, degFreq(step % 16 === 0 ? 0 : 2, hi), t, 0.08, 0.6);
        return 0.17;
      }
      case "flutter": {
        const k = step % 4;
        noiseBurst(bus, t, { freq: 1000 + k * 80, q: 1, peak: 0.55, dur: 0.035, attack: 0.008 });
        if (step % 12 === 3) playNote(bus, degFreq(step % 24 === 3 ? 4 : 2), t, 0.09, 0.45);
        return k === 3 ? 0.23 : 0.045;
      }
    }
  }

  function startSpinLoop() {
    stopSpinLoop();
    const c = ensureCtx();
    if (!c || !sfxGain || muted) return;
    const t = c.currentTime;
    cascadeStep = 0;

    const bus = c.createGain();
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.linearRampToValueAtTime(SPIN_LEVEL, t + 0.12);
    bus.connect(sfxGain);
    spinBus = bus;
    spinBeds = spinBed(bus);
    spinStart = t;
    spinNext = t + 0.02;
    spinStep = 0;

    const pump = () => {
      if (!ctx || spinBus !== bus) return;
      const now = ctx.currentTime;
      if (now - spinStart > MAX_SPIN_SECONDS) {
        stopSpinLoop();
        return;
      }
      while (spinNext < now + 0.12) {
        const elapsed = spinNext - spinStart;
        const dt = spinEvent(bus, spinNext, spinStep);
        spinStep++;
        const slowdown = 1 + Math.min(elapsed, 4) * 0.045;
        spinNext += Math.max(0.025, (dt / voice.tempo) * slowdown);
      }
    };
    pump();
    spinTimer = window.setInterval(pump, 30);
  }

  function stopSpinLoop() {
    if (spinTimer != null) {
      window.clearInterval(spinTimer);
      spinTimer = null;
    }
    if (!ctx || !spinBus) return;
    const t = ctx.currentTime;
    const bus = spinBus;
    const beds = spinBeds;
    spinBus = null;
    spinBeds = [];
    try {
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
      bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      window.setTimeout(() => {
        for (const node of beds) {
          try {
            node.stop();
            node.disconnect();
          } catch {
            /* ignore */
          }
        }
        bus.disconnect();
      }, 300);
    } catch {
      /* ignore */
    }
  }

  function startAmbient() {
    if (muted || isAmbientPlaying || !unlocked) return;
    const c = ensureCtx();
    if (!c || !ambientGain) return;
    isAmbientPlaying = true;
    ambientNext = c.currentTime + 1.2;
    ambientTimer = window.setInterval(() => {
      if (!ctx || !ambientGain || muted) return;
      if (typeof document !== "undefined" && document.hidden) return;
      const now = ctx.currentTime;
      if (now < ambientNext) return;
      const degrees = [0, 2, 4, 5, 7];
      const d = degrees[Math.floor(Math.random() * degrees.length)]!;
      playNote(ambientGain, degFreq(d, -1), now + 0.02, 0.5, 1.2);
      if (Math.random() < 0.4) playNote(ambientGain, degFreq(d + 2, -1), now + 0.37, 0.35, 1.2);
      ambientNext = now + (2.6 + Math.random() * 2.2) / voice.tempo;
    }, 250);
  }

  function stopAmbient() {
    isAmbientPlaying = false;
    if (ambientTimer != null) {
      window.clearInterval(ambientTimer);
      ambientTimer = null;
    }
  }

  function playScatter() {
    stopSpinLoop();
    const c = ensureCtx();
    if (!c || !sfxGain || muted) return;
    const t = c.currentTime + 0.04;
    [0, 2, 4, 7].forEach((d, i) => playNote(sfxGain!, degFreq(d, hi), t + i * 0.09, 0.22, 1));
    sparkle(t + 0.4, 5);
  }

  setupUnlock();

  return {
    get isMuted() {
      return muted;
    },
    get masterVolume() {
      return volume;
    },
    setMuted(next: boolean) {
      muted = next;
      try {
        localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      } catch {
        /* ignore */
      }
      applyMasterGain();
      if (muted) {
        stopAmbient();
        stopSpinLoop();
      } else if (unlocked && !isAmbientPlaying) {
        startAmbient();
      }
    },
    toggleMute() {
      this.setMuted(!muted);
      return muted;
    },
    setVolume(vol: number) {
      volume = Math.max(0, Math.min(0.7, vol));
      try {
        localStorage.setItem(VOL_KEY, String(volume));
      } catch {
        /* ignore */
      }
      applyMasterGain();
    },
    preload() {},
    startAmbient,
    stopAmbient,
    startSpinLoop,
    stopSpinLoop,
    playUiClick() {
      unlockFromGesture();
      const c = ensureCtx();
      if (!c || !sfxGain || muted) return;
      const t = c.currentTime;
      playNote(sfxGain, degFreq(4, hi), t, 0.13, 0.22);
      noiseBurst(sfxGain, t, { type: "highpass", freq: 3200, peak: 0.06, dur: 0.008 });
    },
    playReelStop(reelIndex: number) {
      const c = ensureCtx();
      if (!c || !sfxGain || muted) return;
      const t = c.currentTime;
      noiseBurst(sfxGain, t, { type: "lowpass", freq: 1300, q: 0.7, peak: 0.28, dur: 0.05 });
      playNote(sfxGain, degFreq(reelIndex), t, 0.18, 0.4);
    },
    playCascadeTick() {
      const c = ensureCtx();
      if (!c || !sfxGain || muted) return;
      playNote(sfxGain, degFreq(2 + cascadeStep), c.currentTime, 0.17, 0.45);
      cascadeStep = Math.min(cascadeStep + 1, 9);
    },
    playWin(amount: number, bet: number) {
      const c = ensureCtx();
      if (!c || !sfxGain || muted || amount <= 0 || bet <= 0) return;
      const mult = amount / bet;
      const t = c.currentTime + 0.02;
      const pat = [0, 2, 4, 5, 7, 9, 11, 14];
      const count = mult >= 20 ? 8 : mult >= 5 ? 5 : 3;
      const gap = count === 8 ? 0.08 : 0.1;
      for (let i = 0; i < count; i++) {
        playNote(sfxGain, degFreq(pat[i]!), t + i * gap, 0.2, 0.7);
      }
      const tail = t + count * gap;
      if (mult >= 5) {
        [0, 2, 4].forEach((d) => playNote(sfxGain!, degFreq(d, hi), tail, 0.14, 1.2));
      }
      if (mult >= 20) sparkle(tail + 0.15, 8);
    },
    playScatterTrigger: playScatter,
    playFreespinIntro() {
      playScatter();
      const c = ctx;
      if (!c || !sfxGain || muted) return;
      const t = c.currentTime + 0.75;
      for (let i = 0; i < 8; i++) playNote(sfxGain, degFreq(i), t + i * 0.07, 0.16, 0.6);
    },
    endFreespins() {
      const c = ensureCtx();
      if (c && sfxGain && !muted) {
        const t = c.currentTime + 0.02;
        [7, 4, 2, 0].forEach((d, i) => playNote(sfxGain!, degFreq(d), t + i * 0.16, 0.18, 0.9));
      }
      if (!muted && !isAmbientPlaying) startAmbient();
    },
  };
}

const S = PERYA_SCALES;

/** One identity per game: instrument × scale × spin texture × root. */
export const PERYA_VOICES: Record<string, SoftPeryaVoice> = {
  "lucky-neko": {
    id: "lucky-neko",
    root: 440,
    scale: S.hirajoshi,
    instrument: "musicbox",
    spin: "arp",
    tempo: 1,
    brightness: 5200,
  },
  "fortune-tiger": {
    id: "fortune-tiger",
    root: 294,
    scale: S.majorPent,
    instrument: "koto",
    spin: "taiko",
    tempo: 1.1,
    brightness: 4200,
  },
  "fortune-ox": {
    id: "fortune-ox",
    root: 196,
    scale: S.majorPent,
    instrument: "gong",
    spin: "taiko",
    tempo: 0.82,
    brightness: 3200,
  },
  "fortune-rabbit": {
    id: "fortune-rabbit",
    root: 392,
    scale: S.majorPent,
    instrument: "celesta",
    spin: "arp",
    tempo: 1.25,
    brightness: 5600,
  },
  "fortune-mouse": {
    id: "fortune-mouse",
    root: 392,
    scale: S.majorPent,
    instrument: "pizzicato",
    spin: "coins",
    tempo: 1.15,
    brightness: 5000,
  },
  "prosperity-lion": {
    id: "prosperity-lion",
    root: 330,
    scale: S.majorPent,
    instrument: "bell",
    spin: "coins",
    tempo: 0.9,
    brightness: 4600,
  },
  "buffalo-reign": {
    id: "buffalo-reign",
    root: 220,
    scale: S.minorPent,
    instrument: "marimba",
    spin: "gallop",
    tempo: 1,
    brightness: 3600,
  },
  "safari-gold": {
    id: "safari-gold",
    root: 349,
    scale: S.majorPent,
    instrument: "kalimba",
    spin: "shaker",
    tempo: 1.05,
    brightness: 4400,
  },
  "cleopatra-gold": {
    id: "cleopatra-gold",
    root: 330,
    scale: S.phrygianDom,
    instrument: "harp",
    spin: "harp",
    tempo: 1,
    brightness: 4800,
  },
  "maya-gold": {
    id: "maya-gold",
    root: 262,
    scale: S.pelog,
    instrument: "marimba",
    spin: "shaker",
    tempo: 0.9,
    brightness: 3800,
  },
  "temple-rush": {
    id: "temple-rush",
    root: 294,
    scale: S.dorian,
    instrument: "flute",
    spin: "roll",
    tempo: 1,
    brightness: 4200,
  },
  "pharaoh-fire": {
    id: "pharaoh-fire",
    root: 247,
    scale: S.doubleHarmonic,
    instrument: "gong",
    spin: "crackle",
    tempo: 1,
    brightness: 3600,
  },
  "desert-riches": {
    id: "desert-riches",
    root: 277,
    scale: S.phrygianDom,
    instrument: "pluck",
    spin: "wind",
    tempo: 1,
    brightness: 4200,
  },
  "gate-of-ra": {
    id: "gate-of-ra",
    root: 370,
    scale: S.doubleHarmonic,
    instrument: "glass",
    spin: "harp",
    tempo: 1.1,
    brightness: 5400,
  },
  "zeus-strike": {
    id: "zeus-strike",
    root: 311,
    scale: S.lydian,
    instrument: "vibes",
    spin: "thunder",
    tempo: 1,
    brightness: 4600,
  },
  "thor-thunder": {
    id: "thor-thunder",
    root: 220,
    scale: S.aeolian,
    instrument: "gong",
    spin: "thunder",
    tempo: 0.85,
    brightness: 3400,
  },
  "godly-gates": {
    id: "godly-gates",
    root: 392,
    scale: S.lydian,
    instrument: "celesta",
    spin: "harp",
    tempo: 1.15,
    brightness: 5600,
  },
  "olympus-wrath": {
    id: "olympus-wrath",
    root: 262,
    scale: S.harmonicMinor,
    instrument: "bell",
    spin: "thunder",
    tempo: 0.95,
    brightness: 4200,
  },
  "enchanted-grove": {
    id: "enchanted-grove",
    root: 440,
    scale: S.wholeTone,
    instrument: "glass",
    spin: "chimes",
    tempo: 1,
    brightness: 5800,
  },
  /** Phase 1 — Animal pack */
  "golden-panther": {
    id: "golden-panther",
    root: 349,
    scale: S.mixolydian,
    instrument: "vibes",
    spin: "coins",
    tempo: 1,
    brightness: 5000,
  },
  "jade-jaguar": {
    id: "jade-jaguar",
    root: 330,
    scale: S.minorPent,
    instrument: "marimba",
    spin: "rain",
    tempo: 1,
    brightness: 4600,
  },
  "ember-tiger": {
    id: "ember-tiger",
    root: 262,
    scale: S.minorPent,
    instrument: "pluck",
    spin: "crackle",
    tempo: 1.1,
    brightness: 4000,
  },
  "lotus-lynx": {
    id: "lotus-lynx",
    root: 330,
    scale: S.inSen,
    instrument: "koto",
    spin: "arp",
    tempo: 0.9,
    brightness: 4600,
  },
  "coral-cobra": {
    id: "coral-cobra",
    root: 392,
    scale: S.major,
    instrument: "steelpan",
    spin: "bubbles",
    tempo: 1,
    brightness: 5000,
  },
  /** Phase 2 — Spirit pack */
  "frost-fox": {
    id: "frost-fox",
    root: 440,
    scale: S.majorPent,
    instrument: "glass",
    spin: "wind",
    tempo: 1,
    brightness: 6000,
  },
  "solar-serpent": {
    id: "solar-serpent",
    root: 294,
    scale: S.phrygianDom,
    instrument: "flute",
    spin: "shaker",
    tempo: 1.1,
    brightness: 4400,
  },
  "honey-hive": {
    id: "honey-hive",
    root: 392,
    scale: S.major,
    instrument: "marimba",
    spin: "drip",
    tempo: 1,
    brightness: 4800,
  },
  "midnight-owl": {
    id: "midnight-owl",
    root: 262,
    scale: S.aeolian,
    instrument: "vibes",
    spin: "clock",
    tempo: 0.9,
    brightness: 3800,
  },
  "ruby-raven": {
    id: "ruby-raven",
    root: 311,
    scale: S.harmonicMinor,
    instrument: "pizzicato",
    spin: "flutter",
    tempo: 1.05,
    brightness: 4400,
  },
};
