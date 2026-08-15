/**
 * Phase 4: compress large public PNGs.
 * - Photographic / large assets → WebP (same basename), update known path refs
 * - Other >500KB PNGs → resize + stronger PNG compression (keep .png)
 * Dedupes identical seabed / mult-panel / *-bg groups.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.png$/i.test(e.name)) out.push(p);
  }
  return out;
}

function hashFile(f) {
  return crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
}

function replaceInFile(file, from, to) {
  if (!fs.existsSync(file)) return false;
  const s = fs.readFileSync(file, "utf8");
  if (!s.includes(from)) return false;
  fs.writeFileSync(file, s.split(from).join(to));
  return true;
}

function walkSrc(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      walkSrc(p, out);
    } else if (/\.(ts|tsx|js|jsx|css|html|json)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const MIN = 500_000;
const allPng = walk("public")
  .map((f) => ({ f, before: fs.statSync(f).size, hash: hashFile(f) }))
  .filter((x) => x.before >= MIN)
  .sort((a, b) => b.before - a.before);

const byHash = new Map();
for (const row of allPng) {
  if (!byHash.has(row.hash)) byHash.set(row.hash, []);
  byHash.get(row.hash).push(row);
}

const results = [];
const webpRenames = []; // { fromPath, toPath, urlFrom, urlTo }

async function optimizeUnique(canonical) {
  const { f, before } = canonical;
  const meta = await sharp(f).metadata();
  const w = meta.width ?? 0;
  const isLobbyThumb =
    /[\\/]games[\\/][^\\/]+\.png$/i.test(f) && !/-bg\.png$/i.test(f);
  const isSeabed = /seabed\.png$/i.test(f);
  const isPanel = /mult-panel\.png$/i.test(f);
  const isBg = /-bg\.png$/i.test(f) || /backdrop\.png$/i.test(f);
  const isHowto = /[\\/]howto[\\/]/i.test(f);

  let maxW = 1200;
  if (isLobbyThumb) maxW = 768;
  else if (isSeabed || isPanel || isBg) maxW = 1600;
  else if (isHowto) maxW = 1400;

  const useWebp = isSeabed || isPanel || isBg || isLobbyThumb || isHowto || before > 1_500_000;

  const tmp = f + ".tmp-opt";
  let pipeline = sharp(f);
  if (w > maxW) {
    pipeline = pipeline.resize({ width: maxW, withoutEnlargement: true });
  }

  if (useWebp) {
    const outWebp = f.replace(/\.png$/i, ".webp");
    await pipeline.webp({ quality: 78, effort: 5 }).toFile(tmp);
    const after = fs.statSync(tmp).size;
    if (after < before) {
      fs.renameSync(tmp, outWebp);
      if (outWebp !== f && fs.existsSync(f)) {
        // keep original until refs updated; mark for delete after copy to dupes
      }
      return {
        kind: "webp",
        outPath: outWebp,
        after,
        deletePng: true,
      };
    }
    fs.unlinkSync(tmp);
    return { kind: "skip", outPath: f, after: before, deletePng: false };
  }

  await pipeline
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 8 })
    .toFile(tmp);
  const after = fs.statSync(tmp).size;
  if (after < before * 0.98) {
    fs.renameSync(tmp, f);
    return { kind: "png", outPath: f, after, deletePng: false };
  }
  fs.unlinkSync(tmp);
  return { kind: "skip", outPath: f, after: before, deletePng: false };
}

console.log(
  `Groups: ${byHash.size} unique among ${allPng.length} PNGs >500KB`,
);

for (const [, group] of byHash) {
  const canonical = group[0];
  try {
    const opt = await optimizeUnique(canonical);
    const buf = fs.readFileSync(opt.outPath);

    for (const row of group) {
      const target =
        opt.kind === "webp"
          ? row.f.replace(/\.png$/i, ".webp")
          : row.f;

      if (target !== opt.outPath) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, buf);
      }

      if (opt.kind === "webp") {
        const urlFrom = "/" + row.f.replace(/\\/g, "/").replace(/^public\//, "");
        const urlTo = urlFrom.replace(/\.png$/i, ".webp");
        webpRenames.push({ from: urlFrom, to: urlTo, file: row.f });
        if (fs.existsSync(row.f)) fs.unlinkSync(row.f);
      }

      results.push({
        f: row.f,
        out: target,
        before: row.before,
        after: opt.after,
        saved: row.before - opt.after,
        kind: opt.kind,
        dupeOf: row.f === canonical.f ? null : canonical.f,
      });
      console.log(
        `${opt.kind.padEnd(4)} ${(row.before / 1e6).toFixed(2)}→${(opt.after / 1e6).toFixed(2)}  ${row.f}`,
      );
    }
  } catch (err) {
    console.warn("FAIL", canonical.f, err.message);
    for (const row of group) {
      results.push({
        f: row.f,
        before: row.before,
        after: row.before,
        saved: 0,
        error: String(err.message),
      });
    }
  }
}

// Update source refs for webp renames
const srcFiles = walkSrc("src").concat(
  walkSrc("public").filter((f) => /\.(html|css|js|json)$/i.test(f)),
);
const uniqueRenames = [...new Map(webpRenames.map((r) => [r.from, r])).values()];
let refUpdates = 0;
for (const { from, to } of uniqueRenames) {
  for (const sf of srcFiles) {
    if (replaceInFile(sf, from, to)) refUpdates++;
  }
  // also bare path without leading slash variants
  const from2 = from.replace(/^\//, "");
  const to2 = to.replace(/^\//, "");
  for (const sf of srcFiles) {
    if (from2 !== from && replaceInFile(sf, from2, to2)) refUpdates++;
  }
}

const beforeTotal = results.reduce((a, r) => a + r.before, 0);
const afterTotal = results.reduce((a, r) => a + r.after, 0);
const report = {
  uniqueGroups: byHash.size,
  files: results.length,
  beforeMB: +(beforeTotal / 1e6).toFixed(2),
  afterMB: +(afterTotal / 1e6).toFixed(2),
  savedMB: +((beforeTotal - afterTotal) / 1e6).toFixed(2),
  webpRenames: uniqueRenames.length,
  refUpdates,
  results,
};
fs.writeFileSync("asset-compress-report.json", JSON.stringify(report, null, 2));
console.log(
  `\n${report.beforeMB} → ${report.afterMB} MB (saved ${report.savedMB} MB); webp=${report.webpRenames}, refHits=${refUpdates}`,
);
