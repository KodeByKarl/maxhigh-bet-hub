// Writes deploy/handoff/ARTIFACT.json: build digest (repo's own artifactDigest), source commit, and checksums of key evidence.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { artifactDigest } from "../../deploy/release-manager.mjs";

const sha = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const git = (...a) => execFileSync("git", ["-c", "safe.directory=*", ...a], { encoding: "utf8" }).trim();
const evidence = process.argv[2] ?? "C:/Users/Keydi/maxhigh-evidence";
const files = ["rtp-validation/validate-FINAL-MAIN.json", "rtp-validation/validate-FINAL-ANTE.json", "wild-panther-calibration-result.json", "colorgame-perf/colorgame-perf-after2-run1-Color-Game-Pro.json",
  "release-clone-100-r1/summary.json", "release-clone-100-r2/summary.json", "release-security/security-results.json", "release-browser/browser-results.json", "unit-tests-final2.txt", "test-migrations-final.txt", "test-integration-final.txt"];
const manifest = {
  generatedUtc: new Date().toISOString(),
  sourceCommit: git("rev-parse", "HEAD"), branch: git("branch", "--show-current"),
  note: "UNCOMMITTED files outside this commit were NOT built into a clean worktree; the digest below is of the local working-tree build (.output).",
  buildDigestSha256: artifactDigest("."),
  evidence: Object.fromEntries(files.filter((f) => fs.existsSync(path.join(evidence, f))).map((f) => [f, sha(path.join(evidence, f))])),
};
fs.writeFileSync("deploy/handoff/ARTIFACT.json", JSON.stringify(manifest, null, 1));
console.log(JSON.stringify({ sourceCommit: manifest.sourceCommit, buildDigestSha256: manifest.buildDigestSha256, evidenceFiles: Object.keys(manifest.evidence).length }));
