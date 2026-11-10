// Writes RELEASE_MANIFEST.json for a CLEAN release worktree: exact commit, branch, the full changed-file list versus the deployed
// release, the build digest (the repository's own artifactDigest over .output) and SHA-256 of evidence files. Refuses a dirty tree.
//   cd <release worktree> && node <path>/make-release-manifest.mjs <outFile> <evidenceDir> [baseCommit=2294d79]
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { artifactDigest } from "./../../deploy/release-manager.mjs";

const [outFile, evidenceDir, base = "2294d79", extraFile] = process.argv.slice(2);
if (!outFile || !evidenceDir) throw new Error("usage: make-release-manifest.mjs <outFile> <evidenceDir> [baseCommit]");
const git = (...a) => execFileSync("git", ["-c", "safe.directory=*", "-c", "core.autocrlf=false", ...a], { encoding: "utf8" }).trim();
const dirty = git("status", "--porcelain");
if (dirty) throw new Error("release worktree is not clean:\n" + dirty.slice(0, 400));
// Two files vary between builds of the SAME commit: nitro.json (build timestamp) and server/index.mjs (its embedded static-asset index:
// ordering and file mtimes). The stable digest covers every other file and IS identical across independent builds (verified).
const VOLATILE = ["nitro.json", "server/index.mjs"];
function stableDigest(dir) {
  const h = createHash("sha256");
  const visit = (folder, rel) => {
    for (const e of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(folder, e.name), r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) visit(p, r);
      else if (!VOLATILE.includes(r)) { h.update(r); h.update("\0"); h.update(fs.readFileSync(p)); }
    }
  };
  visit(path.join(dir, ".output"), "");
  return h.digest("hex");
}
const sha = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const changed = git("diff", "--name-status", `${base}..HEAD`).split("\n").filter(Boolean).map((l) => { const [s, ...p] = l.split("\t"); return { status: s, path: p.join("\t") }; });
const evidence = {};
for (const f of walk(evidenceDir)) if (/\.(json|txt|log|md)$/.test(f) && fs.statSync(f).size < 20_000_000) evidence[path.relative(evidenceDir, f).replaceAll("\\", "/")] = sha(f);
const manifest = {
  generatedUtc: new Date().toISOString(),
  status: "PREPARED - NOT DEPLOYED - DEPLOYMENT BLOCKED AT THE ARTIFACT-PROVENANCE GATE (no Linux CI artifact can be produced; see DEPLOYMENT_AND_ROLLBACK.md)",
  repository: "maxhigh-bet-hub", branch: git("rev-parse", "--abbrev-ref", "HEAD"), commit: git("rev-parse", "HEAD"), baseDeployedRelease: git("rev-parse", base),
  commits: git("log", "--format=%H %s", `${base}..HEAD`).split("\n"),
  changedFiles: { total: changed.length, byStatus: changed.reduce((a, c) => ((a[c.status] = (a[c.status] ?? 0) + 1), a), {}), list: changed },
  buildDigestSha256: artifactDigest("."),
  stableContentDigestSha256: stableDigest("."),
  stableContentDigestNote: "SHA-256 over every .output file except nitro.json and server/index.mjs. Identical across independent builds of this commit (verified); use it to verify an artifact. The build is functionally reproducible, NOT bit-for-bit: buildDigestSha256 differs per build because of the two excluded files (timestamp; asset-index ordering/mtimes).",
  volatileFileSha256: Object.fromEntries(VOLATILE.map((v) => [v, sha(path.join(".output", v))])),
  buildDigestNote: "Computed with deploy/release-manager.mjs artifactDigest() over .output of a build from this exact clean commit (LF-normalized worktree).",
  migrationsPending: ["0004_seed_default_risk_controls", "0005_account_classes_and_entitlements"],
  migrationChecksums: Object.fromEntries(fs.readdirSync("drizzle").filter((f) => /^000[45]_.*\.sql$/.test(f)).map((f) => [f, sha(path.join("drizzle", f))])),
  restrictionsPolicy: "shipped INACTIVE (src/server/policy/access-policy.config.ts: enforcement off, no locked games, no grant keys)",
  evidenceSha256: evidence,
};
// Human-authored sections (QA results, known issues, prerequisites, procedures) are merged in; machine-derived fields above always win.
const extra = extraFile ? JSON.parse(fs.readFileSync(extraFile, "utf8")) : {};
for (const [k, v] of Object.entries(extra)) if (!(k in manifest)) manifest[k] = v;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(manifest, null, 1));
console.log(JSON.stringify({ commit: manifest.commit.slice(0, 7), branch: manifest.branch, changedFiles: changed.length, buildDigest: manifest.buildDigestSha256, evidenceFiles: Object.keys(evidence).length }));
