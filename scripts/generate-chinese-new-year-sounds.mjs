/**
 * Chinese New Year — themed procedural SFX (firecrackers, gongs, pentatonic luck).
 * Run: node scripts/generate-chinese-new-year-sounds.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "sounds", "chinese-new-year");
const SAMPLE_RATE = 44100;

/** Chinese pentatonic-ish (Hz) — festive / lucky color */
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

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

/** Sharp firecracker pop */
function firecracker(rand, pitch = 1) {
  const len = Math.floor(SAMPLE_RATE * (0.04 + rand() * 0.05));
  const out = new Float32Array(len);
  const fCrack = (2200 + rand() * 1800) * pitch;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * (70 + rand() * 50));
    const noise = (rand() * 2 - 1) * Math.exp(-t * 90);
    const tick = Math.sin(2 * Math.PI * fCrack * t) * Math.exp(-t * 110);
    out[i] = (noise * 0.7 + tick * 0.45) * env;
  }
  return out;
}

/** Soft silk / air whoosh for spinning reels */
function silkWhoosh(durSec, rand) {
  const n = Math.floor(SAMPLE_RATE * durSec);
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * t) * 0.2;
    const noise = rand() * 2 - 1;
    lp = lp * 0.9 + noise * 0.1;
    const flutter = Math.sin(2 * Math.PI * (8 + t * 6) * (i / SAMPLE_RATE)) * 0.3 + 0.7;
    out[i] = lp * env * flutter;
  }
  return out;
}

/** Pentatonic sparkle (luck / celebration) */
function pentatonicSparkle(durSec, rand, density = 1) {
  const n = Math.floor(SAMPLE_RATE * durSec);
  const out = new Float32Array(n);
  let t = 0.04;
  while (t < durSec - 0.08) {
    const freq = PENTA[Math.floor(rand() * PENTA.length)] * (rand() > 0.55 ? 2 : 1);
    const start = Math.floor(t * SAMPLE_RATE);
    const len = Math.floor(SAMPLE_RATE * (0.16 + rand() * 0.12));
    for (let i = 0; i < len && start + i < n; i++) {
      const tt = i / SAMPLE_RATE;
      const env = Math.exp(-tt * 10) * (1 - tt / (len / SAMPLE_RATE));
      const harm =
        Math.sin(2 * Math.PI * freq * tt) * 0.7 +
        Math.sin(2 * Math.PI * freq * 2 * tt) * 0.2 +
        Math.sin(2 * Math.PI * freq * 3 * tt) * 0.08;
      out[start + i] += harm * env * 0.055 * density;
    }
    t += (0.14 + rand() * 0.2) / density;
  }
  return out;
}

/** Temple gong / bronze bell hit */
function gongHit(rand, baseFreq = 110) {
  const len = Math.floor(SAMPLE_RATE * (0.55 + rand() * 0.2));
  const out = new Float32Array(len);
  const partials = [1, 1.5, 2.01, 2.75, 3.5];
  const gains = [0.55, 0.28, 0.18, 0.1, 0.06];
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 3.2) * (1 - Math.min(1, t / 0.55) * 0.15);
    let s = 0;
    for (let p = 0; p < partials.length; p++) {
      s += Math.sin(2 * Math.PI * baseFreq * partials[p] * t) * gains[p] * Math.exp(-t * (2 + p));
    }
    const attack = (rand() * 2 - 1) * Math.exp(-t * 80) * 0.25;
    out[i] = (s + attack) * env;
  }
  return out;
}

/** Coin / gold ingot clink */
function coinClink(rand, pitch = 1) {
  const len = Math.floor(SAMPLE_RATE * 0.28);
  const out = new Float32Array(len);
  const f = (980 + rand() * 420) * pitch;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 14);
    out[i] =
      (Math.sin(2 * Math.PI * f * t) * 0.55 +
        Math.sin(2 * Math.PI * f * 1.5 * t) * 0.25 +
        Math.sin(2 * Math.PI * f * 2.2 * t) * 0.12 +
        (rand() * 2 - 1) * Math.exp(-t * 60) * 0.15) *
      env;
  }
  return out;
}

/** Wooden drum thump (lion dance / reel land) */
function woodDrum(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.22);
  const out = new Float32Array(len);
  const f = 90 + rand() * 40;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 22);
    out[i] =
      (Math.sin(2 * Math.PI * f * t) * 0.7 +
        Math.sin(2 * Math.PI * f * 2 * t) * 0.2 +
        (rand() * 2 - 1) * Math.exp(-t * 50) * 0.35) *
      env;
  }
  return out;
}

/** Firework launch whoosh + distant crackle */
function fireworkLaunch(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.55);
  const out = new Float32Array(len);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const rise = Math.min(1, t / 0.18);
    const env = rise * Math.exp(-(t - 0.18) * 4.5);
    const noise = rand() * 2 - 1;
    lp = lp * 0.88 + noise * 0.12;
    const whistle = Math.sin(2 * Math.PI * (400 + t * 900) * t) * 0.2 * rise;
    out[i] = lp * env * 0.55 + whistle * env;
  }
  mixInto(out, firecracker(rand, 1.1), Math.floor(SAMPLE_RATE * 0.38), 0.85);
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── reel-spin-loop.wav ──────────────────────────────────────────
{
  const rand = mulberry32(0xc4e9a001);
  const dur = 1.8;
  const n = Math.floor(SAMPLE_RATE * dur);
  const out = new Float32Array(n);
  mixInto(out, silkWhoosh(dur, rand), 0, 1);
  mixInto(out, pentatonicSparkle(dur, rand, 0.85), 0, 1);
  let t = 0.05;
  while (t < dur) {
    mixInto(out, firecracker(rand, 0.7 + rand() * 0.5), Math.floor(t * SAMPLE_RATE), 0.22 + rand() * 0.18);
    t += 0.11 + rand() * 0.14;
  }
  for (let i = 0; i < n; i++) {
    const tt = i / SAMPLE_RATE;
    const env = Math.sin(Math.PI * (i / n));
    out[i] += Math.sin(2 * Math.PI * 65 * tt) * 0.035 * env;
    out[i] += Math.sin(2 * Math.PI * 98 * tt) * 0.02 * env;
  }
  fadeEdges(out, 0.06);
  // seamless loop crossfade
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
  const rand = mulberry32(0xc4e9a002);
  const n = Math.floor(SAMPLE_RATE * 0.42);
  const out = new Float32Array(n);
  for (let k = 0; k < 3; k++) {
    mixInto(out, woodDrum(rand), Math.floor(SAMPLE_RATE * (0.02 + k * 0.04)), 0.55 + k * 0.12);
  }
  mixInto(out, gongHit(rand, 130), Math.floor(SAMPLE_RATE * 0.06), 0.45);
  mixInto(out, coinClink(rand, 1.05), Math.floor(SAMPLE_RATE * 0.12), 0.35);
  normalize(out, 0.78);
  writeWav(path.join(OUT_DIR, "reel-stop.wav"), out);
}

// ── win.wav ─────────────────────────────────────────────────────
{
  const rand = mulberry32(0xc4e9a003);
  const n = Math.floor(SAMPLE_RATE * 1.1);
  const out = new Float32Array(n);
  mixInto(out, gongHit(rand, 165), 0, 0.55);
  mixInto(out, pentatonicSparkle(1.0, rand, 1.6), Math.floor(SAMPLE_RATE * 0.05), 1.2);
  for (let k = 0; k < 6; k++) {
    mixInto(
      out,
      coinClink(rand, 0.95 + k * 0.06),
      Math.floor(SAMPLE_RATE * (0.08 + k * 0.09)),
      0.4,
    );
  }
  mixInto(out, firecracker(rand, 1.2), Math.floor(SAMPLE_RATE * 0.35), 0.4);
  mixInto(out, firecracker(rand, 0.9), Math.floor(SAMPLE_RATE * 0.48), 0.35);
  normalize(out, 0.82);
  writeWav(path.join(OUT_DIR, "win.wav"), out);
}

// ── dragon-firework.wav ─────────────────────────────────────────
{
  const rand = mulberry32(0xc4e9a004);
  const n = Math.floor(SAMPLE_RATE * 0.7);
  const out = new Float32Array(n);
  mixInto(out, fireworkLaunch(rand), 0, 1);
  mixInto(out, coinClink(rand, 1.15), Math.floor(SAMPLE_RATE * 0.42), 0.5);
  mixInto(out, firecracker(rand, 1.3), Math.floor(SAMPLE_RATE * 0.5), 0.55);
  normalize(out, 0.8);
  writeWav(path.join(OUT_DIR, "dragon-firework.wav"), out);
}

// ── dragon-bust.wav ─────────────────────────────────────────────
{
  const rand = mulberry32(0xc4e9a005);
  const n = Math.floor(SAMPLE_RATE * 0.55);
  const out = new Float32Array(n);
  // ground explosion — deeper crackle
  for (let k = 0; k < 4; k++) {
    mixInto(out, firecracker(rand, 0.55 + k * 0.08), Math.floor(SAMPLE_RATE * (0.02 + k * 0.03)), 0.7);
  }
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    out[i] += Math.sin(2 * Math.PI * 55 * t) * Math.exp(-t * 8) * 0.35;
    out[i] += (rand() * 2 - 1) * Math.exp(-t * 12) * 0.2;
  }
  normalize(out, 0.78);
  writeWav(path.join(OUT_DIR, "dragon-bust.wav"), out);
}

// ── monkey-trigger.wav ──────────────────────────────────────────
{
  const rand = mulberry32(0xc4e9a006);
  const n = Math.floor(SAMPLE_RATE * 0.95);
  const out = new Float32Array(n);
  mixInto(out, gongHit(rand, 196), 0, 0.5);
  mixInto(out, pentatonicSparkle(0.85, rand, 1.8), Math.floor(SAMPLE_RATE * 0.04), 1.15);
  for (let k = 0; k < 5; k++) {
    mixInto(out, firecracker(rand, 1 + k * 0.1), Math.floor(SAMPLE_RATE * (0.1 + k * 0.08)), 0.4);
  }
  mixInto(out, coinClink(rand, 1.3), Math.floor(SAMPLE_RATE * 0.35), 0.45);
  normalize(out, 0.82);
  writeWav(path.join(OUT_DIR, "monkey-trigger.wav"), out);
}

// ── gamble-flip.wav ─────────────────────────────────────────────
{
  const rand = mulberry32(0xc4e9a007);
  const n = Math.floor(SAMPLE_RATE * 0.32);
  const out = new Float32Array(n);
  // card / coin flip whoosh + metallic tick
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin(Math.PI * Math.min(1, t / 0.28));
    const noise = rand() * 2 - 1;
    lp = lp * 0.85 + noise * 0.15;
    out[i] = lp * env * 0.35;
  }
  mixInto(out, coinClink(rand, 1.4), Math.floor(SAMPLE_RATE * 0.12), 0.65);
  normalize(out, 0.75);
  writeWav(path.join(OUT_DIR, "gamble-flip.wav"), out);
}

// ── collect.wav ─────────────────────────────────────────────────
{
  const rand = mulberry32(0xc4e9a008);
  const n = Math.floor(SAMPLE_RATE * 0.55);
  const out = new Float32Array(n);
  for (let k = 0; k < 4; k++) {
    mixInto(out, coinClink(rand, 0.9 + k * 0.12), Math.floor(SAMPLE_RATE * (0.02 + k * 0.07)), 0.55);
  }
  mixInto(out, gongHit(rand, 220), Math.floor(SAMPLE_RATE * 0.05), 0.25);
  normalize(out, 0.78);
  writeWav(path.join(OUT_DIR, "collect.wav"), out);
}

console.log("Chinese New Year sounds written to", OUT_DIR);
for (const f of fs.readdirSync(OUT_DIR)) {
  const st = fs.statSync(path.join(OUT_DIR, f));
  console.log(`  ${f}  (${(st.size / 1024).toFixed(1)} KB)`);
}
