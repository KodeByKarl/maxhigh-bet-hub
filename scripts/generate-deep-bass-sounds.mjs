/**
 * Deep Bass — procedural underwater / arcade SFX.
 * Run: node scripts/generate-deep-bass-sounds.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "sounds", "deep-bass");
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

function fadeEdges(samples, sec = 0.015) {
  const fade = Math.floor(SAMPLE_RATE * sec);
  const n = samples.length;
  for (let i = 0; i < fade && i < n; i++) {
    const w = i / fade;
    samples[i] *= w;
    samples[n - 1 - i] *= w;
  }
}

function shotFire(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.14);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 28);
    const noise = (rand() * 2 - 1) * Math.exp(-t * 55);
    const thump = Math.sin(2 * Math.PI * (90 + t * 40) * t) * Math.exp(-t * 22);
    out[i] = (noise * 0.55 + thump * 0.7) * env;
  }
  fadeEdges(out);
  return normalize(out, 0.82);
}

function splash(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.28);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 9);
    const bubbly =
      (rand() * 2 - 1) * Math.exp(-t * 14) +
      Math.sin(2 * Math.PI * (420 + rand() * 180) * t) * Math.exp(-t * 12) * 0.35;
    out[i] = bubbly * env;
  }
  fadeEdges(out, 0.02);
  return normalize(out, 0.75);
}

function hit(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.12);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 40);
    out[i] =
      (Math.sin(2 * Math.PI * 660 * t) * 0.5 +
        Math.sin(2 * Math.PI * 990 * t) * 0.3 +
        (rand() * 2 - 1) * 0.25 * Math.exp(-t * 80)) *
      env;
  }
  fadeEdges(out);
  return normalize(out, 0.8);
}

function fishDeathSmall(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.22);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 10);
    const chirp = Math.sin(2 * Math.PI * (520 - t * 180) * t);
    out[i] = (chirp * 0.55 + (rand() * 2 - 1) * 0.15 * Math.exp(-t * 20)) * env;
  }
  fadeEdges(out);
  return normalize(out, 0.78);
}

function fishDeathLarge(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.38);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 6);
    out[i] =
      (Math.sin(2 * Math.PI * (180 - t * 60) * t) * 0.6 +
        Math.sin(2 * Math.PI * (320 - t * 40) * t) * 0.35 +
        (rand() * 2 - 1) * 0.2 * Math.exp(-t * 10)) *
      env;
  }
  fadeEdges(out, 0.025);
  return normalize(out, 0.85);
}

function bossRoar(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.85);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t * 4) * Math.exp(-Math.max(0, t - 0.35) * 3.2);
    const growl =
      Math.sin(2 * Math.PI * (70 + Math.sin(t * 8) * 8) * t) * 0.7 +
      Math.sin(2 * Math.PI * 110 * t) * 0.35 +
      (rand() * 2 - 1) * 0.22;
    out[i] = growl * env;
  }
  fadeEdges(out, 0.04);
  return normalize(out, 0.9);
}

function bossDeath(rand) {
  const len = Math.floor(SAMPLE_RATE * 1.1);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 2.4);
    out[i] =
      (Math.sin(2 * Math.PI * (90 - t * 40) * t) * 0.65 +
        Math.sin(2 * Math.PI * (160 - t * 50) * t) * 0.4 +
        (rand() * 2 - 1) * 0.28 * Math.exp(-t * 4)) *
      env;
  }
  fadeEdges(out, 0.05);
  return normalize(out, 0.92);
}

function coinPayout(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.45);
  const out = new Float32Array(len);
  const notes = [880, 1108, 1320, 1760];
  for (let n = 0; n < notes.length; n++) {
    const start = Math.floor(SAMPLE_RATE * (0.04 + n * 0.07));
    for (let i = 0; i < SAMPLE_RATE * 0.12; i++) {
      const t = i / SAMPLE_RATE;
      const j = start + i;
      if (j >= len) break;
      out[j] +=
        Math.sin(2 * Math.PI * notes[n] * t) *
        Math.exp(-t * 18) *
        (0.45 + rand() * 0.1);
    }
  }
  fadeEdges(out);
  return normalize(out, 0.8);
}

function crateDrop(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.35);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 8);
    const sparkle = Math.sin(2 * Math.PI * (740 + t * 400) * t);
    const thud = Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t * 20);
    out[i] = (sparkle * 0.45 + thud * 0.55 + (rand() * 2 - 1) * 0.1) * env;
  }
  fadeEdges(out);
  return normalize(out, 0.8);
}

function weaponSwitch(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.16);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 22);
    const click = Math.sin(2 * Math.PI * (1400 - t * 900) * t);
    const metal = (rand() * 2 - 1) * Math.exp(-t * 60);
    out[i] = (click * 0.55 + metal * 0.35) * env;
  }
  fadeEdges(out);
  return normalize(out, 0.7);
}

function freeze(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.55);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t * 8) * Math.exp(-Math.max(0, t - 0.12) * 5);
    const shimmer =
      Math.sin(2 * Math.PI * (980 + Math.sin(t * 30) * 120) * t) * 0.45 +
      Math.sin(2 * Math.PI * 1560 * t) * 0.25 +
      (rand() * 2 - 1) * 0.12 * Math.exp(-t * 8);
    out[i] = shimmer * env;
  }
  fadeEdges(out, 0.03);
  return normalize(out, 0.78);
}

function netBomb(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.42);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 7);
    const whoosh = (rand() * 2 - 1) * Math.exp(-t * 12);
    const boom = Math.sin(2 * Math.PI * (110 - t * 40) * t) * Math.exp(-t * 9);
    out[i] = (whoosh * 0.5 + boom * 0.65) * env;
  }
  fadeEdges(out, 0.02);
  return normalize(out, 0.85);
}

function uiClick(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.06);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    out[i] =
      Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 70) * 0.7 +
      (rand() * 2 - 1) * Math.exp(-t * 90) * 0.15;
  }
  fadeEdges(out, 0.004);
  return normalize(out, 0.65);
}

function superHit(rand) {
  const len = Math.floor(SAMPLE_RATE * 0.2);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 28);
    out[i] =
      (Math.sin(2 * Math.PI * 520 * t) * 0.4 +
        Math.sin(2 * Math.PI * 780 * t) * 0.35 +
        Math.sin(2 * Math.PI * 1170 * t) * 0.25 +
        (rand() * 2 - 1) * 0.2 * Math.exp(-t * 50)) *
      env;
  }
  fadeEdges(out);
  return normalize(out, 0.84);
}

const FILES = {
  "shot-fire.wav": shotFire,
  "splash.wav": splash,
  "hit.wav": hit,
  "fish-death-small.wav": fishDeathSmall,
  "fish-death-large.wav": fishDeathLarge,
  "boss-roar.wav": bossRoar,
  "boss-death.wav": bossDeath,
  "coin-payout.wav": coinPayout,
  "crate-drop.wav": crateDrop,
  "weapon-switch.wav": weaponSwitch,
  "freeze.wav": freeze,
  "net-bomb.wav": netBomb,
  "ui-click.wav": uiClick,
  "super-hit.wav": superHit,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
let seed = 0xdeb055;
for (const [name, fn] of Object.entries(FILES)) {
  const rand = mulberry32(seed++);
  const samples = fn(rand);
  const dest = path.join(OUT_DIR, name);
  writeWav(dest, samples);
  console.log("wrote", dest);
}
console.log("Deep Bass sounds ready:", Object.keys(FILES).length);
