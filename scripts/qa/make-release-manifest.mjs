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
const sha = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const changed = git("diff", "--name-status", `${base}..HEAD`).split("\n").filter(Boolean).map((l) => { const [s, ...p] = l.split("\t"); return { status: s, path: p.join("\t") }; });
const evidence = {};
for (const f of walk(evidenceDir)) if (/\.(json|txt|log|md)$/.test(f) && fs.statSync(f).size < 20_000_000) evidence[path.relative(evidenceDir, f).replaceAll("\\", "/")] = sha(f);
const manifest = {
  generatedUtc: new Date().toISOString(),
  status: "PREPARED - NOT DEPLOYED - DEPLOYMENT ON HOLD",
  repository: "maxhigh-bet-hub", branch: git("rev-parse", "--abbrev-ref", "HEAD"), commit: git("rev-parse", "HEAD"), baseDeployedRelease: git("rev-parse", base),
  commits: git("log", "--format=%H %s", `${base}..HEAD`).split("\n"),
  changedFiles: { total: changed.length, byStatus: changed.reduce((a, c) => ((a[c.status] = (a[c.status] ?? 0) + 1), a), {}), list: changed },
  buildDigestSha256: artifactDigest("."),
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
