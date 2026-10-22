/**
 * AI-generated, painted-quality art for Zeus Strike (replaces the vector set).
 *
 *   set OPENAI_API_KEY=sk-...            (PowerShell: $env:OPENAI_API_KEY="sk-...")
 *   node scripts/zeus-strike/generate-ai-art.mjs              # everything
 *   node scripts/zeus-strike/generate-ai-art.mjs wild scatter # only some
 *   node scripts/zeus-strike/generate-ai-art.mjs --backdrops  # only backdrops
 *
 * Uses the OpenAI Images API (gpt-image-1) with a TRANSPARENT background for
 * symbols, then trims + centres each to 320×320 so it fills the reel cell.
 * Output files match what the Panther theme already loads, so nothing else changes.
 * Existing files are backed up to <name>.vector-backup.* the first time.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve(import.meta.dirname, "../../public/images/symbols/zeus-strike");
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error("Set OPENAI_API_KEY first.");
  process.exit(1);
}

const STYLE =
  "Premium casino slot-machine symbol, hyper-detailed painted 3D render, glossy polished gold and white marble, " +
  "dramatic rim lighting, electric-blue lightning glow, Greek Olympus theme (Zeus Strike), single centred object, " +
  "fills the frame, no text, no border, no frame, no background, isolated on transparent background.";

const SYMBOLS = {
  10: "A golden laurel wreath with a glowing blue lightning bolt in its centre, red ribbon at the bottom.",
  J: "A Greek terracotta amphora vase with black-figure Greek meander pattern and gold trim, crackling with tiny blue sparks.",
  Q: "An ornate golden Greek lyre with glowing blue strings and sapphire jewels.",
  K: "A bronze-gold Spartan hoplite helmet with a red horsehair crest and lightning reflections.",
  A: "A white marble Ionic column with a golden capital, wrapped by a coil of blue lightning.",
  "premium-a":
    "A majestic golden eagle with wings spread wide, clutching a glowing lightning bolt, fierce eyes.",
  "premium-b":
    "The Greek Parthenon temple of Olympus on a cloud, white marble columns, lightning striking the roof, gold accents.",
  "premium-c":
    "A powerful bearded Zeus bust, white hair and beard, golden laurel crown, glowing electric-blue eyes, holding a lightning bolt.",
  scatter:
    "A round golden Olympus medallion with a stormy blue sky inside and a bright lightning bolt, with white feathered wings on both sides and a small red ribbon reading nothing.",
  wild: "A huge golden thunderbolt of Zeus crackling with electric-blue arcs, divine energy, sparks flying.",
};

const BACKDROPS = {
  backdrop:
    "Epic widescreen fantasy game background: stormy purple-blue sky over Mount Olympus, dark thunderclouds, several lightning strikes at the far left and right edges, distant glowing Greek temples on cliffs, golden god-rays, calm darker centre for a slot grid, cinematic, painterly, no text, no characters.",
  "loading-bg":
    "Epic widescreen fantasy loading screen: Mount Olympus above the clouds at golden hour, huge Greek temple, Zeus silhouette with lightning in the sky, dramatic storm, rich gold and electric blue, cinematic painterly, no text.",
};

async function gen(prompt, size, transparent) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size,
      quality: "high",
      n: 1,
      ...(transparent ? { background: "transparent", output_format: "png" } : {}),
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = await res.json();
  return Buffer.from(json.data[0].b64_json, "base64");
}

function backup(file) {
  const ext = path.extname(file);
  const bak = file.replace(ext, `.vector-backup${ext}`);
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
}

const args = process.argv.slice(2);
const onlyBackdrops = args.includes("--backdrops");
const names = args.filter((a) => !a.startsWith("--"));

if (!onlyBackdrops) {
  for (const [name, subject] of Object.entries(SYMBOLS)) {
    if (names.length && !names.includes(name)) continue;
    console.log("symbol", name);
    const raw = await gen(`${subject} ${STYLE}`, "1024x1024", true);
    const trimmed = await sharp(raw).trim().toBuffer();
    const file = path.join(OUT, `${name}.png`);
    backup(file);
    await sharp(trimmed)
      .resize(308, 308, { fit: "inside" })
      .extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(320, 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(file);
  }
}
if (!names.length || onlyBackdrops) {
  for (const [name, prompt] of Object.entries(BACKDROPS)) {
    console.log("backdrop", name);
    const raw = await gen(prompt, "1536x1024", false);
    const file = path.join(OUT, `${name}.webp`);
    backup(file);
    await sharp(raw).resize(1280, 720, { fit: "cover" }).webp({ quality: 86 }).toFile(file);
  }
}
console.log("done — bump the ?v= in src/components/maxhigh/zeus-strike/theme.ts to bust caches");
