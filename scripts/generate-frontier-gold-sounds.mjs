/**
 * Frontier Gold — western Hold & Win procedural SFX.
 * Dust whoosh, spur clacks, gold coin jingles, saloon piano hits.
 * Run: node scripts/generate-frontier-gold-sounds.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "sounds", "frontier-gold");
const SAMPLE_RATE = 44100;

/** Western / saloon-ish major pentatonic (Hz) */
const WEST = [196.0, 220.0, 261.63, 293.66, 329.63, 392.0];

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

/** Spur / metal tick */
function spurClack(rand, pitch = 1) {
  const len = Math.floor(SAMPLE_RATE * (0.03 + rand() * 0.025));
  const out = new Float32Array(len);
  const f1 = (1400 + rand() * 800) * pitch;
  const f2 = (280 + rand() * 120) * pitch;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * (50 + rand() * 35));
    const noise = (rand() * 2 - 1) * Math.exp(-t * 100);
    const click = Math.sin(2 * Math.PI * f1 * t) * Math.exp(-t * 85);
    const body = Math.sin(2 * Math.PI * f2 * t) * Math.exp(-t * 32);
    out[i] = (noise * 0.5 + click * 0.4 + body * 0.4) * env;
  }
  return out;
}

/** Dry desert / dust whoosh */
function dustWhoosh(durSec, rand) {
  const n = Math.floor(SAMPLE_RATE * durSec);
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * t) * 0.22;
    const noise = rand() * 2 - 1;
    lp = lp * 0.91 + noise * 0.09;
    const flutter = Math.sin(2 * Math.PI * (6 + t * 5) * (i / SAMPLE_RATE)) * 0.25 + 0.75;
    out[i] = lp * env * flutter;
  }
  return out;
}

/** Gold coin clink */
function goldClink(rand, pitch = 1) {
  const len = Math.floor(SAMPLE_RATE * 0.3);
  const out = new Float32Array(len);
  const f = (880 + rand() * 380) * pitch;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 13);
    out[i] =
      (Math.sin(2 * Math.PI * f * t) * 0.55 +
        Math.sin(2 * Math.PI * f * 1.48 * t) * 0.28 +
        Math.sin(2 * Math.PI * f * 2.15 * t) * 0.12 +
        (rand() * 2 - 1) * Math.exp(-t * 55) * 0.14) *
      env;
  }
  return out;
}

/** Wooden saloon thud (reel land) */
function woodThud(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.24);
  const out = new Float32Array(len);
  const f = 78 + rand() * 35;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 20);
    out[i] =
      (Math.sin(2 * Math.PI * f * t) * 0.72 +
        Math.sin(2 * Math.PI * f * 2.05 * t) * 0.18 +
        (rand() * 2 - 1) * Math.exp(-t * 45) * 0.32) *
      env;
  }
  return out;
}

/** Soft piano / harmonica sparkle */
function saloonSparkle(durSec, rand, density = 1) {
  const n = Math.floor(SAMPLE_RATE * durSec);
  const out = new Float32Array(n);
  let t = 0.04;
  while (t < durSec - 0.08) {
    const freq = WEST[Math.floor(rand() * WEST.length)] * (rand() > 0.55 ? 2 : 1);
    const start = Math.floor(t * SAMPLE_RATE);
    const len = Math.floor(SAMPLE_RATE * (0.18 + rand() * 0.12));
    for (let i = 0; i < len && start + i < n; i++) {
      const tt = i / SAMPLE_RATE;
      const env = Math.exp(-tt * 9) * (1 - tt / (len / SAMPLE_RATE));
      const harm =
        Math.sin(2 * Math.PI * freq * tt) * 0.7 +
        Math.sin(2 * Math.PI * freq * 2 * tt) * 0.18 +
        Math.sin(2 * Math.PI * freq * 3 * tt) * 0.07;
      out[start + i] += harm * env * 0.05 * density;
    }
    t += (0.15 + rand() * 0.2) / density;
  }
  return out;
}

/** Bright brass / horn stab for jackpot */
function brassStab(rand, baseFreq = 220) {
  const len = Math.floor(SAMPLE_RATE * 0.65);
  const out = new Float32Array(len);
  const partials = [1, 1.5, 2, 2.5, 3];
  const gains = [0.5, 0.3, 0.2, 0.12, 0.07];
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 4.2) * (1 - Math.min(1, t / 0.6) * 0.2);
    let s = 0;
    for (let p = 0; p < partials.length; p++) {
      s += Math.sin(2 * Math.PI * baseFreq * partials[p] * t) * gains[p] * Math.exp(-t * (1.8 + p * 0.6));
    }
    out[i] = (s + (rand() * 2 - 1) * Math.exp(-t * 70) * 0.2) * env;
  }
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── reel-spin-loop.wav ──────────────────────────────────────────
{
  const rand = mulberry32(0xf70a1001);
  const dur = 1.7;
  const n = Math.floor(SAMPLE_RATE * dur);
  const out = new Float32Array(n);
  mixInto(out, dustWhoosh(dur, rand), 0, 1);
  mixInto(out, saloonSparkle(dur, rand, 0.7), 0, 0.85);
  let t = 0.04;
  while (t < dur) {
    mixInto(out, spurClack(rand, 0.85 + rand() * 0.35), Math.floor(t * SAMPLE_RATE), 0.28 + rand() * 0.2);
    t += 0.1 + rand() * 0.12;
  }
  for (let i = 0; i < n; i++) {
    const tt = i / SAMPLE_RATE;
    const env = Math.sin(Math.PI * (i / n));
    out[i] += Math.sin(2 * Math.PI * 58 * tt) * 0.03 * env;
  }
  fadeEdges(out, 0.06);
  const fade = Math.floor(SAMPLE_RATE * 0.09);
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    out[n - fade + i] = out[n - fade + i] * (1 - w) + out[i] * w;
  }
  normalize(out, 0.8);
  writeWav(path.join(OUT_DIR, "reel-spin-loop.wav"), out);
}

// ── reel-stop.wav ───────────────────────────────────────────────
{
  const rand = mulberry32(0xf70a1002);
  const n = Math.floor(SAMPLE_RATE * 0.4);
  const out = new Float32Array(n);
  for (let k = 0; k < 3; k++) {
    mixInto(out, woodThud(rand), Math.floor(SAMPLE_RATE * (0.02 + k * 0.035)), 0.5 + k * 0.12);
  }
  mixInto(out, spurClack(rand, 1.1), Math.floor(SAMPLE_RATE * 0.08), 0.55);
  mixInto(out, goldClink(rand, 1.0), Math.floor(SAMPLE_RATE * 0.12), 0.3);
  normalize(out, 0.78);
  writeWav(path.join(OUT_DIR, "reel-stop.wav"), out);
}

// ── win.wav ─────────────────────────────────────────────────────
{
  const rand = mulberry32(0xf70a1003);
  const n = Math.floor(SAMPLE_RATE * 1.05);
  const out = new Float32Array(n);
  mixInto(out, brassStab(rand, 196), 0, 0.4);
  mixInto(out, saloonSparkle(0.95, rand, 1.5), Math.floor(SAMPLE_RATE * 0.04), 1.15);
  for (let k = 0; k < 7; k++) {
    mixInto(out, goldClink(rand, 0.92 + k * 0.07), Math.floor(SAMPLE_RATE * (0.06 + k * 0.08)), 0.42);
  }
  normalize(out, 0.82);
  writeWav(path.join(OUT_DIR, "win.wav"), out);
}

// ── hold-win.wav ────────────────────────────────────────────────
{
  const rand = mulberry32(0xf70a1004);
  const n = Math.floor(SAMPLE_RATE * 1.0);
  const out = new Float32Array(n);
  mixInto(out, brassStab(rand, 165), 0, 0.55);
  mixInto(out, saloonSparkle(0.9, rand, 1.7), Math.floor(SAMPLE_RATE * 0.05), 1.2);
  for (let k = 0; k < 5; k++) {
    mixInto(out, goldClink(rand, 1 + k * 0.08), Math.floor(SAMPLE_RATE * (0.1 + k * 0.1)), 0.5);
  }
  normalize(out, 0.84);
  writeWav(path.join(OUT_DIR, "hold-win.wav"), out);
}

// ── coin-land.wav ───────────────────────────────────────────────
{
  const rand = mulberry32(0xf70a1005);
  const n = Math.floor(SAMPLE_RATE * 0.35);
  const out = new Float32Array(n);
  mixInto(out, goldClink(rand, 1.15), 0, 0.7);
  mixInto(out, spurClack(rand, 0.9), Math.floor(SAMPLE_RATE * 0.02), 0.35);
  normalize(out, 0.78);
  writeWav(path.join(OUT_DIR, "coin-land.wav"), out);
}

// ── coin-lock.wav ───────────────────────────────────────────────
{
  const rand = mulberry32(0xf70a1006);
  const n = Math.floor(SAMPLE_RATE * 0.32);
  const out = new Float32Array(n);
  mixInto(out, woodThud(rand), 0, 0.45);
  mixInto(out, goldClink(rand, 1.35), Math.floor(SAMPLE_RATE * 0.04), 0.65);
  normalize(out, 0.78);
  writeWav(path.join(OUT_DIR, "coin-lock.wav"), out);
}

// ── jackpot.wav ─────────────────────────────────────────────────
{
  const rand = mulberry32(0xf70a1007);
  const n = Math.floor(SAMPLE_RATE * 1.35);
  const out = new Float32Array(n);
  mixInto(out, brassStab(rand, 130), 0, 0.7);
  mixInto(out, brassStab(rand, 196), Math.floor(SAMPLE_RATE * 0.12), 0.55);
  mixInto(out, saloonSparkle(1.2, rand, 2.0), Math.floor(SAMPLE_RATE * 0.08), 1.3);
  for (let k = 0; k < 10; k++) {
    mixInto(out, goldClink(rand, 0.9 + k * 0.08), Math.floor(SAMPLE_RATE * (0.1 + k * 0.08)), 0.45);
  }
  normalize(out, 0.86);
  writeWav(path.join(OUT_DIR, "jackpot.wav"), out);
}

// ── free-spins.wav ──────────────────────────────────────────────
{
  const rand = mulberry32(0xf70a1008);
  const n = Math.floor(SAMPLE_RATE * 0.95);
  const out = new Float32Array(n);
  mixInto(out, brassStab(rand, 247), 0, 0.45);
  mixInto(out, saloonSparkle(0.85, rand, 1.8), Math.floor(SAMPLE_RATE * 0.04), 1.2);
  for (let k = 0; k < 4; k++) {
    mixInto(out, goldClink(rand, 1.1 + k * 0.1), Math.floor(SAMPLE_RATE * (0.12 + k * 0.1)), 0.4);
  }
  normalize(out, 0.82);
  writeWav(path.join(OUT_DIR, "free-spins.wav"), out);
}

// ── ui-click.wav ────────────────────────────────────────────────
{
  const rand = mulberry32(0xf70a1009);
  const n = Math.floor(SAMPLE_RATE * 0.12);
  const out = new Float32Array(n);
  mixInto(out, spurClack(rand, 1.25), 0, 0.7);
  normalize(out, 0.7);
  writeWav(path.join(OUT_DIR, "ui-click.wav"), out);
}

console.log("Frontier Gold sounds written to", OUT_DIR);
for (const f of fs.readdirSync(OUT_DIR)) {
  const st = fs.statSync(path.join(OUT_DIR, f));
  console.log(`  ${f}  (${(st.size / 1024).toFixed(1)} KB)`);
}
