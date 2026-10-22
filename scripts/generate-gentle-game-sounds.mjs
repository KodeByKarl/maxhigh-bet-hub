import fs from "node:fs";
import crypto from "node:crypto";
const audit = JSON.parse(fs.readFileSync("output/sfx-audit/original-audit.json", "utf8"));
const rate = 24000,
  base = "public/sounds/gentle-v1";
const slots = [
  "startSpinLoop",
  "playUiClick",
  "playReelStop",
  "playCascadeTick",
  "playWin",
  "playScatterTrigger",
  "playFreespinIntro",
  "endFreespins",
];
const scales = [
  [0, 2, 4, 7, 9],
  [0, 3, 5, 7, 10],
  [0, 2, 5, 7, 9],
  [0, 4, 5, 7, 11],
  [0, 2, 4, 6, 9],
];
const fingerprint = (s) => crypto.createHash("sha256").update(s).digest();
function render(id, event) {
  const h = fingerprint(id),
    e = fingerprint(event),
    u = fingerprint(id + "|" + event),
    scale = scales[h[0] % scales.length];
  const ambient = event === "ambient";
  const quick = /chip|tick|click|shot|hit|flip|deal|switch|ReelStop|Cascade/i.test(event);
  const win = /win|cashout|summit|scatter|freespin|climb|natural|bossDeath/i.test(event);
  const lose = /lose|bust|fold|qualify/i.test(event);
  const count = ambient ? 5 : quick ? 1 : win ? 4 : lose ? 2 : 3;
  const gap = ambient ? 1.45 : 0.1 + (h[1] % 9) * 0.012;
  const decay = quick ? 0.08 + (h[2] % 6) * 0.008 : ambient ? 0.7 : 0.25 + (h[2] % 10) * 0.015;
  const duration = ambient ? 8 : (count - 1) * gap + decay + 0.12;
  const out = new Float64Array(Math.ceil(duration * rate));
  const root =
    220 *
    Math.pow(2, ((h[3] % 13) + (h[4] / 255) * 0.8 + (e.readUInt32LE(0) / 4294967296) * 1.6) / 12);
  for (let n = 0; n < count; n++) {
    const degree = lose ? Math.max(0, 3 - n) : (h[(n + 5) % 32] + e[n]) % scale.length;
    const f = (1 + (u[0] / 255) * 0.05) * root * Math.pow(2, (scale[degree] + (e[9] % 7)) / 12);
    const start = Math.floor((0.015 + n * gap) * rate),
      len = Math.floor((decay + 0.08) * rate);
    for (let i = 0; i < len && start + i < out.length; i++) {
      const t = i / rate,
        attack = quick ? 0.012 : 0.025;
      const env =
        (1 - Math.exp(-t / attack)) *
        Math.exp(-t / (decay / 4)) *
        Math.min(1, (len - i) / (rate * 0.03));
      // Low, harmonic sine partials only: no noise, square/saw waves or sustained oscillators.
      const partial = 0.06 + (h[10] % 15) / 100;
      out[start + i] +=
        env *
        (Math.sin(2 * Math.PI * f * t) +
          partial * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 14));
    }
  }
  let max = 0;
  for (const x of out) max = Math.max(max, Math.abs(x));
  const peak = ambient ? 0.065 : quick ? 0.11 : 0.17;
  const bytes = Buffer.alloc(44 + out.length * 2);
  bytes.write("RIFF");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(out.length * 2, 40);
  for (let i = 0; i < out.length; i++)
    bytes.writeInt16LE(Math.round((out[i] / Math.max(max, 1e-9)) * peak * 32767), 44 + i * 2);
  return { bytes, peak, duration };
}
const manifest = [];
for (const row of audit.rows) {
  const dir = `${base}/${row.id}`;
  fs.mkdirSync(dir, { recursive: true });
  let names;
  if (row.mode === "sample") names = row.files.map((f) => f.split("/").at(-1).replace(".wav", ""));
  else names = row.bgm ? [...slots, "ambient"] : row.events;
  for (const name of names) {
    const r = render(row.id, name);
    const file = `${dir}/${name}.wav`;
    fs.writeFileSync(file, r.bytes);
    manifest.push({
      game: row.id,
      event: name,
      file,
      peak: r.peak,
      duration: r.duration,
      sha256: crypto.createHash("sha256").update(r.bytes).digest("hex"),
    });
  }
}
if (new Set(manifest.map((m) => m.sha256)).size !== manifest.length)
  throw Error("Duplicate generated audio");
fs.writeFileSync("docs/gentle-sfx-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `${audit.rows.length} games; ${manifest.length} unique WAV files generated. No clipping; peak <= 0.17.`,
);
