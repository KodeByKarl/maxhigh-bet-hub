import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function retentionPlan(root, keep = 2, { lockOwned = false } = {}) {
  const base = fs.realpathSync(root);
  if (!Number.isInteger(keep) || keep < 2) throw Error("Retain at least two releases");
  if (!lockOwned && fs.existsSync(path.join(base, "activation.lock")))
    throw Error("Activation/review lock present; retention refused");
  const protectedPaths = new Set();
  for (const file of ["current.json", "previous.json"]) {
    const location = path.join(base, file);
    if (!fs.existsSync(location)) continue;
    const directory = path.resolve(JSON.parse(fs.readFileSync(location, "utf8")).directory);
    if (path.dirname(directory) !== base || fs.lstatSync(directory).isSymbolicLink())
      throw Error("Unsafe release pointer");
    protectedPaths.add(directory);
  }
  const candidates = [],
    temporary = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (entry.isDirectory() && /^\.incoming-[a-f0-9]{40}-[a-f0-9-]{36}$/.test(entry.name)) {
      const directory = path.join(base, entry.name);
      if (!fs.lstatSync(directory).isSymbolicLink() && !protectedPaths.has(directory)) {
        try {
          const marker = JSON.parse(
            fs.readFileSync(path.join(directory, ".maxhigh-incoming.json"), "utf8"),
          );
          let alive = true;
          try {
            process.kill(Number(marker.pid), 0);
          } catch (error) {
            if (error.code === "ESRCH") alive = false;
          }
          if (
            !alive &&
            Date.now() - Date.parse(marker.createdAt) > 7 * 86400000 &&
            entry.name.startsWith(".incoming-" + marker.sha + "-")
          )
            temporary.push(directory);
        } catch {
          /* Unknown temporary trees require manual review. */
        }
      }
    }
    if (!entry.isDirectory() || !/^[a-f0-9]{40}$/.test(entry.name)) continue;
    const directory = path.join(base, entry.name);
    if (fs.lstatSync(directory).isSymbolicLink() || fs.existsSync(path.join(directory, ".git")))
      continue;
    try {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(directory, "release-validation.json"), "utf8"),
      );
      if (
        manifest.sha === entry.name &&
        manifest.artifactFormat === "portable-v1" &&
        Number.isFinite(Date.parse(manifest.validatedAt))
      )
        candidates.push({ directory, validatedAt: manifest.validatedAt });
    } catch {
      /* Incomplete/unrecognized artifacts require manual review. */
    }
  }
  candidates.sort((a, b) => Date.parse(b.validatedAt) - Date.parse(a.validatedAt));
  for (const candidate of candidates.slice(0, keep)) protectedPaths.add(candidate.directory);
  return {
    root: base,
    protected: [...protectedPaths],
    remove: candidates
      .filter((item) => !protectedPaths.has(item.directory))
      .map((item) => item.directory),
    removeTemporary: temporary,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "releases");
  const plan = retentionPlan(root);
  if (process.argv.includes("--apply")) {
    if (process.env.CONFIRM_RELEASE_PRUNE !== plan.root)
      throw Error("Explicit root confirmation required");
    const lock = path.join(plan.root, "activation.lock"),
      handle = fs.openSync(lock, "wx");
    try {
      const currentPlan = retentionPlan(plan.root, 2, { lockOwned: true });
      // The same lock excludes activation. Every final absolute deletion target
      // must be one direct, non-symlink release child of the inspected root.
      for (const directory of [...currentPlan.remove, ...currentPlan.removeTemporary]) {
        if (
          path.dirname(fs.realpathSync(directory)) !== plan.root ||
          fs.lstatSync(directory).isSymbolicLink()
        )
          throw Error("Unsafe prune target");
        fs.rmSync(directory, { recursive: true });
      }
    } finally {
      fs.closeSync(handle);
      fs.unlinkSync(lock);
    }
  }
  console.log(JSON.stringify({ ...plan, applied: process.argv.includes("--apply") }, null, 2));
}
