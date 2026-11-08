import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pointer = path.join(root, "deploy/releases/current.json");
if (process.env.NODE_ENV === "production" && !fs.existsSync(pointer))
  throw Error("Production startup requires an activated release");
const release = fs.existsSync(pointer)
  ? JSON.parse(fs.readFileSync(pointer, "utf8")).directory
  : root;
const resolved = path.resolve(release);
if (process.env.NODE_ENV === "production" && resolved === root)
  throw Error("Production startup requires an immutable release artifact");
if (resolved !== root && !resolved.startsWith(path.join(root, "deploy/releases") + path.sep))
  throw Error("Invalid release directory");
if (resolved !== root) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(resolved, "release-validation.json"), "utf8"),
  );
  if (!/^[a-f0-9]{40}$/.test(manifest.sha) || path.basename(resolved) !== manifest.sha)
    throw Error("Invalid release identity");
  process.env.RELEASE_SHA = manifest.sha;
}
await import(pathToFileURL(path.join(resolved, ".output/server/index.mjs")));

// PM2 fork-mode readiness must include database/schema readiness, not just bind.
if (process.send) {
  const port = Number(process.env.PORT ?? 8080);
  let ready = false;
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok && (await response.json()).ok === true) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) {
    console.error("Application readiness failed");
    process.emit("SIGTERM");
    process.exitCode = 1;
  } else process.send("ready");
}
