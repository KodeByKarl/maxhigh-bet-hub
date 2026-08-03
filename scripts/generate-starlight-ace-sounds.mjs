/**
 * Regenerates Starlight Ace spin SFX (celestial chime clacks + soft pentatonic color).
 * Run: npx tsx scripts/generate-mahjong-sounds.mjs
 * or:  node scripts/generate-mahjong-sounds.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "sounds", "starlight-ace");
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

function tileClack(rand, pitch = 1) {
  const len = Math.floor(SAMPLE_RATE * (0.028 + rand() * 0.02));
  const out = new Float32Array(len);
  const f1 = (1800 + rand() * 900) * pitch;
  const f2 = (420 + rand() * 180) * pitch;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * (55 + rand() * 40));
    const noise = (rand() * 2 - 1) * Math.exp(-t * 120);
    const click = Math.sin(2 * Math.PI * f1 * t) * Math.exp(-t * 90);
    const body = Math.sin(2 * Math.PI * f2 * t) * Math.exp(-t * 35);
    out[i] = (noise * 0.55 + click * 0.35 + body * 0.45) * env;
  }
  return out;
}

function woodWhoosh(durSec, rand) {
  const n = Math.floor(SAMPLE_RATE * durSec);
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * t) * 0.22;
    const noise = rand() * 2 - 1;
    lp = lp * 0.92 + noise * 0.08;
    out[i] = lp * env;
  }
  return out;
}

function pentatonicShimmer(durSec, rand) {
  const notes = [261.63, 293.66, 329.63, 392.0, 440.0];
  const n = Math.floor(SAMPLE_RATE * durSec);
  const out = new Float32Array(n);
  let t = 0.05;
  while (t < durSec - 0.1) {
    const freq = notes[Math.floor(rand() * notes.length)] * (rand() > 0.5 ? 1 : 2);
    const start = Math.floor(t * SAMPLE_RATE);
    const len = Math.floor(SAMPLE_RATE * 0.22);
    for (let i = 0; i < len && start + i < n; i++) {
      const tt = i / SAMPLE_RATE;
      const env = Math.exp(-tt * 12) * (1 - tt / 0.22);
      out[start + i] += Math.sin(2 * Math.PI * freq * tt) * env * 0.045;
    }
    t += 0.18 + rand() * 0.22;
  }
  return out;
}

function mixInto(target, src, atSample, gain = 1) {
  for (let i = 0; i < src.length; i++) {
    const j = atSample + i;
    if (j >= 0 && j < target.length) target[j] += src[i] * gain;
  }
}

function normalize(samples, peak = 0.85) {
  let max = 0;
  for (let i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]));
  if (max < 1e-6) return samples;
  const g = peak / max;
  for (let i = 0; i < samples.length; i++) samples[i] *= g;
  return samples;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

{
  const rand = mulberry32(0x4d41484a);
  const dur = 1.6;
  const n = Math.floor(SAMPLE_RATE * dur);
  const out = new Float32Array(n);
  mixInto(out, woodWhoosh(dur, rand), 0, 1);
  mixInto(out, pentatonicShimmer(dur, rand), 0, 1);
  let t = 0;
  while (t < dur) {
    mixInto(out, tileClack(rand, 0.85 + rand() * 0.4), Math.floor(t * SAMPLE_RATE), 0.7 + rand() * 0.35);
    t += 0.045 + rand() * 0.055;
  }
  for (let i = 0; i < n; i++) {
    const tt = i / SAMPLE_RATE;
    out[i] += Math.sin(2 * Math.PI * 55 * tt) * 0.04 * Math.sin(Math.PI * (i / n));
    out[i] += Math.sin(2 * Math.PI * 82 * tt) * 0.025 * Math.sin(Math.PI * (i / n));
  }
  const fade = Math.floor(SAMPLE_RATE * 0.08);
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    out[i] *= w;
    out[n - 1 - i] *= w;
  }
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    out[n - fade + i] = out[n - fade + i] * (1 - w) + out[i] * w;
  }
  normalize(out, 0.82);
  writeWav(path.join(OUT_DIR, "reel-spin-loop.wav"), out);
}

{
  const rand = mulberry32(0x54494c45);
  const n = Math.floor(SAMPLE_RATE * 0.35);
  const out = new Float32Array(n);
  for (let k = 0; k < 5; k++) {
    mixInto(out, tileClack(rand, 0.9 + k * 0.05), Math.floor(SAMPLE_RATE * (0.02 + k * 0.035)), 0.55 + k * 0.08);
  }
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    out[i] += Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t * 18) * 0.2;
    out[i] += Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 12) * 0.15;
  }
  normalize(out, 0.78);
  writeWav(path.join(OUT_DIR, "reel-stop.wav"), out);
}

console.log("Starlight Ace sounds written to", OUT_DIR);
