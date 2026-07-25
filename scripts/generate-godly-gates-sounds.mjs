/**
 * Generate original Egypt-temple SFX for Godly Gates (commercial-safe procedural WAV).
 * Usage: node scripts/generate-godly-gates-sounds.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/sounds/godly-gates");
const SR = 44100;

fs.mkdirSync(OUT, { recursive: true });

function clamp(x, lo = -1, hi = 1) {
  return Math.max(lo, Math.min(hi, x));
}

function writeWav(filePath, samples, sampleRate = SR) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE((clamp(samples[i]) * 32767) | 0, 44 + i * 2);
  }
  fs.writeFileSync(filePath, buf);
}

function envADSR(t, dur, a = 0.01, d = 0.08, s = 0.55, r = 0.2) {
  const sustainEnd = Math.max(a + d, dur - r);
  if (t < 0) return 0;
  if (t < a) return t / Math.max(a, 1e-6);
  if (t < a + d) return 1 - (1 - s) * ((t - a) / Math.max(d, 1e-6));
  if (t < sustainEnd) return s;
  if (t < dur) return s * (1 - (t - sustainEnd) / Math.max(dur - sustainEnd, 1e-6));
  return 0;
}

function sine(f, t) {
  return Math.sin(2 * Math.PI * f * t);
}

function noise() {
  return Math.random() * 2 - 1;
}

function render(seconds, fn) {
  const n = Math.floor(SR * seconds);
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) samples[i] = fn(i / SR, i);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak > 0.001) {
    const g = 0.88 / peak;
    for (let i = 0; i < n; i++) samples[i] *= g;
  }
  return samples;
}

function ambientLoop() {
  let lp = 0;
  return render(6, (t) => {
    const drone =
      0.24 * sine(55, t) + 0.15 * sine(82.5, t) + 0.1 * sine(110.2, t);
    lp = lp * 0.97 + noise() * 0.03;
    const wind = lp * 0.55 * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.27)));
    const pluckTimes = [0.35, 1.55, 2.85, 4.1, 5.25];
    const scale = [0, 3, 5, 7, 10];
    let harp = 0;
    for (let p = 0; p < pluckTimes.length; p++) {
      const local = t - pluckTimes[p];
      if (local < 0 || local > 1.4) continue;
      const f = 196 * Math.pow(2, scale[p] / 12);
      harp += 0.08 * sine(f, local) * Math.exp(-local * 2.4);
      harp += 0.03 * sine(f * 2.01, local) * Math.exp(-local * 3.2);
    }
    return drone + wind + harp;
  });
}

function reelSpinLoop() {
  let lp = 0;
  return render(1.25, (t) => {
    lp = lp * 0.86 + noise() * 0.14;
    const pulse = 0.45 + 0.55 * Math.abs(sine(14, t));
    const sand = lp * 0.7 * pulse;
    const tick = Math.sin(2 * Math.PI * 9 * t) > 0.97 ? noise() * 0.5 : 0;
    return sand + tick * 0.35 + 0.06 * sine(85, t);
  });
}

function reelStop() {
  return render(0.35, (t) => {
    const body = 0.7 * sine(95 * Math.exp(-t * 8), t) * envADSR(t, 0.35, 0.002, 0.05, 0.2, 0.25);
    const click = 0.35 * noise() * Math.exp(-t * 55);
    const wood = 0.25 * sine(180, t) * Math.exp(-t * 20);
    return body + click + wood;
  });
}

function cascadeTick() {
  return render(0.22, (t) => {
    return (
      0.45 * sine(740, t) * Math.exp(-t * 18) +
      0.35 * sine(1110, t) * Math.exp(-t * 22) +
      0.2 * sine(1480, t) * Math.exp(-t * 28)
    );
  });
}

function winFanfare(kind) {
  const dur = kind === "big" ? 1.8 : kind === "medium" ? 1.1 : 0.55;
  const notes =
    kind === "big"
      ? [196, 247, 294, 370, 440, 554]
      : kind === "medium"
        ? [220, 277, 330, 415]
        : [262, 330, 392];
  return render(dur, (t) => {
    let s = 0;
    for (let i = 0; i < notes.length; i++) {
      const start = i * (dur / (notes.length + 1));
      if (t < start) continue;
      const local = t - start;
      const env = envADSR(local, dur - start, 0.01, 0.08, 0.45, 0.25);
      s += 0.22 * sine(notes[i], local) * env;
      s += 0.08 * sine(notes[i] * 2, local) * env;
    }
    if (kind === "big") {
      s += 0.12 * sine(98, t) * envADSR(t, dur, 0.05, 0.2, 0.5, 0.4);
      s += 0.08 * noise() * Math.exp(-t * 4);
    }
    return s;
  });
}

function scatterTrigger() {
  return render(1.2, (t) => {
    const swell = envADSR(t, 1.2, 0.08, 0.2, 0.7, 0.4);
    const pad =
      0.25 * sine(165, t) * swell +
      0.18 * sine(247, t) * swell +
      0.12 * sine(330, t) * swell;
    const bell =
      0.3 * sine(660, t) * Math.exp(-t * 3) +
      0.2 * sine(990, t) * Math.exp(-t * 4) +
      0.12 * sine(1320, t) * Math.exp(-t * 5);
    return pad + bell;
  });
}

function freespinIntro() {
  return render(2.2, (t) => {
    const horn =
      0.35 * sine(147, t) * envADSR(t, 2.2, 0.05, 0.3, 0.65, 0.5) +
      0.22 * sine(185, t) * envADSR(t, 2.2, 0.08, 0.3, 0.55, 0.5) +
      0.12 * sine(294, t) * envADSR(Math.max(0, t - 0.35), 1.8, 0.05, 0.2, 0.4, 0.5);
    const shimmer =
      0.08 * sine(880, t) * Math.max(0, Math.sin(t * 2.2)) * envADSR(t, 2.2, 0.2, 0.3, 0.4, 0.6);
    const hit = t < 0.12 ? 0.25 * noise() * Math.exp(-t * 40) : 0;
    return horn + shimmer + hit;
  });
}

const FILES = {
  "ambient-loop.wav": ambientLoop,
  "reel-spin-loop.wav": reelSpinLoop,
  "reel-stop.wav": reelStop,
  "cascade-tick.wav": cascadeTick,
  "win-small.wav": () => winFanfare("small"),
  "win-medium.wav": () => winFanfare("medium"),
  "win-big.wav": () => winFanfare("big"),
  "scatter-trigger.wav": scatterTrigger,
  "freespin-intro.wav": freespinIntro,
};

for (const [name, fn] of Object.entries(FILES)) {
  const samples = fn();
  const outPath = path.join(OUT, name);
  writeWav(outPath, samples);
  console.log("wrote", path.relative(process.cwd(), outPath));
}

console.log("Done — Godly Gates temple SFX ready.");
