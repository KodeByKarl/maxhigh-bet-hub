/**
 * Wild Frontier Stampede — wilderness / stampede procedural SFX.
 * Hoofbeat rumble, wind whoosh, wood thuds, campfire sparkles, brass horn.
 * Run: node scripts/generate-buffalo-reign-sounds.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "sounds", "buffalo-reign");
const SAMPLE_RATE = 44100;

/** Open wilderness / campfire pentatonic (Hz) */
const WILD = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23];

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

function fadeEdges(samples, sec = 0.04) {
  const fade = Math.floor(SAMPLE_RATE * sec);
  const n = samples.length;
  for (let i = 0; i < fade && i < n; i++) {
    const w = i / fade;
    samples[i] *= w;
    samples[n - 1 - i] *= w;
  }
}

/** Soft hoof / leather thud */
function hoofBeat(rand, pitch = 1) {
  const len = Math.floor(SAMPLE_RATE * (0.055 + rand() * 0.03));
  const out = new Float32Array(len);
  const f = (95 + rand() * 55) * pitch;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * (38 + rand() * 20));
    const noise = (rand() * 2 - 1) * Math.exp(-t * 90);
    const body = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 28);
    const tick = Math.sin(2 * Math.PI * (900 + rand() * 400) * t) * Math.exp(-t * 110);
    out[i] = (noise * 0.45 + body * 0.55 + tick * 0.2) * env;
  }
  return out;
}

/** Prairie wind / dust whoosh */
function windWhoosh(durSec, rand) {
  const n = Math.floor(SAMPLE_RATE * durSec);
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * t) * 0.26;
    const noise = rand() * 2 - 1;
    lp = lp * 0.93 + noise * 0.07;
    const flutter = Math.sin(2 * Math.PI * (4.5 + t * 6) * (i / SAMPLE_RATE)) * 0.28 + 0.72;
    out[i] = lp * env * flutter;
  }
  return out;
}

/** Deep stampede rumble underlay */
function stampedeRumble(durSec, rand) {
  const n = Math.floor(SAMPLE_RATE * durSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin(Math.PI * (i / n));
    const wobble = 1 + 0.08 * Math.sin(2 * Math.PI * 3.2 * t);
    out[i] =
      (Math.sin(2 * Math.PI * 48 * t * wobble) * 0.55 +
        Math.sin(2 * Math.PI * 72 * t) * 0.25 +
        (rand() * 2 - 1) * 0.08 * Math.exp(-((i / n - 0.5) ** 2) * 4)) *
      env *
      0.35;
  }
  return out;
}

/** Gold / brass clink */
function goldClink(rand, pitch = 1) {
  const len = Math.floor(SAMPLE_RATE * 0.28);
  const out = new Float32Array(len);
  const f = (760 + rand() * 420) * pitch;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 14);
    out[i] =
      (Math.sin(2 * Math.PI * f * t) * 0.55 +
        Math.sin(2 * Math.PI * f * 1.52 * t) * 0.28 +
        Math.sin(2 * Math.PI * f * 2.2 * t) * 0.12 +
        (rand() * 2 - 1) * Math.exp(-t * 55) * 0.12) *
      env;
  }
  return out;
}

/** Wooden reel land */
function woodThud(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.22);
  const out = new Float32Array(len);
  const f = 72 + rand() * 40;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 22);
    out[i] =
      (Math.sin(2 * Math.PI * f * t) * 0.7 +
        Math.sin(2 * Math.PI * f * 2.1 * t) * 0.2 +
        (rand() * 2 - 1) * Math.exp(-t * 48) * 0.3) *
      env;
  }
  return out;
}

/** Campfire / wilderness sparkle notes */
function campSparkle(durSec, rand, density = 1) {
  const n = Math.floor(SAMPLE_RATE * durSec);
  const out = new Float32Array(n);
  let t = 0.05;
  while (t < durSec - 0.08) {
    const freq = WILD[Math.floor(rand() * WILD.length)] * (rand() > 0.5 ? 2 : 1);
    const start = Math.floor(t * SAMPLE_RATE);
    const len = Math.floor(SAMPLE_RATE * (0.16 + rand() * 0.14));
    for (let i = 0; i < len && start + i < n; i++) {
      const tt = i / SAMPLE_RATE;
      const env = Math.exp(-tt * 10) * (1 - tt / (len / SAMPLE_RATE));
      const harm =
        Math.sin(2 * Math.PI * freq * tt) * 0.7 +
        Math.sin(2 * Math.PI * freq * 2 * tt) * 0.2 +
        Math.sin(2 * Math.PI * freq * 3 * tt) * 0.08;
      out[start + i] += harm * env * 0.048 * density;
    }
    t += (0.14 + rand() * 0.22) / density;
  }
  return out;
}

/** Horn / brass stab */
function hornStab(rand, baseFreq = 196) {
  const len = Math.floor(SAMPLE_RATE * 0.7);
  const out = new Float32Array(len);
  const partials = [1, 1.5, 2, 2.5, 3];
  const gains = [0.52, 0.28, 0.2, 0.12, 0.07];
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 3.8) * (1 - Math.min(1, t / 0.65) * 0.2);
    let s = 0;
    for (let p = 0; p < partials.length; p++) {
      s += Math.sin(2 * Math.PI * baseFreq * partials[p] * t) * gains[p] * Math.exp(-t * (1.6 + p * 0.55));
    }
    out[i] = (s + (rand() * 2 - 1) * Math.exp(-t * 65) * 0.18) * env;
  }
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── reel-spin-loop.wav — hoofbeats + wind + rumble ──────────────
{
  const rand = mulberry32(0xb15f1001);
  const dur = 1.65;
  const n = Math.floor(SAMPLE_RATE * dur);
  const out = new Float32Array(n);
  mixInto(out, windWhoosh(dur, rand), 0, 1);
  mixInto(out, stampedeRumble(dur, rand), 0, 1.1);
  mixInto(out, campSparkle(dur, rand, 0.55), 0, 0.7);
  // Gallop pattern ~4 beats / cycle
  let t = 0.03;
  while (t < dur) {
    const pitch = 0.9 + rand() * 0.3;
    mixInto(out, hoofBeat(rand, pitch), Math.floor(t * SAMPLE_RATE), 0.38 + rand() * 0.18);
    t += 0.085 + rand() * 0.04;
    if (t < dur) {
      mixInto(out, hoofBeat(rand, pitch * 0.95), Math.floor(t * SAMPLE_RATE), 0.28 + rand() * 0.12);
      t += 0.07 + rand() * 0.035;
    }
  }
  fadeEdges(out, 0.05);
  // Crossfade loop seam
  const fade = Math.floor(SAMPLE_RATE * 0.08);
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    out[n - fade + i] = out[n - fade + i] * (1 - w) + out[i] * w;
  }
  normalize(out, 0.82);
  writeWav(path.join(OUT_DIR, "reel-spin-loop.wav"), out);
}

// ── reel-stop.wav ───────────────────────────────────────────────
{
  const rand = mulberry32(0xb15f1002);
  const n = Math.floor(SAMPLE_RATE * 0.42);
  const out = new Float32Array(n);
  for (let k = 0; k < 4; k++) {
    mixInto(out, woodThud(rand), Math.floor(SAMPLE_RATE * (0.015 + k * 0.032)), 0.48 + k * 0.1);
  }
  mixInto(out, hoofBeat(rand, 1.15), Math.floor(SAMPLE_RATE * 0.06), 0.5);
  mixInto(out, goldClink(rand, 1.05), Math.floor(SAMPLE_RATE * 0.11), 0.28);
  normalize(out, 0.8);
  writeWav(path.join(OUT_DIR, "reel-stop.wav"), out);
}

// ── win.wav ─────────────────────────────────────────────────────
{
  const rand = mulberry32(0xb15f1003);
  const n = Math.floor(SAMPLE_RATE * 1.05);
  const out = new Float32Array(n);
  mixInto(out, hornStab(rand, 174), 0, 0.42);
  mixInto(out, campSparkle(0.95, rand, 1.6), Math.floor(SAMPLE_RATE * 0.04), 1.15);
  for (let k = 0; k < 7; k++) {
    mixInto(out, goldClink(rand, 0.9 + k * 0.08), Math.floor(SAMPLE_RATE * (0.05 + k * 0.08)), 0.4);
  }
  normalize(out, 0.84);
  writeWav(path.join(OUT_DIR, "win.wav"), out);
}

// ── treasure-chest.wav ──────────────────────────────────────────
{
  const rand = mulberry32(0xb15f1004);
  const n = Math.floor(SAMPLE_RATE * 1.05);
  const out = new Float32Array(n);
  mixInto(out, hornStab(rand, 146), 0, 0.55);
  mixInto(out, campSparkle(0.95, rand, 1.8), Math.floor(SAMPLE_RATE * 0.05), 1.2);
  for (let k = 0; k < 6; k++) {
    mixInto(out, goldClink(rand, 1 + k * 0.09), Math.floor(SAMPLE_RATE * (0.08 + k * 0.09)), 0.48);
  }
  normalize(out, 0.85);
  writeWav(path.join(OUT_DIR, "treasure-chest.wav"), out);
}

// ── jackpot.wav ─────────────────────────────────────────────────
{
  const rand = mulberry32(0xb15f1005);
  const n = Math.floor(SAMPLE_RATE * 1.4);
  const out = new Float32Array(n);
  mixInto(out, hornStab(rand, 110), 0, 0.7);
  mixInto(out, hornStab(rand, 174), Math.floor(SAMPLE_RATE * 0.14), 0.55);
  mixInto(out, campSparkle(1.25, rand, 2.1), Math.floor(SAMPLE_RATE * 0.08), 1.35);
  for (let k = 0; k < 11; k++) {
    mixInto(out, goldClink(rand, 0.88 + k * 0.08), Math.floor(SAMPLE_RATE * (0.1 + k * 0.08)), 0.45);
  }
  normalize(out, 0.88);
  writeWav(path.join(OUT_DIR, "jackpot.wav"), out);
}

// ── free-spins.wav ──────────────────────────────────────────────
{
  const rand = mulberry32(0xb15f1006);
  const n = Math.floor(SAMPLE_RATE * 1.0);
  const out = new Float32Array(n);
  mixInto(out, hornStab(rand, 220), 0, 0.48);
  mixInto(out, campSparkle(0.9, rand, 1.9), Math.floor(SAMPLE_RATE * 0.04), 1.25);
  for (let k = 0; k < 5; k++) {
    mixInto(out, goldClink(rand, 1.05 + k * 0.1), Math.floor(SAMPLE_RATE * (0.1 + k * 0.1)), 0.42);
  }
  normalize(out, 0.84);
  writeWav(path.join(OUT_DIR, "free-spins.wav"), out);
}

// ── ui-click.wav ────────────────────────────────────────────────
{
  const rand = mulberry32(0xb15f1007);
  const n = Math.floor(SAMPLE_RATE * 0.11);
  const out = new Float32Array(n);
  mixInto(out, hoofBeat(rand, 1.4), 0, 0.65);
  normalize(out, 0.7);
  writeWav(path.join(OUT_DIR, "ui-click.wav"), out);
}

console.log("Wild Frontier Stampede sounds written to", OUT_DIR);
for (const f of fs.readdirSync(OUT_DIR)) {
  const st = fs.statSync(path.join(OUT_DIR, f));
  console.log(`  ${f}  (${(st.size / 1024).toFixed(1)} KB)`);
}
