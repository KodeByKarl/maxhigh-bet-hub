import fs from "node:fs";
import crypto from "node:crypto";
const manifest = JSON.parse(fs.readFileSync("docs/gentle-sfx-manifest.json", "utf8"));
const hashes = new Set(),
  games = new Set();
let maxPeak = 0,
  totalBytes = 0;
for (const row of manifest) {
  const b = fs.readFileSync(row.file);
  totalBytes += b.length;
  if (
    b.toString("ascii", 0, 4) !== "RIFF" ||
    b.toString("ascii", 8, 12) !== "WAVE" ||
    b.readUInt32LE(24) !== 24000
  )
    throw Error("Invalid WAV " + row.file);
  const h = crypto.createHash("sha256").update(b).digest("hex");
  if (hashes.has(h)) throw Error("Duplicate " + row.file);
  hashes.add(h);
  games.add(row.game);
  let peak = 0;
  for (let i = 44; i < b.length; i += 2) peak = Math.max(peak, Math.abs(b.readInt16LE(i) / 32767));
  if (peak > 0.171 || peak < 0.001) throw Error("Invalid level " + row.file);
  maxPeak = Math.max(maxPeak, peak);
  if (Math.abs(b.readInt16LE(44)) > 5 || Math.abs(b.readInt16LE(b.length - 2)) > 5)
    throw Error("Abrupt edge " + row.file);
}
if (games.size !== 100) throw Error("Expected 100 games");
const audit = JSON.parse(fs.readFileSync("output/sfx-audit/original-audit.json", "utf8"));
for (const r of audit.rows.filter((r) => r.mode === "sample")) {
  const audio = fs.readFileSync(r.source, "utf8");
  const cp = r.source.replace("audio.ts", "animationConfig.ts");
  const config = fs.existsSync(cp) ? fs.readFileSync(cp, "utf8") : "";
  if (!(audio + config).includes("/sounds/gentle-v1/" + r.id)) throw Error("Unmapped " + r.id);
  for (const old of r.files) {
    const f = `public/sounds/gentle-v1/${r.id}/${old.split("/").at(-1)}`;
    if (!fs.existsSync(f)) throw Error("Missing " + f);
  }
}
const grouped = {};
for (const r of manifest) (grouped[r.game] ??= []).push(r.file.replace(/^public/, ""));
const html = `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Game sound previews</title><style>body{font:16px system-ui;background:#101722;color:#e8edf2;max-width:800px;margin:40px auto;padding:20px}select,button{font:inherit;padding:12px;background:#223044;color:inherit;border:1px solid #52647c;border-radius:8px}audio{display:block;margin:24px 0;width:100%}p{line-height:1.6;color:#b9c6d5}</style><h1>Game sound previews</h1><p>Select a game and sound. Start with your device volume low, then adjust to your preference.</p><select id="game"></select> <select id="sound"></select><audio id="audio" controls></audio><script>const packs=${JSON.stringify(grouped)};const g=document.getElementById('game'),s=document.getElementById('sound'),a=document.getElementById('audio');a.volume=.45;for(const id of Object.keys(packs)){const o=new Option(id,id);g.add(o)}function changeSound(){a.pause();a.src=s.value}function changeGame(){s.replaceChildren();for(const src of packs[g.value])s.add(new Option(src.split('/').pop().replace('.wav',''),src));changeSound()}g.onchange=changeGame;s.onchange=changeSound;changeGame();</script></html>`;
fs.writeFileSync("public/sound-preview.html", html);
fs.mkdirSync("output/sfx-audit", { recursive: true });
fs.writeFileSync(
  "output/sfx-audit/gentle-validation.json",
  JSON.stringify({ games: games.size, files: hashes.size, maxPeak, totalBytes }, null, 2),
);
console.log(
  `PASS: ${games.size} games, ${hashes.size} unique WAVs; maximum peak ${maxPeak.toFixed(3)}; no missing mapped sample files.`,
);
