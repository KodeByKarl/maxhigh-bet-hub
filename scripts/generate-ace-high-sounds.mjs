/**
 * Ace High — procedural casino SFX (chips, card flip, win stings).
 * Run: node scripts/generate-ace-high-sounds.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "sounds", "ace-high");
const SAMPLE_RATE = 44100;

function writeWav(filePath, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  fs.writeFileSync(filePath, buf);
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(samples, peak = 0.88) {
  let max = 0;
  for (let i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]));
  if (max < 1e-6) return samples;
  const g = peak / max;
  for (let i = 0; i < samples.length; i++) samples[i] *= g;
  return samples;
}

function fadeEdges(samples, sec = 0.02) {
  const fade = Math.floor(SAMPLE_RATE * sec);
  const n = samples.length;
  for (let i = 0; i < fade && i < n; i++) {
    const w = i / fade;
    samples[i] *= w;
    samples[n - 1 - i] *= w;
  }
}

function mixInto(target, src, atSample, gain = 1) {
  for (let i = 0; i < src.length; i++) {
    const j = atSample + i;
    if (j >= 0 && j < target.length) target[j] += src[i] * gain;
  }
}

/** Clay chip clack onto felt */
function chipClack(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.12);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 55);
    const noise = (rand() * 2 - 1) * Math.exp(-t * 90);
    const thud = Math.sin(2 * Math.PI * (180 + rand() * 40) * t) * Math.exp(-t * 40);
    const click = Math.sin(2 * Math.PI * (1400 + rand() * 400) * t) * Math.exp(-t * 120);
    out[i] = noise * 0.45 + thud * 0.55 + click * 0.35;
    out[i] *= env;
  }
  return normalize(out, 0.75);
}

/** Soft deal slide */
function dealSlide(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.22);
  const out = new Float32Array(len);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin(Math.PI * (i / len)) * Math.exp(-t * 4);
    const noise = rand() * 2 - 1;
    lp = lp * 0.92 + noise * 0.08;
    const whisper = Math.sin(2 * Math.PI * (520 + t * 200) * t) * 0.15;
    out[i] = (lp * 0.55 + whisper) * env;
  }
  return normalize(out, 0.55);
}

/** Card flip whoosh + snap */
function cardFlip(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.28);
  const out = new Float32Array(len);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const whooshEnv = Math.sin(Math.PI * Math.min(1, t / 0.18)) * Math.exp(-t * 3);
    const noise = rand() * 2 - 1;
    lp = lp * 0.88 + noise * 0.12;
    const whoosh = lp * whooshEnv * 0.7;
    // mid flip snap
    const snapT = t - 0.12;
    const snap =
      snapT > 0
        ? Math.sin(2 * Math.PI * 900 * snapT) * Math.exp(-snapT * 70) * 0.55 +
          (rand() * 2 - 1) * Math.exp(-snapT * 100) * 0.25
        : 0;
    out[i] = whoosh + snap;
  }
  fadeEdges(out, 0.015);
  return normalize(out, 0.8);
}

/** Short celebratory arpeggio — win */
function winSting(rand, big = false) {
  const notes = big
    ? [392.0, 493.88, 587.33, 783.99, 987.77]
    : [329.63, 415.3, 523.25, 659.25];
  const dur = big ? 1.35 : 0.85;
  const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
  const step = big ? 0.14 : 0.12;
  for (let n = 0; n < notes.length; n++) {
    const start = Math.floor(SAMPLE_RATE * n * step);
    const toneLen = Math.floor(SAMPLE_RATE * (big ? 0.45 : 0.32));
    for (let i = 0; i < toneLen; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * (big ? 2.2 : 3.2));
      const f = notes[n];
      const sig =
        Math.sin(2 * Math.PI * f * t) * 0.55 +
        Math.sin(2 * Math.PI * f * 2 * t) * 0.18 +
        Math.sin(2 * Math.PI * f * 3 * t) * 0.08;
      const j = start + i;
      if (j < out.length) out[j] += sig * env * (big ? 0.9 : 0.75);
    }
  }
  // sparkle noise
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    if (rand() > 0.992) out[i] += (rand() * 2 - 1) * Math.exp(-t * 2) * 0.08;
  }
  fadeEdges(out, 0.03);
  return normalize(out, big ? 0.92 : 0.82);
}

/** Tie / soft chime */
function tieChime() {
  const out = new Float32Array(Math.floor(SAMPLE_RATE * 0.55));
  const freqs = [440, 554.37];
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 3.5);
    out[i] =
      (Math.sin(2 * Math.PI * freqs[0] * t) * 0.45 +
        Math.sin(2 * Math.PI * freqs[1] * t) * 0.35) *
      env;
  }
  return normalize(out, 0.7);
}

/** War drum hit */
function warHit(rand) {
  const out = new Float32Array(Math.floor(SAMPLE_RATE * 0.55));
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 6);
    const boom = Math.sin(2 * Math.PI * (90 + t * 40) * t) * Math.exp(-t * 8);
    const snare = (rand() * 2 - 1) * Math.exp(-t * 25) * 0.35;
    const brass = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 5) * 0.3;
    out[i] = (boom * 0.85 + snare + brass) * env;
  }
  return normalize(out, 0.88);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const rand = mulberry32(0xace01);

const files = {
  "chip.wav": chipClack(rand),
  "deal.wav": dealSlide(rand),
  "flip.wav": cardFlip(rand),
  "win.wav": winSting(rand, false),
  "big-win.wav": winSting(rand, true),
  "tie.wav": tieChime(),
  "war.wav": warHit(rand),
};

for (const [name, samples] of Object.entries(files)) {
  const p = path.join(OUT_DIR, name);
  writeWav(p, samples);
  console.log("wrote", name, `(${(samples.length / SAMPLE_RATE).toFixed(2)}s)`);
}

console.log("Done →", OUT_DIR);
